import os
import json
import logging
import tempfile
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI, OpenAIError

from app.chat import process_user_query, clear_conversation_log
from app.crud import (
    update_combined_data,
    save_tables_to_json,
    combine_waste_json,
    combine_json_files,
)

# -------------------------------------------------------------------------
# Load environment and configure OpenAI client
# -------------------------------------------------------------------------
load_dotenv()
client = OpenAI()  # reads OPENAI_API_KEY from environment

# -------------------------------------------------------------------------
# Logging setup
# -------------------------------------------------------------------------
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    level=logging.DEBUG,  # use DEBUG to see all our log lines
)
logger = logging.getLogger("SquareCloudAI")

# -------------------------------------------------------------------------
# FastAPI app and CORS
# -------------------------------------------------------------------------
app = FastAPI(
    title="SquareCloud AI API",
    description="API for interacting with the SquareCloud AI Chatbot",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in dev, allow all; tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# Data files setup
# -------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GB_DIR = os.path.join(BASE_DIR, "app", "GB")
os.makedirs(GB_DIR, exist_ok=True)

DATA_OPTIONS = {
    "energy": "combined_data.json",
    "waste": "waste_combined.json",
    "water": "water_discharge.json",
    "co2": "chimney_emissions.json",
    "ocr": "ocr_combined.json",
    "environment": "combined_data.json"  
}

for fname in DATA_OPTIONS.values():
    path = os.path.join(GB_DIR, fname)
    if not os.path.exists(path):
        with open(path, "w") as f:
            json.dump({}, f, indent=2)

# -------------------------------------------------------------------------
# Pydantic models
# -------------------------------------------------------------------------
class ChatRequest(BaseModel):
    user_input: str

class CategorySelection(BaseModel):
    category: str

# -------------------------------------------------------------------------
# In-memory session state
# -------------------------------------------------------------------------
selected_category: str | None = None

# -------------------------------------------------------------------------
# Startup and shutdown events
# -------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    logger.info("Initializing JSON data files...")
    try:
        update_combined_data()
        save_tables_to_json()
        combine_waste_json("waste_combined.json")
        combine_json_files("ocr_combined.json", "ocr_air_tb.json", "ocr_fuel_data.json")
        logger.info("Initialization complete.")
    except Exception:
        logger.exception("Failed during startup initialization")

@app.on_event("shutdown")
def on_shutdown():
    logger.info("Shutting down, clearing logs...")
    clear_conversation_log()

# -------------------------------------------------------------------------
# Helper: Load JSON from GB_DIR
# -------------------------------------------------------------------------
def load_json(filename: str):
    path = os.path.join(GB_DIR, filename)
    try:
        return json.load(open(path, "r"))
    except Exception:
        logger.exception("Error loading JSON %s, returning empty dict", filename)
        return {}

# -------------------------------------------------------------------------
# Transcription endpoint
# -------------------------------------------------------------------------
@app.post("/transcribe-openai/")
async def transcribe_audio(file: UploadFile = File(...)):
    logger.info(f"Transcribe request: filename={file.filename}, content_type={file.content_type}")
    if not client.api_key:
        raise HTTPException(500, detail="OPENAI_API_KEY not set")

    name, ext = os.path.splitext(file.filename.lower())
    supported = {".flac", ".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".oga", ".ogg", ".wav", ".webm"}
    if ext not in supported:
        raise HTTPException(400, detail=f"Unsupported audio format '{ext}'")

    try:
        # save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # whisper transcription
        with open(tmp_path, "rb") as audio_file:
            resp = client.audio.transcriptions.create(model="whisper-1", file=audio_file)

        os.unlink(tmp_path)
        transcription = getattr(resp, "text", "") or ""
        logger.debug("Whisper returned transcription: %r", transcription)
        return {"transcription": transcription}

    except OpenAIError as e:
        logger.exception("OpenAI API error")
        raise HTTPException(502, detail=f"OpenAI error: {e}")
    except Exception as e:
        logger.exception("Unexpected error in transcription")
        raise HTTPException(500, detail=f"Transcription failed: {e}")

# -------------------------------------------------------------------------
# Category selection endpoint
# -------------------------------------------------------------------------
@app.post("/select_category/")
def select_category(req: CategorySelection):
    global selected_category
    cat = req.category.lower()
    logger.info("Category selection request: %r", cat)
    if cat not in DATA_OPTIONS:
        logger.warning("Invalid category: %r", cat)
        raise HTTPException(400, detail="Invalid category")
    selected_category = cat
    logger.debug("selected_category set to %r", selected_category)
    return {"message": f"Category '{cat}' selected (file: {DATA_OPTIONS[cat]})."}

# -------------------------------------------------------------------------
# Chat endpoint
# -------------------------------------------------------------------------
@app.post("/chat/")
def chat(req: ChatRequest, background_tasks: BackgroundTasks):
    logger.info("Chat request: user_input=%r, selected_category=%r", req.user_input, selected_category)
    if not req.user_input.strip():
        raise HTTPException(400, detail="Input cannot be empty")
    if not selected_category:
        raise HTTPException(400, detail="No category selected")

    data = load_json(DATA_OPTIONS[selected_category])
    try:
        reply = process_user_query(req.user_input, data)
        logger.debug("process_user_query returned: %r", reply)
        if not reply:
            reply = "I’m sorry, I don’t have an answer for that."
        return {"response": reply, "timestamp": datetime.utcnow().isoformat()}
    except Exception:
        logger.exception("Error processing chat")
        raise HTTPException(500, detail="Chat processing failed")

# -------------------------------------------------------------------------
# Health check and log management
# -------------------------------------------------------------------------
@app.get("/health/")
def health_check():
    logger.debug("Health check called")
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.delete("/clear_logs/")
def clear_logs():
    logger.info("Clear logs called")
    try:
        clear_conversation_log()
        return {"message": "Logs cleared"}
    except Exception:
        logger.exception("Error clearing logs")
        raise HTTPException(500, detail="Failed to clear logs")

@app.delete("/end_session/")
def end_session():
    global selected_category
    logger.info("End session called (resetting selected_category)")
    selected_category = None
    clear_conversation_log()
    return {"message": "Session ended, category reset"}

# -------------------------------------------------------------------------
# Main entry point
# -------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting SquareCloud AI Chatbot on 0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
