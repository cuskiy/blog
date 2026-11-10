import { dataCache } from "./cache.ts";

// the webworker lib and the dom lib cannot share one program, so this scope is declared by hand
interface WorkerEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
  waitUntil(work: Promise<unknown>): void;
}

interface WorkerScope {
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: "install" | "activate" | "fetch", listener: (event: WorkerEvent) => void): void;
}

const worker = self as unknown as WorkerScope;

declare const __ASSET_VERSION__: string;

// Hashed files may be cached forever, so they live in a cache stamped with the build: a deploy
// retires the previous one whole. The soundfont and the tracks carry no hash and are large, so
// they keep a cache of their own and survive that swap.
const assetCache = `clog-assets-${__ASSET_VERSION__}`;

function cacheFor(url: URL): string | undefined {
  if (url.pathname.startsWith("/assets/soundfont/") || url.pathname.startsWith("/assets/midi/")) {
    return dataCache;
  }
  // the search index is neither hashed nor stable, so it stays out
  if (url.pathname.startsWith("/assets/") && !url.pathname.endsWith("/search.json")) {
    return assetCache;
  }
  return undefined;
}

worker.addEventListener("install", () => {
  void worker.skipWaiting();
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== assetCache && key !== dataCache).map((key) => caches.delete(key))),
      )
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener("fetch", (event) => {
  const cacheName = event.request.method === "GET" ? cacheFor(new URL(event.request.url)) : undefined;
  if (cacheName === undefined) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      const hit = await cache.match(event.request);
      if (hit !== undefined) {
        return hit;
      }

      const response = await fetch(event.request);
      if (response.ok) {
        event.waitUntil(cache.put(event.request, response.clone()));
      }
      return response;
    })(),
  );
});
