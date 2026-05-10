import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const HOME_DIR = process.env.RESONANT_HOME || path.join(os.homedir(), ".resonant");
const MEMORIES_DIR = path.join(HOME_DIR, "agent", "memories");

function ensureMemoriesDir(): string {
  if (!fs.existsSync(MEMORIES_DIR)) {
    fs.mkdirSync(MEMORIES_DIR, { recursive: true });
  }
  return MEMORIES_DIR;
}

function safeTopic(topic?: string): string {
  return (topic || "general").toLowerCase().replace(/[^a-z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "general";
}

function searchMemories(dir: string, files: string[], query: string): string[] {
  const lower = query.toLowerCase();
  const matches: string[] = [];

  for (const file of files) {
    const filepath = path.join(dir, file);
    const lines = fs.readFileSync(filepath, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lower)) {
        matches.push(`${file}:${i + 1}:${lines[i]}`);
      }
    }
  }

  return matches;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "memorize",
    label: "Save a Memory",
    description:
      "Save a fact or piece of information to long-term memory. Memories are stored as markdown files in ~/.resonant/agent/memories/ and persist across sessions.",
    promptSnippet: "Use memorize to save important facts, decisions, or context for future sessions.",
    promptGuidelines: [
      "Memorize important facts about the user, project decisions, preferences, and key information.",
      "Each memory is a markdown file. Be clear so future-you can understand it.",
      "Use meaningful topics so memories are easy to find and organize.",
    ],
    parameters: Type.Object({
      fact: Type.String({ description: "The fact or information to remember" }),
      topic: Type.Optional(Type.String({ description: "Topic/category for the memory, used in the filename" })),
    }),
    async execute(toolCallId, params) {
      if (!params.fact || params.fact.trim().length === 0) {
        return { content: [{ type: "text", text: "Error: Empty fact. Nothing to memorize." }] };
      }

      const dir = ensureMemoriesDir();
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toISOString().replace("T", " ").replace(/\.\d+Z/, " UTC");
      const topic = safeTopic(params.topic);
      const filename = `${dateStr}_${topic}.md`;
      const filepath = path.join(dir, filename);
      const entry = `\n## ${timeStr}\n\n${params.fact.trim()}\n`;

      if (fs.existsSync(filepath)) {
        fs.appendFileSync(filepath, entry, "utf8");
      } else {
        fs.writeFileSync(filepath, `# Memory: ${topic}\n\nSaved by RESONANT on ${timeStr}\n${entry}`, "utf8");
      }

      const allFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

      return {
        content: [
          {
            type: "text",
            text: `Memorized to ${filename}\n\n"${params.fact.trim()}"\n\nTotal memory files: ${allFiles.length}`,
          },
        ],
        details: { filename, topic, date: dateStr, totalFiles: allFiles.length },
      };
    },
  });

  pi.registerTool({
    name: "recall",
    label: "Search Memories",
    description:
      "Search long-term memories by keyword or phrase. Searches all memory files in ~/.resonant/agent/memories/ and returns matching lines with file names.",
    promptSnippet: "Use recall to find previously saved memories before asking the user something you might already know.",
    promptGuidelines: [
      "Try recall before asking the user a question you may already have saved.",
      "Use specific search terms for better results.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search term or phrase to look for in memories" }),
    }),
    async execute(toolCallId, params) {
      if (!params.query || params.query.trim().length === 0) {
        return { content: [{ type: "text", text: "Error: Empty search query." }] };
      }

      const dir = ensureMemoriesDir();
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

      if (files.length === 0) {
        return { content: [{ type: "text", text: "No memories stored yet. Use memorize to save your first memory." }] };
      }

      const query = params.query.trim();
      const matches = searchMemories(dir, files, query);

      if (matches.length === 0) {
        const fileList = files.map((f) => `  - ${f}`).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `No memories matching "${query}" found.\n\nAvailable memory files:\n${fileList}`,
            },
          ],
          details: { query, resultCount: 0, totalFiles: files.length },
        };
      }

      const maxLines = 50;
      const truncated = matches.length > maxLines;
      const displayLines = truncated ? matches.slice(0, maxLines) : matches;
      const result = displayLines.join("\n") + (truncated ? `\n... and ${matches.length - maxLines} more matches` : "");

      return {
        content: [{ type: "text", text: result }],
        details: { query, matchCount: matches.length, totalFiles: files.length },
      };
    },
  });
}
