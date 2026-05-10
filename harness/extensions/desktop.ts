import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function isMac(): boolean {
  return os.platform() === "darwin";
}

function isWindows(): boolean {
  return os.platform() === "win32";
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function psQuote(value: string): string {
  return value.replace(/'/g, "''");
}

function runPowerShell(script: string, timeout = 10000): Buffer {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
    { windowsHide: true, timeout }
  );
}

const sendKeysTokens = new Set([
  "ENTER",
  "TAB",
  "ESC",
  "ESCAPE",
  "BACKSPACE",
  "BS",
  "DELETE",
  "DEL",
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
  "HOME",
  "END",
  "PGUP",
  "PGDN",
]);

function escapeSendKeys(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\r") continue;
    if (char === "\n") {
      out += "{ENTER}";
      continue;
    }
    if (char === "{") {
      const close = text.indexOf("}", i + 1);
      if (close !== -1) {
        const token = text.slice(i + 1, close).toUpperCase();
        if (sendKeysTokens.has(token)) {
          out += `{${token}}`;
          i = close;
          continue;
        }
      }
      out += "{{}";
      continue;
    }
    if (char === "}") {
      out += "{}}";
      continue;
    }
    if ("+^%~()[]".includes(char)) {
      out += `{${char}}`;
      continue;
    }
    out += char;
  }
  return out;
}

function splitArgs(args?: string): string[] {
  if (!args || !args.trim()) return [];
  return args.trim().split(/\s+/).filter(Boolean);
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "screenshot",
    label: "Take Screenshot",
    description: "Take a screenshot of the current screen and save it to a file. Returns the file path.",
    promptSnippet: "Use screenshot to see what is on screen before clicking or typing.",
    promptGuidelines: ["Always take a screenshot before clicking to understand the current screen state."],
    parameters: Type.Object({}),
    async execute() {
      const screenshotDir = path.join(os.homedir(), ".resonant", "screenshots");
      ensureDir(screenshotDir);
      const filename = `screen_${Date.now()}.png`;
      const filepath = path.join(screenshotDir, filename);

      try {
        if (isMac()) {
          execFileSync("screencapture", ["-x", filepath], { timeout: 10000 });
        } else if (isWindows()) {
          runPowerShell(`
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $path = '${psQuote(filepath)}'
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen
            $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
            $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
            $g.Dispose()
            $bmp.Dispose()
          `);
        } else {
          throw new Error("Screenshot currently supports Windows and macOS.");
        }

        return {
          content: [{ type: "text", text: `Screenshot saved to: ${filepath}` }],
          details: { path: filepath, filename },
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error taking screenshot: ${e.message}` }] };
      }
    },
  });

  pi.registerTool({
    name: "click",
    label: "Click Screen Coordinates",
    description: "Click at specific screen coordinates. Always take a screenshot first to find the right coordinates.",
    promptSnippet: "Use click to interact with UI elements on screen.",
    promptGuidelines: ["Always screenshot before clicking to find the right coordinates."],
    parameters: Type.Object({
      x: Type.Number({ description: "X coordinate from top-left of screen" }),
      y: Type.Number({ description: "Y coordinate from top-left of screen" }),
      button: Type.Optional(Type.String({ description: "Mouse button: left, right, or double" })),
    }),
    async execute(toolCallId, params) {
      const button = String(params.button || "left").toLowerCase();
      if (!["left", "right", "double"].includes(button)) {
        return { content: [{ type: "text", text: "Error: button must be left, right, or double" }] };
      }
      if (typeof params.x !== "number" || typeof params.y !== "number") {
        return { content: [{ type: "text", text: "Error: x and y must be numbers" }] };
      }
      if (params.x < 0 || params.y < 0 || params.x > 7680 || params.y > 4320) {
        return { content: [{ type: "text", text: "Error: Coordinates out of range (0-7680 x, 0-4320 y)" }] };
      }

      try {
        if (isMac()) {
          const clickArg =
            button === "right" ? `rc:${params.x},${params.y}` :
            button === "double" ? `dc:${params.x},${params.y}` :
            `c:${params.x},${params.y}`;
          execFileSync("cliclick", [clickArg], { timeout: 10000 });
        } else if (isWindows()) {
          const down = button === "right" ? 0x0008 : 0x0002;
          const up = button === "right" ? 0x0010 : 0x0004;
          const secondClick = button === "double"
            ? `
              Start-Sleep -Milliseconds 100
              [Win32]::mouse_event(${down}, 0, 0, 0, [IntPtr]::Zero)
              [Win32]::mouse_event(${up}, 0, 0, 0, [IntPtr]::Zero)
            `
            : "";
          runPowerShell(`
            Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, IntPtr dwExtraInfo); }'
            [Win32]::SetCursorPos(${Math.round(params.x)}, ${Math.round(params.y)}) | Out-Null
            Start-Sleep -Milliseconds 100
            [Win32]::mouse_event(${down}, 0, 0, 0, [IntPtr]::Zero)
            [Win32]::mouse_event(${up}, 0, 0, 0, [IntPtr]::Zero)
            ${secondClick}
          `);
        } else {
          throw new Error("Click currently supports Windows and macOS.");
        }

        return {
          content: [{ type: "text", text: `Clicked at (${params.x}, ${params.y}) with ${button} button` }],
          details: { x: params.x, y: params.y, button },
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error clicking: ${e.message}` }] };
      }
    },
  });

  pi.registerTool({
    name: "type_text",
    label: "Type Text",
    description: "Type text at the current cursor position. Special keys: {ENTER}, {TAB}, {ESC}, {BACKSPACE}.",
    promptSnippet: "Use type_text to enter text into focused input fields.",
    promptGuidelines: ["For longer text, use bash to write to a file instead of typing character by character."],
    parameters: Type.Object({
      text: Type.String({ description: "Text to type" }),
    }),
    async execute(toolCallId, params) {
      if (!params.text || params.text.length === 0) {
        return { content: [{ type: "text", text: "Error: Empty text" }] };
      }

      try {
        if (isMac()) {
          const tmp = path.join(os.tmpdir(), `resonant_type_${Date.now()}.txt`);
          fs.writeFileSync(tmp, params.text, "utf8");
          try {
            execFileSync(
              "osascript",
              [
                "-e",
                `set theText to read POSIX file "${tmp.replace(/"/g, '\\"')}"`,
                "-e",
                'tell application "System Events" to keystroke theText',
              ],
              { timeout: 30000 }
            );
          } finally {
            try { fs.unlinkSync(tmp); } catch (_) {}
          }
        } else if (isWindows()) {
          const escaped = psQuote(escapeSendKeys(params.text));
          runPowerShell(`
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait('${escaped}')
          `, 30000);
        } else {
          throw new Error("Typing currently supports Windows and macOS.");
        }

        return {
          content: [{ type: "text", text: `Typed ${params.text.length} characters` }],
          details: { length: params.text.length },
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error typing: ${e.message}` }] };
      }
    },
  });

  pi.registerTool({
    name: "run_app",
    label: "Launch Application",
    description: "Launch an application by app name or executable path.",
    promptSnippet: "Use run_app to open applications like Chrome, Safari, Notepad, Finder, Explorer, or Terminal.",
    promptGuidelines: ["Use the OS skill for common app names and paths."],
    parameters: Type.Object({
      app_path: Type.String({ description: "Application name or executable path" }),
      args: Type.Optional(Type.String({ description: "Optional command line arguments" })),
    }),
    async execute(toolCallId, params) {
      if (!params.app_path || /[\0\r\n]/.test(params.app_path)) {
        return { content: [{ type: "text", text: `Error: Invalid application path: ${params.app_path}` }] };
      }

      try {
        if (isMac()) {
          const openArgs = params.app_path.includes("/") ? [params.app_path] : ["-a", params.app_path];
          const args = splitArgs(params.args);
          if (args.length > 0) openArgs.push("--args", ...args);
          execFileSync("open", openArgs, { timeout: 10000 });
        } else if (isWindows()) {
          runPowerShell(`
            $app = '${psQuote(params.app_path)}'
            $args = '${psQuote(params.args || "")}'
            if ($args.Length -gt 0) {
              Start-Process -FilePath $app -ArgumentList $args
            } else {
              Start-Process -FilePath $app
            }
          `);
        } else {
          const args = splitArgs(params.args);
          execFileSync(params.app_path, args, { timeout: 10000 });
        }

        return {
          content: [{ type: "text", text: `Launched: ${params.app_path}${params.args ? ` ${params.args}` : ""}` }],
          details: { path: params.app_path, args: params.args || "" },
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error launching ${params.app_path}: ${e.message}` }] };
      }
    },
  });
}
