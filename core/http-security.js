function parsedHttpUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function isLoopbackHostname(value) {
  const hostname = normalizeHostname(value);
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function parseHostHeader(value) {
  const parsed = parsedHttpUrl(`http://${String(value || "").trim()}`);
  if (!parsed) return null;
  return {
    hostname: normalizeHostname(parsed.hostname),
    port: parsed.port || "80",
  };
}

function isAllowedHostHeader(value, options = {}) {
  const host = parseHostHeader(value);
  if (!host) return false;
  const expectedPort = String(options.port || "80");
  const boundHost = normalizeHostname(options.host || "127.0.0.1");
  if (host.port !== expectedPort) return false;
  return isLoopbackHostname(boundHost)
    ? isLoopbackHostname(host.hostname)
    : host.hostname === boundHost;
}

function isAllowedOrigin(value, options = {}) {
  if (!value) return true;
  const origin = parsedHttpUrl(value);
  if (!origin || origin.protocol !== "http:") return false;
  return isAllowedHostHeader(origin.host, options);
}

function requestSecurityError(req, options = {}) {
  if (!isAllowedHostHeader(req.headers.host, options)) {
    return {
      code: "INVALID_HOST",
      message: "The local Host header was rejected.",
    };
  }
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    !isAllowedOrigin(req.headers.origin, options)
  ) {
    return {
      code: "INVALID_ORIGIN",
      message: "The request origin was rejected.",
    };
  }
  return null;
}

module.exports = {
  isAllowedHostHeader,
  isAllowedOrigin,
  isLoopbackHostname,
  normalizeHostname,
  parseHostHeader,
  requestSecurityError,
};
