/**
 * Ngrok free exige header ou cookie para não devolver HTML de aviso nos chunks /_next/*.
 * Este service worker adiciona o header em todas as requisições GET do mesmo origin.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const headers = new Headers(request.headers);
  headers.set("ngrok-skip-browser-warning", "1");

  event.respondWith(
    fetch(
      new Request(request, {
        headers,
        credentials: "include",
        mode: request.mode,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer,
        integrity: request.integrity,
      })
    )
  );
});
