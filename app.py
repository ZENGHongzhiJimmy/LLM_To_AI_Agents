"""
Streamlit lab UI for visualizing step1–step3 and the coding agent.
Run: streamlit run app.py
"""

from __future__ import annotations

import json
import os
import subprocess
from copy import deepcopy
from pathlib import Path

import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

MODEL = "deepseek/deepseek-v4-flash-0731"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
WORK_DIR = Path(__file__).resolve().parent

SYSTEM_ALICE = (
    "You are Alice, a helpful assistant. "
    "First explain who you are and then answer the user's question."
)

AGENT_SYSTEM = """You are a coding agent running in the user's workspace.
You can list files, read files, write files, and run shell commands.
Use your tools to complete the user's task, then briefly summarize what you did.
The working directory is the project folder."""

STEP3_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a text file and return its contents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path of the file to read",
                    },
                },
                "required": ["path"],
            },
        },
    },
]

AGENT_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List the files in a directory. Folders end with /.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Directory to list, e.g. '.'",
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a text file and return its contents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path of the file to read",
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create or overwrite a text file with the given content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path of the file to write",
                    },
                    "content": {
                        "type": "string",
                        "description": "Full contents of the file",
                    },
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Run a shell command and return its output. The user approves it first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to run",
                    },
                },
                "required": ["command"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def get_api_key() -> str | None:
    return os.getenv("OPENROUTER_API_KEY") or st.session_state.get("api_key_override")


def chat_completion(
    messages: list,
    *,
    tools: list | None = None,
    reasoning: bool = False,
) -> tuple[dict, dict]:
    """Return (assistant_message, usage). Raises ValueError on API errors."""
    api_key = get_api_key()
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is missing. Set it in .env or the sidebar.")

    payload: dict = {
        "model": MODEL,
        "messages": messages,
        "reasoning": {"enabled": reasoning},
    }
    if tools is not None:
        payload["tools"] = tools

    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    data = response.json()
    if "choices" not in data:
        raise ValueError(
            f"OpenRouter error ({response.status_code}): {json.dumps(data, indent=2)}"
        )
    return data["choices"][0]["message"], data.get("usage") or {}


def assistant_to_history(message: dict) -> dict:
    entry = {"role": "assistant", "content": message.get("content")}
    if message.get("tool_calls"):
        entry["tool_calls"] = message["tool_calls"]
    if message.get("reasoning_details") is not None:
        entry["reasoning_details"] = message["reasoning_details"]
    return entry


def role_badge(role: str) -> str:
    colors = {
        "system": "violet",
        "user": "blue",
        "assistant": "green",
        "tool": "orange",
    }
    return f":{colors.get(role, 'gray')}[**{role}**]"


def render_messages(messages: list, title: str = "Messages") -> None:
    st.markdown(f"**{title}** ({len(messages)} items)")
    for i, msg in enumerate(messages):
        role = msg.get("role", "?")
        with st.expander(f"{i}. {role}", expanded=(role in ("user", "assistant", "tool"))):
            st.markdown(role_badge(role))
            if msg.get("content"):
                st.markdown(msg["content"])
            elif msg.get("content") is None and msg.get("tool_calls"):
                st.caption("(no text content — tool call only)")
            if msg.get("tool_calls"):
                st.markdown("**tool_calls**")
                st.json(msg["tool_calls"])
            if msg.get("tool_call_id"):
                st.caption(f"tool_call_id: `{msg['tool_call_id']}`")
            if msg.get("reasoning_details"):
                with st.popover("reasoning_details"):
                    st.json(msg["reasoning_details"])
    with st.expander("Raw JSON", expanded=False):
        st.json(messages)


def render_usage(usage: dict) -> None:
    c1, c2, c3 = st.columns(3)
    c1.metric("Input tokens", usage.get("prompt_tokens", "—"))
    c2.metric("Output tokens", usage.get("completion_tokens", "—"))
    c3.metric("Total tokens", usage.get("total_tokens", "—"))


def resolve_path(path: str) -> Path:
    p = Path(path)
    if not p.is_absolute():
        p = WORK_DIR / p
    return p.resolve()


def tool_read_file(path: str) -> tuple[bool, str]:
    try:
        return True, resolve_path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        return False, f"File {path} not found"
    except OSError as exc:
        return False, f"Error: {exc}"


def tool_list_files(path: str = ".") -> str:
    target = resolve_path(path)
    entries = []
    for entry in os.scandir(target):
        entries.append(entry.name + ("/" if entry.is_dir() else ""))
    return "\n".join(sorted(entries)) or "(empty directory)"


def tool_write_file(path: str, content: str) -> str:
    target = resolve_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"Saved {path} ({len(content)} characters)"


def tool_run_command(command: str) -> str:
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
        timeout=120,
        cwd=WORK_DIR,
    )
    output = (result.stdout + result.stderr).strip()
    return output or f"(no output, exit code {result.returncode})"


STEP3_SYSTEM_DEFAULT = (
    "You are a helpful assistant with a read_file tool. "
    "Use the tool when you need file contents, then answer briefly."
)


def ensure_session_value(key: str, default) -> None:
    """Set session state if missing or empty (fixes blank Streamlit text widgets)."""
    current = st.session_state.get(key, None)
    if current is None or current == "" or current == []:
        st.session_state[key] = (
            deepcopy(default) if isinstance(default, (list, dict)) else default
        )


def init_state() -> None:
    defaults = {
        "step1_system": SYSTEM_ALICE,
        "step1_result": None,
        "step2_system": SYSTEM_ALICE,
        "step2_messages": [{"role": "system", "content": SYSTEM_ALICE}],
        "step2_last_sent": None,
        "step2_last_reply": None,
        "step2_last_response": None,
        "step2_last_usage": None,
        "step3_system": STEP3_SYSTEM_DEFAULT,
        "step3_tool_schemas": deepcopy(STEP3_TOOL_SCHEMAS),
        "step3_tool_schemas_text": json.dumps(STEP3_TOOL_SCHEMAS, indent=2),
        "step3_last_sent": None,
        "step3_last_reply": None,
        "step3_last_response": None,
        "step3_last_usage": None,
        "step3_rounds": [],
        "step3_tool_events": [],
        "agent_system": AGENT_SYSTEM,
        "agent_tool_schemas": deepcopy(AGENT_TOOL_SCHEMAS),
        "agent_tool_schemas_text": json.dumps(AGENT_TOOL_SCHEMAS, indent=2),
        "agent_messages": [{"role": "system", "content": AGENT_SYSTEM}],
        "agent_log": [],
        "agent_last_sent": None,
        "agent_last_response": None,
        "agent_rounds": [],
        "agent_pending": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = deepcopy(value) if isinstance(value, (list, dict)) else value

    # Refill editors that were left blank by an earlier session / widget init
    ensure_session_value("step1_system", SYSTEM_ALICE)
    ensure_session_value("step2_system", SYSTEM_ALICE)
    ensure_session_value("step3_system", STEP3_SYSTEM_DEFAULT)
    ensure_session_value("agent_system", AGENT_SYSTEM)
    ensure_session_value(
        "step3_tool_schemas_text", json.dumps(STEP3_TOOL_SCHEMAS, indent=2)
    )
    ensure_session_value(
        "agent_tool_schemas_text", json.dumps(AGENT_TOOL_SCHEMAS, indent=2)
    )
    if not st.session_state.get("step3_tool_schemas"):
        st.session_state.step3_tool_schemas = deepcopy(STEP3_TOOL_SCHEMAS)
    if not st.session_state.get("agent_tool_schemas"):
        st.session_state.agent_tool_schemas = deepcopy(AGENT_TOOL_SCHEMAS)


def apply_tool_schemas_from_text(text_key: str, schemas_key: str) -> bool:
    """Parse JSON from a text_area into session state. Return True on success."""
    try:
        parsed = json.loads(st.session_state[text_key])
        if not isinstance(parsed, list):
            st.error("Tool schemas must be a JSON array.")
            return False
        st.session_state[schemas_key] = parsed
        st.success("Tool schemas updated.")
        return True
    except json.JSONDecodeError as exc:
        st.error(f"Invalid JSON: {exc}")
        return False


def render_messages_panel(
    sent: list | None,
    usage: dict | None,
    response: dict | None = None,
) -> None:
    """Right-hand panel: request messages + response JSON + tokens."""
    st.subheader("Messages sent to server")
    if sent is None:
        st.caption("Run a request to see the JSON payload.")
    else:
        st.caption("Complete messages array for this request (JSON).")
        st.json(sent)

    st.subheader("JSON response")
    if response is None:
        st.caption("No response yet.")
    else:
        st.json(response)

    if usage:
        st.markdown("**Tokens**")
        render_usage(usage)


def render_rounds_panel(rounds: list | None, empty_hint: str) -> None:
    """Show every model round: request JSON + response JSON (grows over time)."""
    st.subheader("Request / response rounds")
    if not rounds:
        st.caption(empty_hint)
        return

    st.caption(f"{len(rounds)} model call(s) so far — newest at the bottom.")
    for i, round_data in enumerate(rounds, start=1):
        with st.expander(
            f"Round {i}",
            expanded=(i == len(rounds)),
        ):
            st.markdown("**Messages sent to server**")
            st.json(round_data.get("sent"))
            st.markdown("**JSON response**")
            st.json(round_data.get("response"))
            usage = round_data.get("usage")
            if usage:
                st.markdown("**Tokens**")
                render_usage(usage)


def render_system_prompt_editor(
    *,
    key: str,
    default: str,
    label: str = "System prompt",
) -> None:
    """Edit system prompt. Uses a separate widget key so the box shows the real default."""
    editor_key = f"{key}__editor"
    reset_flag = f"{key}__do_reset"

    # Apply reset *before* the widget is created (Streamlit requirement)
    if st.session_state.pop(reset_flag, False):
        st.session_state[key] = default
        st.session_state[editor_key] = default

    if key not in st.session_state or not str(st.session_state.get(key, "")).strip():
        st.session_state[key] = default
    if editor_key not in st.session_state or not str(
        st.session_state.get(editor_key, "")
    ).strip():
        st.session_state[editor_key] = st.session_state[key] or default

    with st.expander(f"Configure {label}", expanded=True):
        st.caption(
            "This becomes the first message (`role: system`) in the request. "
            "Edit it below if you want, then run the step."
        )
        st.text_area(label, height=120, key=editor_key)
        st.session_state[key] = st.session_state[editor_key]
        if st.button("Reset system prompt to default", key=f"reset_sys_{key}"):
            st.session_state[reset_flag] = True
            st.rerun()


def render_tool_schema_editor(
    *,
    text_key: str,
    schemas_key: str,
    default_schemas: list,
    note: str,
) -> None:
    """Edit tools JSON. Separate editor key avoids blank Streamlit text_area bug."""
    default_text = json.dumps(default_schemas, indent=2)
    editor_key = f"{text_key}__editor"
    reset_flag = f"{schemas_key}__do_reset"

    if st.session_state.pop(reset_flag, False):
        st.session_state[schemas_key] = deepcopy(default_schemas)
        st.session_state[text_key] = default_text
        st.session_state[editor_key] = default_text

    if schemas_key not in st.session_state or not st.session_state.get(schemas_key):
        st.session_state[schemas_key] = deepcopy(default_schemas)
    if text_key not in st.session_state or not str(
        st.session_state.get(text_key, "")
    ).strip():
        st.session_state[text_key] = default_text
    if editor_key not in st.session_state or not str(
        st.session_state.get(editor_key, "")
    ).strip():
        st.session_state[editor_key] = st.session_state[text_key]

    st.subheader("Tool schemas")
    st.caption(note)
    st.text_area(
        "tools JSON (sent to the API)",
        height=220,
        key=editor_key,
    )
    st.session_state[text_key] = st.session_state[editor_key]

    c1, c2 = st.columns(2)
    if c1.button("Apply schema changes", key=f"apply_{schemas_key}"):
        try:
            parsed = json.loads(st.session_state[editor_key])
            if not isinstance(parsed, list):
                st.error("Tool schemas must be a JSON array.")
            else:
                st.session_state[schemas_key] = parsed
                st.session_state[text_key] = st.session_state[editor_key]
                st.success("Tool schemas updated.")
        except json.JSONDecodeError as exc:
            st.error(f"Invalid JSON: {exc}")
    if c2.button("Reset schemas to default", key=f"reset_{schemas_key}"):
        st.session_state[reset_flag] = True
        st.rerun()


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------


def page_overview() -> None:
    st.title("Build an AI Agent — Lab Visualizer")
    st.markdown(
        """
Use the sidebar to open each step. The UI mirrors what the terminal scripts do,
but shows **messages**, **tokens**, and **tool calls** so you can see the agent loop.

| Tab | Concept |
|-----|---------|
| **Step 1** | One API call (model only generates text) |
| **Step 2** | Conversation history as memory |
| **Step 3** | Tool calling + loop (`read_file`) |
| **Agent** | Coding agent with four tools |
"""
    )
    st.info(
        "Agent = **model** + **tools** + **loop**. "
        "Memory is the message list your app resends every turn."
    )
    st.code("streamlit run app.py", language="bash")


def page_step1() -> None:
    st.header("Step 1 — One API call")
    st.markdown(
        "The model only generates text. There is no chat memory and no tools yet."
    )

    col_main, col_viz = st.columns([1, 1])

    with col_main:
        st.subheader("Request")
        if "step1_system" not in st.session_state or not str(
            st.session_state.get("step1_system", "")
        ).strip():
            st.session_state.step1_system = SYSTEM_ALICE
        if "step1_system__editor" not in st.session_state or not str(
            st.session_state.get("step1_system__editor", "")
        ).strip():
            st.session_state["step1_system__editor"] = st.session_state.step1_system
        st.text_area(
            "System prompt",
            height=100,
            key="step1_system__editor",
        )
        st.session_state.step1_system = st.session_state["step1_system__editor"]
        user_prompt = st.text_area(
            "User message",
            "Explain what an AI agent is in one sentence.",
            height=80,
        )
        if st.button("Run Step 1", type="primary"):
            messages = [
                {"role": "system", "content": st.session_state.step1_system},
                {"role": "user", "content": user_prompt},
            ]
            try:
                with st.spinner("Calling OpenRouter…"):
                    message, usage = chat_completion(messages)
                st.session_state.step1_result = {
                    "sent": messages,
                    "reply": message.get("content"),
                    "response": message,
                    "usage": usage,
                }
            except Exception as exc:
                st.error(str(exc))

        result = st.session_state.step1_result
        if result and result.get("reply") is not None:
            st.subheader("Reply")
            with st.chat_message("assistant"):
                st.markdown(result["reply"] or "(empty content)")

    with col_viz:
        result = st.session_state.step1_result
        render_messages_panel(
            result["sent"] if result else None,
            result["usage"] if result else None,
            result.get("response") if result else None,
        )


def page_step2() -> None:
    st.header("Step 2 — Multi-turn chat (memory)")
    st.markdown(
        "The model has no built-in memory. This app keeps a `messages` list and "
        "resends the **whole** list on every turn."
    )

    if st.button("Reset conversation"):
        st.session_state.step2_messages = [
            {"role": "system", "content": st.session_state.get("step2_system") or SYSTEM_ALICE}
        ]
        st.session_state.step2_last_sent = None
        st.session_state.step2_last_reply = None
        st.session_state.step2_last_response = None
        st.session_state.step2_last_usage = None
        st.rerun()

    col_main, col_viz = st.columns([1, 1])

    with col_main:
        st.subheader("Chat")
        if "step2_system" not in st.session_state or not str(
            st.session_state.get("step2_system", "")
        ).strip():
            st.session_state.step2_system = SYSTEM_ALICE
        if "step2_system__editor" not in st.session_state or not str(
            st.session_state.get("step2_system__editor", "")
        ).strip():
            st.session_state["step2_system__editor"] = st.session_state.step2_system
        st.text_area(
            "System prompt",
            height=100,
            key="step2_system__editor",
        )
        st.session_state.step2_system = st.session_state["step2_system__editor"]
        # Keep the live history's system message in sync
        if (
            st.session_state.step2_messages
            and st.session_state.step2_messages[0].get("role") == "system"
        ):
            st.session_state.step2_messages[0]["content"] = st.session_state.step2_system

        if st.session_state.step2_last_reply is not None:
            with st.chat_message("assistant"):
                st.markdown(st.session_state.step2_last_reply or "(empty content)")
        else:
            st.caption("Send a message to start. Only the latest reply is shown here.")

        prompt = st.chat_input("Your message")
        if prompt:
            st.session_state.step2_messages.append(
                {"role": "user", "content": prompt}
            )
            sent = deepcopy(st.session_state.step2_messages)
            try:
                with st.spinner("Calling OpenRouter…"):
                    message, usage = chat_completion(st.session_state.step2_messages)
                reply = message.get("content")
                assistant_msg = {"role": "assistant", "content": reply}
                if message.get("reasoning_details") is not None:
                    assistant_msg["reasoning_details"] = message["reasoning_details"]
                st.session_state.step2_messages.append(assistant_msg)
                st.session_state.step2_last_sent = sent
                st.session_state.step2_last_reply = reply
                st.session_state.step2_last_response = message
                st.session_state.step2_last_usage = usage
                st.rerun()
            except Exception as exc:
                st.session_state.step2_messages.pop()
                st.error(str(exc))

    with col_viz:
        render_messages_panel(
            st.session_state.step2_last_sent,
            st.session_state.step2_last_usage,
            st.session_state.step2_last_response,
        )


def page_step3() -> None:
    st.header("Step 3 — Tool calling + agent loop")
    st.markdown(
        "The model may return **tool_calls** instead of a final answer. "
        "Your code runs the tool, appends a `role: tool` message, and calls "
        "the model again until there are no more tool calls."
    )

    col_sys, col_tools = st.columns(2)
    with col_sys:
        render_system_prompt_editor(
            key="step3_system",
            default=STEP3_SYSTEM_DEFAULT,
            label="system prompt",
        )
    with col_tools:
        render_tool_schema_editor(
            text_key="step3_tool_schemas_text",
            schemas_key="step3_tool_schemas",
            default_schemas=STEP3_TOOL_SCHEMAS,
            note=(
                "Edit the `tools` array sent to the API. "
                "This app still only *executes* `read_file`; other names return an error."
            ),
        )

    col_main, col_viz = st.columns([1, 1])

    with col_viz:
        viz_slot = st.empty()

    with col_main:
        st.subheader("Request")
        question = st.text_area(
            "User question",
            "What is inside notes.md? Summarize it in one line.",
            height=70,
        )
        max_rounds = st.slider("Max loop rounds (safety)", 1, 8, 5)

        if st.button("Run Step 3", type="primary"):
            messages = [
                {"role": "system", "content": st.session_state.step3_system},
                {"role": "user", "content": question},
            ]
            rounds = []
            tool_events = []
            final_text = None
            tools = st.session_state.step3_tool_schemas
            try:
                for round_i in range(1, max_rounds + 1):
                    sent = deepcopy(messages)
                    with st.spinner(f"Round {round_i}: calling model…"):
                        message, usage = chat_completion(
                            messages, tools=tools
                        )
                    rounds.append(
                        {
                            "sent": sent,
                            "response": message,
                            "usage": usage,
                        }
                    )
                    st.session_state.step3_rounds = list(rounds)
                    with viz_slot.container():
                        render_rounds_panel(
                            rounds,
                            "Run Step 3 to see each model request/response round.",
                        )

                    assistant_msg = assistant_to_history(message)
                    messages.append(assistant_msg)

                    tool_calls = message.get("tool_calls") or []
                    if not tool_calls:
                        final_text = message.get("content")
                        break

                    for tool_call in tool_calls:
                        name = tool_call["function"]["name"]
                        args = json.loads(tool_call["function"]["arguments"])
                        if name != "read_file":
                            result = (
                                f"Error: unknown tool '{name}'. "
                                "Only 'read_file' is supported."
                            )
                            ok = False
                        else:
                            ok, result = tool_read_file(**args)
                        tool_events.append(
                            {
                                "name": name,
                                "args": args,
                                "ok": ok,
                                "result": result,
                            }
                        )
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "content": result,
                            }
                        )
                else:
                    final_text = "(stopped: max rounds reached)"

                st.session_state.step3_rounds = rounds
                if rounds:
                    st.session_state.step3_last_sent = rounds[-1]["sent"]
                    st.session_state.step3_last_usage = rounds[-1]["usage"]
                    st.session_state.step3_last_response = rounds[-1]["response"]
                st.session_state.step3_last_reply = final_text
                st.session_state.step3_tool_events = tool_events
            except Exception as exc:
                st.error(str(exc))

        if st.session_state.step3_tool_events:
            st.subheader("Tools run")
            for t in st.session_state.step3_tool_events:
                status = "success" if t["ok"] else "failed / rejected"
                st.write(f"`{t['name']}({t['args']})` → **{status}**")
                with st.expander("Result", expanded=False):
                    st.code(t["result"][:4000], language="text")

        if st.session_state.step3_last_reply is not None:
            st.subheader("Reply")
            with st.chat_message("assistant"):
                st.markdown(st.session_state.step3_last_reply or "(empty content)")

    with viz_slot.container():
        render_rounds_panel(
            st.session_state.get("step3_rounds") or [],
            "Run Step 3 to see each model request/response round.",
        )


def _agent_execute_tool(tool_call: dict) -> str | None:
    """Run a non-command tool, or return None if command needs approval."""
    name = tool_call["function"]["name"]
    args = json.loads(tool_call["function"]["arguments"])

    if name == "run_command":
        return None

    if name == "list_files":
        return tool_list_files(**args)
    if name == "read_file":
        ok, result = tool_read_file(**args)
        return result if ok else result
    if name == "write_file":
        return tool_write_file(**args)
    return f"Error: unknown tool '{name}'."


def _agent_continue_after_tools(messages: list, tool_calls: list) -> str:
    """Execute remaining tools (no pending commands) and finish the inner loop."""
    for tool_call in tool_calls:
        name = tool_call["function"]["name"]
        args = json.loads(tool_call["function"]["arguments"])
        if name == "run_command":
            # Should have been handled via pending approval
            result = "The user declined to run this command."
        else:
            result = _agent_execute_tool(tool_call)
        messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": result,
            }
        )
        st.session_state.agent_log.append(
            {"type": "tool", "name": name, "args": args, "result": result}
        )
    return _agent_run_until_text_or_pending(messages)


def _agent_run_until_text_or_pending(messages: list, max_rounds: int = 10) -> str:
    """Inner agent loop. May set session_state.agent_pending for run_command."""
    for _ in range(max_rounds):
        sent = deepcopy(messages)
        message, usage = chat_completion(
            messages, tools=st.session_state.agent_tool_schemas
        )
        assistant_msg = assistant_to_history(message)
        messages.append(assistant_msg)
        st.session_state.agent_log.append(
            {
                "type": "model",
                "usage": usage,
                "assistant": assistant_msg,
            }
        )
        st.session_state.agent_last_sent = sent
        st.session_state.agent_last_response = message
        st.session_state.agent_rounds.append(
            {
                "sent": sent,
                "response": message,
                "usage": usage,
            }
        )

        tool_calls = message.get("tool_calls") or []
        if not tool_calls:
            return message.get("content") or ""

        # Process tools; pause on first run_command for approval
        for idx, tool_call in enumerate(tool_calls):
            name = tool_call["function"]["name"]
            args = json.loads(tool_call["function"]["arguments"])

            if name == "run_command":
                # Execute any tools before this one first
                for prev in tool_calls[:idx]:
                    prev_name = prev["function"]["name"]
                    prev_args = json.loads(prev["function"]["arguments"])
                    prev_result = _agent_execute_tool(prev)
                    if prev_result is None:
                        prev_result = "Error: nested run_command not supported."
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": prev["id"],
                            "content": prev_result,
                        }
                    )
                    st.session_state.agent_log.append(
                        {
                            "type": "tool",
                            "name": prev_name,
                            "args": prev_args,
                            "result": prev_result,
                        }
                    )

                st.session_state.agent_pending = {
                    "tool_call": tool_call,
                    "remaining": tool_calls[idx + 1 :],
                }
                return ""  # wait for UI approval

            result = _agent_execute_tool(tool_call)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": result,
                }
            )
            st.session_state.agent_log.append(
                {"type": "tool", "name": name, "args": args, "result": result}
            )

    return "(stopped: max agent rounds reached)"


def page_agent() -> None:
    st.header("Agent — model + tools + loop")
    st.markdown(
        "Interactive coding agent with `list_files`, `read_file`, `write_file`, "
        "and `run_command`. Shell commands require your approval (same idea as "
        "`agent.py`’s `[y/N]` prompt)."
    )

    col_sys, col_tools = st.columns(2)
    with col_sys:
        render_system_prompt_editor(
            key="agent_system",
            default=AGENT_SYSTEM,
            label="system prompt",
        )
    with col_tools:
        render_tool_schema_editor(
            text_key="agent_tool_schemas_text",
            schemas_key="agent_tool_schemas",
            default_schemas=AGENT_TOOL_SCHEMAS,
            note=(
                "Edit the `tools` array sent to the API. "
                "Execution still only supports: "
                "`list_files`, `read_file`, `write_file`, `run_command`."
            ),
        )
    if st.session_state.agent_messages and st.session_state.agent_messages[0].get("role") == "system":
        st.session_state.agent_messages[0]["content"] = st.session_state.agent_system

    if st.button("Reset agent conversation"):
        st.session_state.agent_messages = [
            {"role": "system", "content": st.session_state.agent_system}
        ]
        st.session_state.agent_log = []
        st.session_state.agent_last_sent = None
        st.session_state.agent_last_response = None
        st.session_state.agent_rounds = []
        st.session_state.agent_pending = None
        st.rerun()

    pending = st.session_state.agent_pending
    if pending:
        cmd = json.loads(pending["tool_call"]["function"]["arguments"]).get(
            "command", ""
        )
        st.warning(f"Model wants to run shell command:\n\n`{cmd}`")
        a1, a2 = st.columns(2)
        if a1.button("Approve and run", type="primary"):
            try:
                result = tool_run_command(cmd)
            except Exception as exc:
                result = f"Error: {exc}"
            st.session_state.agent_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": pending["tool_call"]["id"],
                    "content": result,
                }
            )
            st.session_state.agent_log.append(
                {
                    "type": "tool",
                    "name": "run_command",
                    "args": {"command": cmd},
                    "result": result,
                }
            )
            remaining = pending["remaining"]
            st.session_state.agent_pending = None
            try:
                with st.spinner("Continuing agent loop…"):
                    if remaining:
                        reply = _agent_continue_after_tools(
                            st.session_state.agent_messages, remaining
                        )
                    else:
                        reply = _agent_run_until_text_or_pending(
                            st.session_state.agent_messages
                        )
                if reply:
                    st.session_state.agent_log.append(
                        {"type": "final", "content": reply}
                    )
            except Exception as exc:
                st.error(str(exc))
            st.rerun()
        if a2.button("Decline"):
            st.session_state.agent_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": pending["tool_call"]["id"],
                    "content": "The user declined to run this command.",
                }
            )
            st.session_state.agent_log.append(
                {
                    "type": "tool",
                    "name": "run_command",
                    "args": {"command": cmd},
                    "result": "The user declined to run this command.",
                }
            )
            remaining = pending["remaining"]
            st.session_state.agent_pending = None
            try:
                with st.spinner("Continuing agent loop…"):
                    if remaining:
                        reply = _agent_continue_after_tools(
                            st.session_state.agent_messages, remaining
                        )
                    else:
                        reply = _agent_run_until_text_or_pending(
                            st.session_state.agent_messages
                        )
                if reply:
                    st.session_state.agent_log.append(
                        {"type": "final", "content": reply}
                    )
            except Exception as exc:
                st.error(str(exc))
            st.rerun()

    left, right = st.columns([1, 1])

    with left:
        st.subheader("Conversation")
        for msg in st.session_state.agent_messages:
            role = msg.get("role")
            if role == "system":
                continue
            if role == "tool":
                with st.chat_message("assistant"):
                    st.caption("tool result")
                    st.code(str(msg.get("content", ""))[:3000], language="text")
                continue
            with st.chat_message("user" if role == "user" else "assistant"):
                if msg.get("content"):
                    st.markdown(msg["content"])
                if msg.get("tool_calls"):
                    for tc in msg["tool_calls"]:
                        st.info(
                            f"tool request: `{tc['function']['name']}` "
                            f"{tc['function'].get('arguments', '')}"
                        )

        if not pending:
            prompt = st.chat_input("Ask the coding agent…")
            if prompt:
                st.session_state.agent_messages.append(
                    {"role": "user", "content": prompt}
                )
                try:
                    with st.spinner("Agent running…"):
                        reply = _agent_run_until_text_or_pending(
                            st.session_state.agent_messages
                        )
                    if reply:
                        st.session_state.agent_log.append(
                            {"type": "final", "content": reply}
                        )
                except Exception as exc:
                    st.error(str(exc))
                st.rerun()

    with right:
        render_rounds_panel(
            st.session_state.get("agent_rounds") or [],
            "Ask the agent something to see each model request/response round.",
        )


# ---------------------------------------------------------------------------
# App shell
# ---------------------------------------------------------------------------


def main() -> None:
    st.set_page_config(
        page_title="AI Agent Lab",
        page_icon="🤖",
        layout="wide",
    )
    init_state()

    with st.sidebar:
        st.title("Lab navigator")
        page = st.radio(
            "Section",
            ["Overview", "Step 1", "Step 2", "Step 3", "Agent"],
            label_visibility="collapsed",
        )
        st.divider()
        st.caption(f"Model: `{MODEL}`")
        st.caption(f"Work dir: `{WORK_DIR.name}`")
        key = get_api_key()
        if key:
            st.success("API key loaded")
        else:
            st.error("No API key")
            st.session_state.api_key_override = st.text_input(
                "Paste OPENROUTER_API_KEY",
                type="password",
            )

    if page == "Overview":
        page_overview()
    elif page == "Step 1":
        page_step1()
    elif page == "Step 2":
        page_step2()
    elif page == "Step 3":
        page_step3()
    else:
        page_agent()


if __name__ == "__main__":
    main()
