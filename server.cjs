// CommonJS wrapper so cPanel LiteSpeed Node can require() this file
// The actual app is ESM, so we use dynamic import()

const path = require("path");
const port = process.env.PORT || 3000;

async function start() {
  const { createRequestHandler } = await import("@remix-run/node");
  const { createServer } = await import("node:http");
  const build = await import("./build/server/index.mjs");

  const handler = createRequestHandler(build, process.env.NODE_ENV);

  const server = createServer(async (req, res) => {
    try {
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
