import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise SystemExit("OPENROUTER_API_KEY is missing. Check your .env file.")

DOCUMENT_CONTEXT = "{document_context}"


def expand_document_context(text):
    if DOCUMENT_CONTEXT not in text:
        return text
    notes_path = os.path.join(os.path.dirname(__file__), "notes.md")
    try:
        with open(notes_path, encoding="utf-8") as notes_file:
            notes = notes_file.read()
    except OSError:
        notes = "(notes.md was not found)"
    return text.replace(DOCUMENT_CONTEXT, notes)


system_prompt = expand_document_context(
    "You are Alice, a helpful assistant. First explain who you are and then answer the user's question."
)

response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "model": "deepseek/deepseek-v4-flash-0731",
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": "Explain what an AI agent is in one sentence.",
            }
        ],
        "reasoning": {"enabled": False},
    },
)

data = response.json()
if "choices" not in data:
    raise SystemExit(f"OpenRouter error ({response.status_code}): {json.dumps(data, indent=2)}")

message = data["choices"][0]["message"]
print(message.get("content"))
