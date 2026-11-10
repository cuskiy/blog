import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";

import { build, dist } from "./build.ts";

const htmlType = "text/html; charset=utf-8";

const mimeTypes: Readonly<Record<string, string>> = {
  ".html": htmlType,
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".xml": "application/atom+xml; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mid": "audio/midi",
  ".sf3": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

async function notFound(response: ServerResponse): Promise<void> {
  try {
    const page = await readFile(join(dist, "404.html"));
    response.writeHead(404, { "content-type": htmlType });
    response.end(page);
  } catch {
    response.writeHead(404, { "content-type": htmlType });
    response.end("<h1>404</h1>\n");
  }
}

function requestPath(url: string | undefined): string | undefined {
  try {
    return decodeURIComponent(new URL(url ?? "/", "http://localhost").pathname);
  } catch {
    return undefined;
  }
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const path = requestPath(request.url);
  if (path === undefined) {
    await notFound(response);
    return;
  }

  if (!path.endsWith("/") && extname(path) === "") {
    response.writeHead(301, { location: `${path}/` });
    response.end();
    return;
  }

  const file = resolve(dist, `.${path.endsWith("/") ? `${path}index.html` : path}`);
  if (!file.startsWith(dist + sep)) {
    await notFound(response);
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": mimeTypes[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    await notFound(response);
  }
}

export async function serve(port: number): Promise<void> {
  // a local run publishes itself, so the build has an origin without one being configured
  process.env.SITE_URL ??= `http://localhost:${port}`;

  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (response.headersSent) {
        response.destroy();
      } else {
        void notFound(response);
      }
    });
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  }).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "EADDRINUSE") {
      throw new Error(`port ${port} is already in use; stop the other server first`);
    }
    throw error;
  });

  const count = await build();
  console.log(`built ${count} posts, serving http://localhost:${port}/`);
}
