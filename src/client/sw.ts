import { cacheName } from "./cache.ts";

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

// scripts stay uncached: a cache-first script keeps an old bundle running after a change
function cacheable(url: URL): boolean {
  return url.pathname.startsWith("/assets/soundfont/") || url.pathname.startsWith("/assets/midi/");
}

worker.addEventListener("install", () => {
  void worker.skipWaiting();
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !cacheable(url)) {
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
