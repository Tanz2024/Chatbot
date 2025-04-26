import os
import sys
import json
import logging
from datetime import datetime, timedelta
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

# Add project root to PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from crud import save_tables_to_json  # Import from crud.py

# Load environment variables
load_dotenv()

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Chatbot")

# Load OpenAI API key
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OpenAI API key is not set in the environment variables.")

# Initialize GPT
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0, openai_api_key=openai_api_key)

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GB_DIR = os.path.join(BASE_DIR,"app", "GB")  # ✅ Updated path
os.makedirs(GB_DIR, exist_ok=True)  # Ensure GB folder exists

PROMPT_LOG_FILE = os.path.join(BASE_DIR, "prompt_logs.json")

# Mapping of options to JSON files (all in GB/)
DATA_OPTIONS = {
    "1": {"name": "Energy", "file": "combined_data.json"},
    "2": {"name": "Waste", "file": "waste_combined.json"},
    "3": {"name": "Water", "file": "water_discharge.json"},
    "4": {"name": "CO2 Emissions", "file": "chimney_emissions.json"},
    "5": {"name": "OCR", "file": "ocr_combined.json"},
}

# Ensure JSON files exist
def ensure_json_file(file_path, default_content):
    if not os.path.exists(file_path):
        with open(file_path, "w") as file:
            json.dump(default_content, file, indent=4)

# Ensure all required JSON files exist
for file_name in DATA_OPTIONS.values():
    ensure_json_file(os.path.join(GB_DIR, file_name["file"]), {})

ensure_json_file(PROMPT_LOG_FILE, [])

# Load JSON data from a file
def load_json_file(file_name):
    try:
        file_path = os.path.join(BASE_DIR, "app", "GB", file_name)
        with open(file_path, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        logger.warning(f"File not found: {file_name}. Creating an empty JSON file.")
        with open(file_path, "w") as file:
            json.dump({}, file, indent=4)
        return {}
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON format in file: {file_name}")
        return {}

# Save conversation log
def save_conversation(user_prompt, bot_response):
    try:
        with open(PROMPT_LOG_FILE, "r+") as file:
            logs = json.load(file)
            logs.append({"user_prompt": user_prompt, "bot_response": bot_response})
            file.seek(0)
            json.dump(logs, file, indent=4)
            file.truncate()
    except Exception as e:
        logger.error(f"Error saving conversation: {e}")

# Clear conversation log
def clear_conversation_log():
    try:
        with open(PROMPT_LOG_FILE, "w") as file:
            json.dump([], file, indent=4)
        logger.info("Conversation logs have been cleared.")
    except Exception as e:
        logger.error(f"Error clearing conversation log: {e}")

# Load conversation history
def load_conversation_history():
    try:
        with open(PROMPT_LOG_FILE, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        return []
    except Exception as e:
        logger.error(f"Error loading conversation history: {e}")
        return []

# Process user queries based on loaded JSON data
def process_user_query(user_input, loaded_data):
    try:
        conversation_history = load_conversation_history()
        formatted_history = "\n".join(
            [f"User: {log['user_prompt']}\nBot: {log['bot_response']}" for log in conversation_history[-10:]]
        )

        prompt_template = PromptTemplate(
            input_variables=["conversation_history", "user_query", "data"],
            template="""You are an assistant. Provide concise answers based on the dataset provided.
            Conversation History: {conversation_history}
            User Query: "{user_query}"
            JSON Data: {data}
            Instructions:
            - Respond concisely and clearly.""",
        )

        prompt = prompt_template.format(
            conversation_history=formatted_history, user_query=user_input, data=json.dumps(loaded_data, indent=2)
        )

        response = llm.invoke(prompt)
        bot_response = response.content if hasattr(response, "content") else str(response)
        save_conversation(user_input, bot_response)
        return bot_response.strip()

    except Exception as e:
        logger.error(f"Error processing user query: {e}")
        return "Sorry, I encountered an error while processing your request."

# Display menu and get user choice
def display_menu():
    print("\nWelcome to Square AI Energy Assistant!")
    print("Please select a category:")
    for key, value in DATA_OPTIONS.items():
        print(f"{key}. {value['name']}")
    print("8. Exit")

    while True:
        choice = input("Enter your choice: ").strip()
        if choice in DATA_OPTIONS:
            return choice
        elif choice == "8":
            print("Goodbye! Have a great day!")
            clear_conversation_log()
            sys.exit()
        else:
            print("Invalid choice. Please select a valid option.")

# Chat interface
def chat_with_bot():
    while True:
        user_choice = display_menu()
        selected_option = DATA_OPTIONS[user_choice]
        file_name = selected_option["file"]

        # Load the selected JSON data
        loaded_data = load_json_file(file_name)
        if loaded_data is None:
            print(f"Error: Could not load data for {selected_option['name']}. Returning to menu.")
            continue  # Go back to menu if loading fails

        print(f"\nLoaded {selected_option['name']} data. You can now ask questions related to it.")
        print("Type 'back' to return to the main menu.\n")

        while True:
            user_query = input("You: ").strip()
            if user_query.lower() == "back":
                break
            if user_query.lower() in ["exit", "quit"]:
                print("Goodbye! Have a great day!")
                clear_conversation_log()
                sys.exit()

            # ✅ Fix: Ensure loaded_data is passed
            bot_response = process_user_query(user_query, loaded_data)
            print(f"Bot: {bot_response}")


if __name__ == "__main__":
    chat_with_bot()
 