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

// ---------------------------
// ERROR HANDLING
// ---------------------------
proxy.on("error", (err, req, res: any) => {
  console.error("Proxy error:", err.message);

  if (res && !res.headersSent) {
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
// SERVER
// ---------------------------
const server = http.createServer(app);

// ---------------------------
// MANUAL WEBSOCKET HANDSHAKE
// ---------------------------
server.on("upgrade", (req, socket, head) => {
  try {
    // Send custom status text to client
    socket.write(
      "HTTP/1.1 101 Kiyotaka\r\n" +
      "Connection: Upgrade\r\n" +
      "Upgrade: websocket\r\n" +
      "\r\n"
    );

    console.log("\x1b[31m101 Kiyotaka\x1b[0m");

    // Forward to backend
    proxy.ws(req, socket, head, {
      target: TARGET
    });

  } catch (err: any) {
    console.error("Upgrade error:", err.message);
    socket.destroy();
  }
});

// ---------------------------
// HEARTBEAT LOG
// ---------------------------
setInterval(() => {
  server.getConnections((_, count) => {
    console.log(`Active connections: ${count}`);
  });
}, 30000);

// ---------------------------
// START
// ---------------------------
server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`SSH WS Proxy running on :${PORT} → ${TARGET}`);
});
