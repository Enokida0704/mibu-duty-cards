const CACHE_NAME = "mibu-duty-cards-v92";
const CACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./share-native.js",
  "./firebase-config.js",
  "./firebase-leaderboard.js",
  "./manifest.webmanifest",
  "./assets/hachifuku-shop-banner.jpg",
  "./assets/cards/category-sprite.png",
  "./assets/officers/okita.svg",
  "./assets/officers/hijikata.svg",
  "./assets/officers/saito.svg",
  "./assets/officers/nagakura.svg",
  "./assets/officers/kondo.svg",
  "./assets/officers/harada.svg",
  "./assets/officers/yamanami.svg",
  "./assets/officers/inoue.svg",
  "./assets/officers/todo.svg",
  "./assets/officers/serizawa.svg",
  "./assets/officers/takeda.svg",
  "./assets/officers/ito.svg",
  "./assets/icon.svg",
  "./assets/maskable-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const shouldPreferNetwork = event.request.mode === "navigate"
    || ["document", "script", "style"].includes(event.request.destination)
    || requestUrl.pathname.endsWith(".html")
    || requestUrl.pathname.endsWith(".js")
    || requestUrl.pathname.endsWith(".css");

  if (shouldPreferNetwork) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
