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
  secure: false,
  xfwd: true
});

// Keep alive header
proxy.on("proxyReqWs", (proxyReq) => {
  proxyReq.setHeader("Connection", "keep-alive");
});

// Red log when websocket opens
proxy.on("open", () => {
  console.log("\x1b[31m101 Kiyotaka\x1b[0m");
});

// Error handling
proxy.on("error", (err, req, res: any) => {
  console.error("Proxy error:", err.message);

  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway");
  }
});

// HTTP passthrough
app.use((req, res) => {
  proxy.web(req, res, { target: TARGET }, (err) => {
    console.error("HTTP proxy error:", err.message);

    if (!res.headersSent) {
      res.status(502).send("Bad Gateway");
    }
  });
});

const server = http.createServer(app);

// WebSocket handling
server.on("upgrade", (req, socket, head) => {
  req.headers["connection"] = "Upgrade";

  proxy.ws(req, socket, head, {
    target: TARGET
  });
});

// heartbeat logging
setInterval(() => {
  server.getConnections((_, count) => {
    console.log(`Active connections: ${count}`);
  });
}, 30000);

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`SSH WS Proxy running on :${PORT} → ${TARGET}`);
});
