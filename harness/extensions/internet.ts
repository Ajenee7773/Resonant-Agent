import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function validateUrl(url: string): boolean {
  return /^https?:\/\/[^\s"'<>]+$/i.test(url);
}

function curl(args: string[]): string {
  return execFileSync("curl", args, {
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHtml(value: string): string {
  return stripHtml(value).trim();
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "browse",
    label: "Browse Web Page",
    description: "Read the text content of a web page. Returns clean page text.",
    promptSnippet: "Use browse to read web pages, documentation, articles, and API endpoints.",
    promptGuidelines: ["Check URLs before browsing, then save important findings to files or memory."],
    parameters: Type.Object({
      url: Type.String({ description: "The URL to read" }),
    }),
    async execute(toolCallId, params) {
      if (!validateUrl(params.url)) {
        return { content: [{ type: "text", text: `Error: Invalid URL: ${params.url}` }] };
      }

      try {
        const html = curl(["-sL", "--compressed", "--max-time", "30", params.url]);
        const text = stripHtml(html).substring(0, 50000);
        return { content: [{ type: "text", text }], details: { url: params.url } };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error fetching ${params.url}: ${e.message}` }] };
      }
    },
  });

  pi.registerTool({
    name: "search",
    label: "Search the Web",
    description: "Search the web using DuckDuckGo. Returns up to 10 results with titles, URLs, and snippets.",
    promptSnippet: "Use search to find information on the web.",
    promptGuidelines: ["Search first, then browse specific results for deeper information."],
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
    }),
    async execute(toolCallId, params) {
      if (!params.query || params.query.trim().length === 0) {
        return { content: [{ type: "text", text: "Error: Empty search query" }] };
      }

      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(params.query)}`;
        const html = curl([
          "-sL",
          "--compressed",
          "--max-time",
          "30",
          "-A",
          "Mozilla/5.0",
          url,
        ]);

        const results: Array<{ title: string; url: string; snippet: string }> = [];
        const resultRegex =
          /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
          results.push({
            url: match[1],
            title: cleanHtml(match[2]),
            snippet: cleanHtml(match[3]),
          });
        }

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No results found for "${params.query}".` }],
            details: { query: params.query, resultCount: 0 },
          };
        }

        const text = results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join("\n\n");
        return { content: [{ type: "text", text }], details: { query: params.query, resultCount: results.length } };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error searching for "${params.query}": ${e.message}` }] };
      }
    },
  });

  pi.registerTool({
    name: "web_request",
    label: "Make HTTP Request",
    description: "Make an HTTP request to any URL. Supports GET, POST, PUT, DELETE methods.",
    promptSnippet: "Use web_request for API calls, REST endpoints, and direct URL requests.",
    promptGuidelines: ["Use this for structured API work. Save important responses to files."],
    parameters: Type.Object({
      url: Type.String({ description: "The URL to request" }),
      method: Type.Optional(Type.String({ description: "HTTP method: GET, POST, PUT, DELETE", default: "GET" })),
      headers: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Request headers" })),
      body: Type.Optional(Type.String({ description: "Request body for POST or PUT" })),
    }),
    async execute(toolCallId, params) {
      if (!validateUrl(params.url)) {
        return { content: [{ type: "text", text: `Error: Invalid URL: ${params.url}` }] };
      }

      const method = (params.method || "GET").toUpperCase();
      if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
        return { content: [{ type: "text", text: `Error: Invalid method: ${method}` }] };
      }

      let tmpFile: string | undefined;
      try {
        const args = [
          "-sL",
          "--compressed",
          "--max-time",
          "30",
          "-X",
          method,
          "-A",
          "Mozilla/5.0",
        ];

        if (params.headers) {
          for (const [key, value] of Object.entries(params.headers)) {
            args.push("-H", `${key}: ${value}`);
          }
        }

        if (params.body) {
          tmpFile = path.join(os.tmpdir(), `resonant_req_${Date.now()}.txt`);
          fs.writeFileSync(tmpFile, params.body, "utf8");
          args.push("--data-binary", `@${tmpFile}`);
        }

        args.push(params.url);
        const result = curl(args).substring(0, 50000);
        return { content: [{ type: "text", text: result }], details: { url: params.url, method, status: "ok" } };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error requesting ${params.url}: ${e.message}` }] };
      } finally {
        if (tmpFile) {
          try { fs.unlinkSync(tmpFile); } catch (_) {}
        }
      }
    },
  });
}
