import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise SystemExit("OPENROUTER_API_KEY is missing. Check your .env file.")


def read_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return True, f.read()
    except FileNotFoundError:
        return False, f"File {path} not found"


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a text file and return its contents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path of the file to read"},
                },
                "required": ["path"],
            },
        },
    },
]

messages = [
    {
        "role": "user",
        "content": "What is inside notes.md? Summarize it in one line.",
    },
]

while True:
    print("\n--- messages sent to server ---")
    print(json.dumps(messages, indent=2))
    print("--- end of messages sent to server ---\n")

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "qwen/qwen3.8-27b:free",
            "messages": messages,
            "tools": TOOL_SCHEMAS,
            "reasoning": {"enabled": False},
        },
    )

    data = response.json()
    if "choices" not in data:
        raise SystemExit(
            f"OpenRouter error ({response.status_code}): {json.dumps(data, indent=2)}"
        )

    message = data["choices"][0]["message"]
    usage = data.get("usage") or {}
    print(
        f"Tokens — input: {usage.get('prompt_tokens', '?')}, "
        f"output: {usage.get('completion_tokens', '?')}"
    )

    # Keep a JSON-serializable assistant turn (incl. tool_calls / reasoning_details)
    assistant_msg = {
        "role": "assistant",
        "content": message.get("content"),
    }
    if message.get("tool_calls"):
        assistant_msg["tool_calls"] = message["tool_calls"]
    if message.get("reasoning_details") is not None:
        assistant_msg["reasoning_details"] = message["reasoning_details"]
    messages.append(assistant_msg)

    tool_calls = message.get("tool_calls") or []
    if not tool_calls:
        print("Bot:", message.get("content"))
        print("---")
        break

    for tool_call in tool_calls:
        name = tool_call["function"]["name"]
        args = json.loads(tool_call["function"]["arguments"])

        if name != "read_file":
            result = f"Error: unknown tool '{name}'. Only 'read_file' is supported."
            print(result)
        else:
            print(f"Model wants to run: read_file({args})")
            ok, result = read_file(**args)
            if ok:
                print("Status: success")
                print(f"Contents:\n{result}")
            else:
                print(f"Status: failed — {result}")

        messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": result,
            }
        )

    print("---")
