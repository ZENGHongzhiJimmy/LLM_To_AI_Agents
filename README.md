# How to Build an AI Agent in Python

This repository has two parts.

1. A **Next.js tutorial app** in `web/`. Use it first. It walks through the same four ideas in the browser: the LLM API, conversation history, tool use, and a coding agent.
2. **Python scripts** in this folder (`step1.py`, `step2.py`, `step3.py`, `agent.py`). They are adapted from [Building AI Agents in Pure Python - Beginner Course](https://www.youtube.com/watch?v=c9AnqCeyxbI) (Tech With Tim). Run them after the tutorial when you want the same flow on the command line.

The story is the same in both parts. You start with the LLM API: send a question to a hosted model and get text back. Then conversation history, so a follow-up still makes sense. Then tool use: the model can ask your program to run a function, and you send the result back. Finally those ideas sit in one program: a coding agent that can list, read, and write files.

---

## Part 1: Next.js tutorial

The visual walkthrough lives in `web/`. You do not need Python or an API key to read the explanations.

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3005](http://localhost:3005). Each section has its own path. Reloading keeps you on that page.

| Path | Topic |
|------|--------|
| `/` | Overview |
| `/llm-api` | One HTTP call to a hosted language model |
| `/conversation-history` | Resend earlier turns so a follow-up still makes sense |
| `/tool-use` | Let the model ask your program to read a file, then call again |
| `/coding-agent` | More functions, plus a check before a shell command |

If you try the in-browser demos that call a model, put an OpenRouter key in a `.env` file in the **repository root** (one folder above `web/`). The app reads that file. See Part 2 for how to create the key.

---

## Part 2: Python scripts

These scripts are the command-line version of the same four sections.

| Program    | What you add |
|------------|----------------|
| `step1.py` | One HTTP call to a hosted language model |
| `step2.py` | Resend earlier turns so a follow-up still makes sense |
| `step3.py` | Let the model ask your program to read a file, then call again |
| `agent.py` | More functions, plus a check before a shell command |

### Setup

The model does not run on your laptop. You send an HTTP request to a hosted API and get text back.

This lab calls **OpenRouter**. OpenRouter is a gateway. You talk to one OpenAI-compatible endpoint and pay from one prepaid credit balance. Behind that, it can reach hundreds of models from many providers. You send one request. OpenRouter forwards it to the model and returns the reply.

The default model is `deepseek/deepseek-v4-flash-0731`:

`POST https://openrouter.ai/api/v1/chat/completions`

OpenRouter needs an **API key** so it can identify and bill your account. Put the key in a `.env` file, not in source. The scripts load it with `python-dotenv`. The Next.js app reads the same file from the repository root.

1. Create a key at [OpenRouter](https://openrouter.ai/settings/keys).

2. Create `.env` in this folder (the repository root, not `web/`):

```env
OPENROUTER_API_KEY=your_key_here
```

3. Install dependencies and run from this folder:

```bash
pip install -r requirements.txt
python step1.py
```

The rest of this README is a written version of the same four sections. The older Streamlit UI is still in `app.py` if you want it.

---

## Step 1: Call the model (`step1.py`)

Let’s start with a chatbot that replies in ordinary English. We send the user’s question to a hosted language model and get text back. I will show you what the LLM API is, what we put in the request, and what a completion is.

### The LLM API

Let’s say you want a chatbot that answers in ordinary English. You do not write every reply yourself. You use a **large language model (LLM)**. It reads the text you send and writes text back.

A strong model is too large to run on your laptop. So you send the user’s question to a hosted model, and the host sends a reply. That call is the **LLM API**.

An **API** (Application Programming Interface) is a contract. You send a request in a set format. You get a response. You do not need to know how the server is built.

On the web that contract is **HTTP**. A request has a **URL**, a **method** (this lab uses POST), **headers** (including an API key), and a **body** (the data you send). The server returns a status code and a **response body**. In this lab both bodies are JSON.

This lab calls **OpenRouter**. OpenRouter is a gateway. You talk to one OpenAI-compatible endpoint and pay from one prepaid credit balance. Behind that, it can reach hundreds of models from many providers. You send one request. OpenRouter forwards it to the model and returns the reply. Put the key in a `.env` file, not in your source code (see Setup).

### How the LLM API works

When you talk to a chat API, you usually send two kinds of text. The **system message** is written by you, the developer. It tells the model who it is and how it should behave. The **user message** is the question from the person using the chatbot.

Let’s say the system message is “You are Alice, a helpful assistant. First say who you are, then answer.” And the user asks, “What is a completion?”

The API wants that as JSON. You name the model, then you put those two texts in a list called `messages`. Each item says who is speaking (`role`) and what they said (`content`). This is the request body, simplified.

```json
{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    {
      "role": "system",
      "content": "You are Alice, a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is a completion?"
    }
  ]
}
```

You could send that JSON with raw HTTP. In this lab we use the **OpenAI Python SDK** instead. The SDK builds the same POST to `/chat/completions`. Many hosts accept this client, including OpenAI and OpenRouter. You set the key and the base URL, then you call `chat.completions.create`.

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
)

completion = client.chat.completions.create(
    model="deepseek/deepseek-v4-flash-0731",
    messages=[
        {
            "role": "system",
            "content": "You are Alice, a helpful assistant.",
        },
        {
            "role": "user",
            "content": "What is a completion?",
        },
    ],
)

print(completion.choices[0].message.content)
```

Look at the arguments we pass. `api_key` is your secret. Load it from `.env`, not from source. `base_url` is which server to call. The SDK appends `/chat/completions`. The sidebar endpoint is this value. `model` is which model writes the reply. `messages` is the list you already saw. Each item has `role` and `content`.

The response is also JSON. Inside it is an **assistant message**. That is the model’s reply. For this one request, we call that reply a **completion**. In the SDK you read it as `completion.choices[0].message`.

```json
{
  "role": "assistant",
  "content": "A completion is the model’s text for one request."
}
```

In the full response this object sits at `choices[0].message`. `step1.py` sends those two messages and prints the assistant text. The key goes in a header: `Authorization: Bearer <your key>`.

### Try this

```bash
python step1.py
```

**Task 1**

1. Run the default question. You should get one assistant reply.
2. Change the user question and run again.
3. Change the system prompt and see how the reply changes.
4. Break the API key briefly and read the error output.

**Task 2**

The hosted model cannot open your folder. Your program can. Before it sends the request, it looks at the system prompt. If it finds `{document_context}`, it reads `notes.md` from this folder and puts that file text in place of the placeholder.

1. Change the system prompt to this:

```
You are Alice, a helpful assistant.

# Document
{document_context}
```
2. Ask a question that only makes sense if the model has seen the file, for example “What is in the document?”
3. Print or inspect the request. The system message should contain the notes, not the placeholder.

### Summary

In this section we called the LLM API. We sent a system message and a user message, and we got one completion back. That completion is the assistant’s text. We also saw how a program can put a local file into the request before it is sent.

---

## Step 2: Conversation history (`step2.py`)

In the last section we made one request to the LLM API. We sent a system message and a user message, and we got one completion back. When that request finishes, the API is done with it. It does not store what we sent. If the user speaks again, our program has to send the earlier turns together with the new question. That growing list is conversation history.

### A follow-up question

Let’s say the user asks, “What are the stages in software development?” The first request is the same shape as in the last section. We send a system message and that user question.

```json
{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    { "role": "system", "content": "You are Alice..." },
    { "role": "user", "content": "What are the stages in software development?" }
  ]
}
```

The completion is one assistant message. That is the reply. This is a short example.

```json
{
  "role": "assistant",
  "content": "Requirements, design, implementation, testing, and maintenance."
}
```

Our program stores that reply. The list now has the system message, the user question, and the assistant reply.

Then the user asks, “Tell me more.”

If the second request contained only “Tell me more,” the LLM would not have seen the first question. The API does not store the last request. It only sees the `messages` you send now. So “more” has nothing to attach to.

So we send the conversation history together with the follow-up. That means the system message, the first user message, the assistant reply, and then “Tell me more.”

```json
{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    { "role": "system", "content": "You are Alice..." },
    { "role": "user", "content": "What are the stages in software development?" },
    { "role": "assistant", "content": "Requirements, design, implementation, testing, and maintenance." },
    { "role": "user", "content": "Tell me more." }
  ]
}
```

That growing `messages` list is **conversation history**. People also call it **context**. A **context window** is the size limit of that list.

`step2.py` does this in a `while` loop (`exit` / `quit` to stop). Before each request it prints the JSON so you can check the list.

### Try this

```bash
python step2.py
```

Now try it. First ask, “What are the stages in software development?” Then ask, “Tell me more.”

1. Send the first question and read the reply.
2. Send “Tell me more.” The second request should include the first question and the first reply, so the model knows what “more” means.
3. Inspect the printed `messages` payload. The second request should include the system message, the first question, the first reply, and “Tell me more.”

If you reset the conversation and send only “Tell me more,” the model has nothing to expand.

### Summary

In this section we sent a follow-up after the first reply. We learned that the second request has to include the earlier turns and the new question in the same `messages` list. Our program keeps that list. That list is conversation history.

---

## Step 3: Tool Use (`step3.py`)

In the last section, a completion was only text. Here we tell the LLM about a function our program can run. If it asks for that function, we run it, send the result back, and call the API again.

### A tool for reading a file

Let’s say the user asks, “What is inside `notes.md`?” The LLM cannot open that file, so it cannot know the answer by itself. But our program can open a file on disk and return the text.

So we add a function called `read_file`. It takes a path, reads the file, and gives back the contents. That is enough.

The LLM cannot run that Python function directly. It cannot even see your source code. So we have to tell it three things: that the function exists, when to use it, and what argument to pass. We send that information in a `tools` list. In the code, that list is called `TOOL_SCHEMAS`. Each entry gives the tool’s name, a short description, and its parameters. This is the list this page sends.

```python
TOOL_SCHEMAS = [
  {
    "type": "function",
    "function": {
      "name": "read_file",
      "description": "Read a text file and return its contents.",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Path of the file to read" }
        },
        "required": ["path"]
      }
    }
  }
]
```

The important part is the `description`. That is what helps the LLM decide that a question about `notes.md` should turn into a `read_file` call with `path` set to `notes.md`.

In the last section, we already called `chat.completions.create` with a model name and a `messages` list. Now we add one more argument: `tools`. We pass in `TOOL_SCHEMAS`, and the SDK puts that array into the JSON body right next to `messages`.

```python
completion = client.chat.completions.create(
    model="deepseek/deepseek-v4-flash-0731",
    messages=messages,
    tools=TOOL_SCHEMAS,
)

message = completion.choices[0].message
# message.content is text, or None if the model asked for a tool
# message.tool_calls is the list of function names and arguments
```

`tools` is the only new argument. If you leave it out, the LLM can only write text. If you pass the array, the completion may return `tool_calls` instead of a sentence. Here is what that looks like when the model wants `notes.md`.

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "read_file",
        "arguments": { "path": "notes.md" }
      }
    }
  ]
}
```

Look at `tool_calls`. The LLM is asking our program to call `read_file` and pass `notes.md` as `path`. The LLM does not open the file. Our program runs `read_file`. Later we send the file text back.

After `read_file` returns, we append a new turn with role `tool`. The `content` is whatever the function gave back, for example the file text.

```json
{
  "role": "tool",
  "tool_call_id": "call_1",
  "content": "Meeting notes: ship the lab by Friday."
}
```

Then we send the updated list, and the same schemas, in a second call. We repeat until the completion has no `tool_calls`. That repeat is the **loop**.

1. Send conversation history and the tool schemas.
2. If the completion has `tool_calls`, run those functions and append role `tool` turns.
3. Call the API again with the new history.
4. Stop when a completion has no `tool_calls`. That text is the reply.

Here we only run `read_file`. If the name is unknown, we put an error string in the tool turn.

### Try this

Keep `notes.md` in this folder.

```bash
python step3.py
```

Send the default question. It asks what is inside `notes.md`, in one line.

1. Watch the printout. The first assistant turn often has `tool_calls` and almost no text for you.
2. Then our program appends the file text, and another completion runs.
3. Find the `tool_calls` and the later role `tool` entries.
4. You can also rename `notes.md` and rerun. The tool returns not found, and the next completion can explain that.

### Summary

In this section we told the model about `read_file` with a `TOOL_SCHEMAS` list. We learned that the completion can ask for that function, our program runs it, and we send the result back. We repeat that until the reply is ordinary text. That repeat is the loop.

---

## Optional: coding agent (`agent.py`)

A coding agent is an AI system that can read, write, and change code on its own. It does not stop after one snippet. It reasons, chooses a tool, runs it, looks at the result, and repeats until the task is done or a person has to step in.

### How a coding agent works

In the last section we already used one **tool**, `read_file`, and we ran the loop that sends the result back. Here we put that loop in a small program and give the model more than one function. People call that program a **harness**. A coding agent is the LLM, that harness, and the tools, working together.

The **LLM** is the reasoning core. It reads the user’s goal, plans the next step, and decides which tool to ask for. It still only writes text, including `tool_calls`. It does not touch the disk.

The harness is our program. It sends the prompts, reads the completion, runs the function if the policy allows it, appends the result to the conversation history, and calls the API again. That repeat is the loop: receive the request, reason, select a tool, execute, observe, and go again.

The **tools** are the actions. The model still only asks our program to run a function. In this lab we have four. `list_files` lists a folder. `read_file` returns file text. `write_file` saves new contents. `run_command` runs a shell command after you approve it.

Let’s say the user asks, “Make a simple snake game in Python using Pygame.” The LLM cannot create a folder or a file by itself. It can only ask our program to run a function. We stay with this one request and see how all four tools get used.

First we send a JSON request. The `messages` list holds the system prompt and that user question. The `tools` array names `list_files`, `read_file`, `write_file`, and `run_command`.

```json
{
  "model": "deepseek/deepseek-v4-flash-0731",
  "messages": [
    { "role": "system", "content": "You are a coding agent..." },
    {
      "role": "user",
      "content": "Make a simple snake game in Python using Pygame."
    }
  ],
  "tools": [
    { "type": "function", "function": { "name": "list_files" } },
    { "type": "function", "function": { "name": "read_file" } },
    { "type": "function", "function": { "name": "write_file" } },
    { "type": "function", "function": { "name": "run_command" } }
  ]
}
```

The first thing the model needs is a place to put the game. So it does not answer the user yet. The completion asks for `run_command`, and the command is `mkdir snake_game`.

```json
{
  "name": "run_command",
  "arguments": { "command": "mkdir snake_game" }
}
```

A shell command can be dangerous. `rm` is the usual example. So our program stops and shows you the command. You can type `y` or decline. If you approve, the folder is created. We append a role `tool` turn and call the API again.

Now the model can write the game. It asks for `write_file`. It sends the path `snake_game/main.py` and the full file text. A real file would import `pygame`, draw the screen, move the snake, spawn food, and end the game if the snake hits itself or a wall. I am not going to paste the whole game here. You only need to see that `write_file` gets a path and the contents.

```json
{
  "name": "write_file",
  "arguments": {
    "path": "snake_game/main.py",
    "content": "import pygame\n# screen, snake, food, collisions\n"
  }
}
```

Our program writes those bytes to disk and comes back with a short confirmation, such as `Saved snake_game/main.py`. Then the model may want to look at what it just wrote. That is the same `read_file` idea as in the last section. It asks to open `snake_game/main.py`.

```json
{
  "name": "read_file",
  "arguments": { "path": "snake_game/main.py" }
}
```

Our program returns the file text. The model can fix a bug or tidy the code. We append that text and call the API again. After a while it also wants to know what is sitting in the project folder, so it asks for `list_files`.

```json
{
  "name": "list_files",
  "arguments": { "path": "snake_game" }
}
```

Our program lists that folder, the way you would with `os.listdir`. The result is ordinary text, maybe just `main.py`. Now the model knows the file is there. To play the game it still needs Pygame, and then it needs to start the script. Those are two more `run_command` calls. Each one waits until you type `y`.

```json
{
  "name": "run_command",
  "arguments": { "command": "pip install pygame" }
}
```

```json
{
  "name": "run_command",
  "arguments": { "command": "python snake_game/main.py" }
}
```

If you approve both, the game window can open and you can play. The last completion has no `tool_calls`. The assistant text is the reply. It might say the folder is ready and the snake game is running.

So the LLM did not create the folder. It did not write the file. It did not install Pygame. It only named a function and its arguments. Our program ran the function, sent the result back, and the model kept going until the job was done.

```json
{
  "role": "assistant",
  "content": "I created snake_game/main.py, installed pygame, and started the game."
}
```

Coding agents such as Cursor, GitHub Copilot, and Claude Code often have tools like these.

- `glob` finds files by a name pattern. For example `**/*.py` means every Python file under this folder.
- `grep` finds lines that contain a text pattern, for example the string `function createUser`.

Some agents also search the web, run tests, or call git.

Now try the same request in `agent.py`. Finish steps 1 to 3 first so you recognize the `messages` list and the `tool_calls`.

```bash
python agent.py
```

## Reference

[Building AI Agents in Pure Python - Beginner Course](https://www.youtube.com/watch?v=c9AnqCeyxbI) (Tech With Tim)
