export const MODEL = "deepseek/deepseek-v4-flash-0731";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const SYSTEM_ALICE =
  "You are Alice, a helpful assistant. First explain who you are and then answer the user's question.";

export const STEP3_SYSTEM_DEFAULT =
  "You are a helpful assistant with a read_file tool. Use the tool when you need file contents, then answer briefly.";

export const AGENT_SYSTEM = `You are a coding agent running in the user's workspace.
If a tools list is provided, use only those tools to complete the task, then briefly summarize what you did.
If no tools are provided, answer in ordinary text only. Do not invent tool markup, XML, or pretend a command ran.
The working directory is the project folder.`;

export const STEP3_TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a text file and return its contents.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path of the file to read",
          },
        },
        required: ["path"],
      },
    },
  },
];

export const AGENT_TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List the files in a directory. Folders end with /.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory to list, e.g. '.'",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a text file and return its contents.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path of the file to read",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a text file with the given content.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path of the file to write",
          },
          content: {
            type: "string",
            description: "Full contents of the file",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command and return its output. The user approves it first.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to run",
          },
        },
        required: ["command"],
      },
    },
  },
];
