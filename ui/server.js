const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PiRpcSession, homePath, piAvailable, readJson } = require("../bridge/pi-rpc");

const HOST = process.env.RESONANT_UI_HOST || "127.0.0.1";
const PORT = Number(process.env.RESONANT_UI_PORT || 47891);
const PUBLIC_DIR = path.join(__dirname, "public");

const auth = readJson(homePath("agent", "auth.json"), {});
const session = new PiRpcSession({
  sessionDir: homePath("agent", "sessions", "ui"),
  provider: auth.provider,
  model: auth.model,
});

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = path.resolve(PUBLIC_DIR, relative);
  const publicRelative = path.relative(PUBLIC_DIR, file);
  const insidePublic = file === PUBLIC_DIR || (publicRelative && !publicRelative.startsWith("..") && !path.isAbsolute(publicRelative));
  if (!insidePublic) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  res.writeHead(200, {
    "Content-Type": contentTypeFor(file),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:",
  });
  fs.createReadStream(file).pipe(res);
}

async function handleChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "Expected JSON body." });
    return;
  }

  const message = String(payload.message || "").trim();
  if (!message) {
    sendJson(res, 400, { error: "Message is empty." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Connection": "keep-alive",
  });

  const write = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const text = await session.prompt(message, {
      onText: (delta) => write({ type: "delta", delta }),
      onTool: ({ phase, event }) => write({ type: "tool", phase, name: event.toolName || event.name || "" }),
      onEvent: (event) => {
        if (event.type === "notice") write(event);
      },
    });
    write({ type: "done", text });
  } catch (error) {
    write({ type: "error", error: error.message });
  } finally {
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === "GET" && url.pathname === "/api/status") {
    sendJson(res, 200, {
      ok: true,
      piAvailable: piAvailable(),
      provider: auth.provider || "",
      model: auth.model || "",
      host: HOST,
      port: PORT,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    await handleChat(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`RESONANT Agent UI listening on ${url}`);
  if (process.env.RESONANT_UI_OPEN !== "0") {
    const { spawn } = require("node:child_process");
    const opener =
      process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : process.platform === "darwin"
          ? ["open", [url]]
          : ["xdg-open", [url]];
    try {
      spawn(opener[0], opener[1], { detached: true, stdio: "ignore" }).unref();
    } catch {
      console.log(`Open ${url} in your browser.`);
    }
  }
});

process.on("SIGINT", () => {
  session.stop();
  server.close(() => process.exit(0));
});
