import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise SystemExit("OPENROUTER_API_KEY is missing. Check your .env file.")

messages = [
    {
        "role": "system",
        "content": "You are Alice, a helpful assistant. First explain who you are and then answer the user's question.",
    },
]

while True:
    user_input = input("You: ")
    if user_input.strip().lower() in ("exit", "quit"):
        break

    messages.append({"role": "user", "content": user_input})

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
            "model": "deepseek/deepseek-v4-flash-0731",
            "messages": messages,
            "reasoning": {"enabled": False},
        },
    )

    data = response.json()
    if "choices" not in data:
        raise SystemExit(
            f"OpenRouter error ({response.status_code}): {json.dumps(data, indent=2)}"
        )

    message = data["choices"][0]["message"]
    reply = message.get("content")

    # Preserve reasoning_details for multi-turn reasoning continuity
    assistant_msg = {"role": "assistant", "content": reply}
    if message.get("reasoning_details") is not None:
        assistant_msg["reasoning_details"] = message["reasoning_details"]
    messages.append(assistant_msg)

    print("Bot:", reply)
    usage = data.get("usage") or {}
    print(
        f"Tokens — input: {usage.get('prompt_tokens', '?')}, "
        f"output: {usage.get('completion_tokens', '?')}"
    )
    print("---")
