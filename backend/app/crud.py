import os
import requests
from datetime import datetime, date, timedelta
import pytz
import logging
import psycopg2
import json
from dotenv import load_dotenv
from decimal import Decimal
import uuid
import time


# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
THINGSBOARD_HOST = os.getenv("THINGSBOARD_HOST")
THINGSBOARD_DATA_KEYS = os.getenv("THINGSBOARD_DATA_KEY").split(',')
THINGSBOARD_USERNAME = os.getenv("THINGSBOARD_USERNAME")
THINGSBOARD_PASSWORD = os.getenv("THINGSBOARD_PASSWORD")
DEVICE_IDS = os.getenv("DEVICE_IDS").split(',')

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", 5432)
DB_NAME = os.getenv("DB_NAME", "ael")  # fallback to 'ael' if not in .env

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Define common JSON directory (New GB folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GB_DIR = os.path.join(BASE_DIR, "app","GB")  # ✅ New folder path
os.makedirs(GB_DIR, exist_ok=True)


# Malaysia timezone (UTC +8)
MALAYSIA_TZ = pytz.timezone('Asia/Kuala_Lumpur')

# Authenticate with ThingsBoard
def authenticate():
    logger.info("Authenticating with ThingsBoard...")
    url = f"{THINGSBOARD_HOST}/api/auth/login"
    credentials = {"username": THINGSBOARD_USERNAME, "password": THINGSBOARD_PASSWORD}
    headers = {"Content-Type": "application/json"}

    response = requests.post(url, json=credentials, headers=headers)
    if response.status_code != 200:
        logger.error(f"Authentication failed. HTTP {response.status_code}: {response.text}")
        raise ValueError("Authentication failed.")

    token = response.json().get("token")
    if not token:
        raise ValueError("Authentication failed: Token not found.")

    logger.info(f"Authentication successful. Token: {token[:10]}... (truncated for security)")
    return token


def update_combined_data():
    try:
        logger.info("Fetching all device data for combined_data.json...")
        all_data = fetch_all_devices_data()

        if not all_data:
            logger.warning("No data fetched. Creating an empty JSON file.")

        output_file = os.path.join(GB_DIR, "combined_data.json")
        with open(output_file, "w") as json_file:
            json.dump(all_data or {}, json_file, indent=4)

        logger.info(f"Successfully updated combined_data.json at {output_file}")

    except Exception as e:
        logger.error(f"Error updating combined data: {e}", exc_info=True)


# Function to handle column exclusions
def exclude_columns(table_name, data):
    exclusions = {
        "hazardous_waste_entries": ["id", "createdAt", "updatedAt", "classificationNumber", "collectorName"],
        "non_hazardous_waste_entries": ["id","createdAt", "updatedAt"],
        "ocr_fuel_data": ["id","createdat"],
        "scrap_entries": ["id","createdAt", "updatedAt"],
        "water_discharge": ["id","created_at"]
    }
    excluded_columns = exclusions.get(table_name, ["id"])
    return [
        {key: value for key, value in row.items() if key not in excluded_columns}
        for row in data
    ]

# Save PostgreSQL tables to individual JSON files using DATABASE_URL
def save_tables_to_json():
    from dotenv import load_dotenv
    load_dotenv()

    import os
    import psycopg2

    TABLES_TO_FETCH = [
        "chimney_emissions",
        "hazardous_waste_entries",
        "non_hazardous_waste_entries",
        "ocr_air_tb",
        "ocr_fuel_data",
        "scrap_entries",
        "water_discharge"
    ]

    conn = None
    cursor = None

    try:
        DATABASE_URL = os.getenv("DATABASE_URL")
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL not set in environment variables.")

        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        for table in TABLES_TO_FETCH:
            logger.info(f"Fetching data for table: {table}")
            cursor.execute(f"SELECT * FROM {table};")
            rows = cursor.fetchall()

            if not rows:
                logger.warning(f"No data found in table: {table}")
                continue

            colnames = [desc[0] for desc in cursor.description]
            table_data = [dict(zip(colnames, row)) for row in rows]

            json_file_path = os.path.join(GB_DIR, f"{table}.json")
            with open(json_file_path, "w") as json_file:
                json.dump(table_data, json_file, indent=4, default=str)

            logger.info(f"Data from table '{table}' has been saved to {json_file_path}")

    except Exception as e:
        logger.error(f"Error saving tables to JSON: {e}", exc_info=True)

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Convert UNIX timestamp to Malaysia date
def convert_unix_to_malaysia_date(unix_timestamp):
    # Use pytz for timezone-aware datetime
    dt_utc = datetime.utcfromtimestamp(unix_timestamp / 1000).replace(tzinfo=pytz.utc)
    dt_malaysia = dt_utc.astimezone(MALAYSIA_TZ)
    return dt_malaysia.date()


# Fetch telemetry data for a device and a period
def fetch_telemetry_data(device_id, token, start_ts, end_ts, key):
    url = f"{THINGSBOARD_HOST}/api/plugins/telemetry/DEVICE/{device_id}/values/timeseries"
    params = {"keys": key, "startTs": start_ts, "endTs": end_ts}
    headers = {"X-Authorization": f"Bearer {token}"}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()

    if response.status_code != 200:
        logger.error(f"Failed to fetch telemetry for {device_id}. HTTP {response.status_code}: {response.text}")
        return []
    
    data = response.json()
    logger.info(f"Fetched telemetry data: {json.dumps(data, indent=2)}")

    if not data or key not in data:
        return []

    return [(entry['ts'], entry['value']) for entry in data[key] if 'ts' in entry and 'value' in entry]

# Fetch and format telemetry data
def fetch_device_data(device_id, token, key, start_ts, end_ts):
    telemetry_data = fetch_telemetry_data(device_id, token, start_ts, end_ts, key)
    formatted_data = [
        {"date": convert_unix_to_malaysia_date(ts).strftime("%Y-%m-%d"), "value": value}
        for ts, value in telemetry_data
    ]
    return formatted_data

# Fetch all devices' data
def fetch_all_devices_data():
    try:
        token = authenticate()
        current_ts = int(datetime.now().timestamp() * 1000)
        start_ts = current_ts - (365 * 24 * 60 * 60 * 1000)  # Fetch data for the past year

        combined_results = {}
        for i, device_id in enumerate(DEVICE_IDS):
            key = THINGSBOARD_DATA_KEYS[i]
            block_name = f"Block {chr(65 + i)}"
            logger.info(f"Fetching data for {block_name}...")
            telemetry_data = fetch_device_data(device_id, token, key, start_ts, current_ts)
            combined_results[block_name] = sorted(telemetry_data, key=lambda x: x['date'])

        logger.info("All device data fetched and combined successfully.")
        return combined_results

    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        return {}

# Combine specified JSON files into one
def combine_json_files(output_file, *input_files):
    combined_data = {}
    try:
        # Define input files and their corresponding keys
        input_files = {
            "hazardous_waste": "hazardous_waste_entries.json",
            "non_hazardous_waste": "non_hazardous_waste_entries.json",
            "scrap_waste": "scrap_entries.json"
        }

        # Read data from each file and assign it to the respective key
        for key, file_name in input_files.items():
            file_path = os.path.join(GB_DIR, file_name)
            if os.path.exists(file_path):
                with open(file_path, "r") as file:
                    combined_data[key] = json.load(file)
            else:
                logger.warning(f"File not found: {file_name}")
                combined_data[key] = []

        # Save the combined data to a new JSON file
        output_path = os.path.join(GB_DIR, output_file)
        with open(output_path, "w") as output:
            json.dump(combined_data, output, indent=4)

        logger.info(f"Combined waste data saved to {output_path}")
    except Exception as e:
        logger.error(f"Error combining waste JSON files: {e}")
# Combine hazardous, non-hazardous, and scrap waste data into a single JSON file
def combine_waste_json(output_file):
    """
    Combine hazardous_waste_entries.json, non_hazardous_waste_entries.json, and scrap_entries.json
    into a single JSON file with the specified format.
    """
    combined_data = {}
    try:
        # Define input files and their corresponding keys
        input_files = {
            "hazardous_waste": "hazardous_waste_entries.json",
            "non_hazardous_waste": "non_hazardous_waste_entries.json",
            "scrap_waste": "scrap_entries.json"
        }

        # Read data from each file and assign it to the respective key
        for key, file_name in input_files.items():
            file_path = os.path.join(GB_DIR, file_name)
            if os.path.exists(file_path):
                with open(file_path, "r") as file:
                    combined_data[key] = json.load(file)
            else:
                logger.warning(f"File not found: {file_name}")
                combined_data[key] = []

        # Save the combined data to a new JSON file
        output_path = os.path.join(GB_DIR, output_file)
        with open(output_path, "w") as output:
            json.dump(combined_data, output, indent=4)

        logger.info(f"Combined waste data saved to {output_path}")
    except Exception as e:
        logger.error(f"Error combining waste JSON files: {e}")



if __name__ == "__main__":
    try:
        while True:  # Infinite loop
            logger.info("Starting data update process...")

            # Fetch all devices' data
            all_data = fetch_all_devices_data()

            # Save combined data to JSON file
            with open(os.path.join(GB_DIR, "combined_data.json"), "w") as json_file:
                json.dump(all_data, json_file, indent=4)
            logger.info("All combined telemetry data has been saved to combined_data.json.")

            # Save tables from PostgreSQL to JSON files
            save_tables_to_json()

            # Combine waste data
            combine_waste_json("waste_combined.json")

            # Combine OCR-related data
            combine_json_files(
                "ocr_combined.json",
                "ocr_air_tb.json",
                "ocr_fuel_data.json"
            )

            logger.info("Data update process completed. Waiting for the next cycle...")
            
            # Wait for 12 hours (12 * 60 * 60 seconds)
            time.sleep(12 * 60 * 60)
    except KeyboardInterrupt:
        logger.info("Update loop terminated by user.")
    except Exception as e:
        logger.error(f"An error occurred in the update loop: {e}")