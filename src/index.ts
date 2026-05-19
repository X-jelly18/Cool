import express from "express";
import http from "http";
import httpProxy from "http-proxy";

const app = express();
const PORT = process.env.PORT || 8080;

const TARGET = "http://uk.sshws.net";

const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true,
  ws: true,
  secure: false, // http target, so false is safer
  xfwd: true
});

// ---------------------------
// KEEP ALIVE
// ---------------------------
proxy.on("proxyReqWs", (proxyReq) => {
  proxyReq.setHeader("Connection", "keep-alive");
});

// ---------------------------
// WS OPEN EVENT
// ---------------------------
proxy.on("open", () => {
  // Red colored terminal output
  console.log("\x1b[31m101 Kiyotaka\x1b[0m");
});

// ---------------------------
// ERROR HANDLING
// ---------------------------
proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err.message);

  if (res && "writeHead" in res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway");
  }
});

// ---------------------------
// HTTP PASSTHROUGH
// ---------------------------
app.use((req, res) => {
  proxy.web(req, res, { target: TARGET }, (err) => {
    console.error("HTTP proxy error:", err.message);

    if (!res.headersSent) {
      res.status(502).send("Bad Gateway");
    }
  });
});

// ---------------------------
// CREATE RAW SERVER
// ---------------------------
const server = http.createServer(app);

// ---------------------------
// WEB SOCKET HANDLING
// ---------------------------
server.on("upgrade", (req, socket, head) => {
  req.headers["connection"] = "Upgrade";

  socket.setKeepAlive(true, 30000);
  socket.setTimeout(0);

  proxy.ws(req, socket, head, {
    target: TARGET
  });
});

// ---------------------------
// HEARTBEAT LOGGING
// ---------------------------
setInterval(() => {
  server.getConnections((_, count) => {
    console.log(`Active connections: ${count}`);
  });
}, 30000);

// ---------------------------
// START SERVER
// ---------------------------
server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`SSH WS Proxy running on :${PORT} → ${TARGET}`);
});