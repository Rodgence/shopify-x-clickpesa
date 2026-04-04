// CommonJS wrapper so cPanel LiteSpeed Node can require() this file
// The actual app is ESM, so we use dynamic import()

const path = require("path");
const port = process.env.PORT || 3000;

async function start() {
  const fs = require("fs");
  const venv = `/home/rodwayco/nodevenv/payments/20/lib/node_modules`;
  const { createRequestHandler } = await import(`${venv}/@remix-run/node/dist/index.js`);
  const { createServer } = await import("node:http");
  const build = await import("./build/server/index.mjs");

  const handler = createRequestHandler(build, process.env.NODE_ENV);

  const MIME_TYPES = {
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };

  const server = createServer(async (req, res) => {
    try {
      // Serve static files from build/client
      const url = new URL(req.url, `http://${req.headers.host}`);
      const staticFile = path.join(__dirname, "build", "client", url.pathname);
      if (url.pathname.startsWith("/assets/") || url.pathname === "/favicon.ico") {
        try {
          const data = fs.readFileSync(staticFile);
          const ext = path.extname(staticFile);
          res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.end(data);
          return;
        } catch (e) { /* fall through to Remix */ }
      }

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const request = new Request(`${protocol}://${host}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? new ReadableStream({
                start(controller) {
                  req.on("data", (chunk) => controller.enqueue(chunk));
                  req.on("end", () => controller.close());
                  req.on("error", (err) => controller.error(err));
                },
              })
            : undefined,
        duplex: "half",
      });

      const response = await handler(request);

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(value);
          await pump();
        };
        await pump();
      } else {
        res.end();
      }
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
