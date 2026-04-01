import { createRequestHandler } from "@remix-run/node";
import { createServer } from "node:http";
import * as build from "./build/server/index.js";

const handler = createRequestHandler(build, process.env.NODE_ENV);

const port = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const request = new Request(`http://${req.headers.host}${req.url}`, {
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
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };
    await pump();
  } else {
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
