const SHELL_CACHE = "nutrisight-shell-v7";
const STATIC_CACHE = "nutrisight-static-v7";
const RUNTIME_CACHE = "nutrisight-runtime-v7";

const PRECACHE_STATIC = [
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/logo-leaf-eye.png",
];

const APP_SHELL_PATHS = [
  "/dashboard",
  "/meals",
  "/meals/new",
  "/meals/offline",
  "/coach",
  "/stats",
  "/settings",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(PRECACHE_STATIC);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !keep.has(key) && key.startsWith("nutrisight-"))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/motifs/") ||
    pathname.startsWith("/_next/static/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/offline.html"
  );
}

function isAppNavigation(request, url) {
  return (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API / uploads / RSC payloads as the primary strategy
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.includes("_rsc") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isAppNavigation(request, url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await networkFirst(request, SHELL_CACHE);
          return response;
        } catch {
          const shell =
            (await caches.match(url.pathname)) ||
            (await caches.match("/offline")) ||
            (await caches.match("/offline.html"));
          if (shell) return shell;
          return new Response(
            "<!doctype html><title>Offline</title><p>Offline – bitte später erneut öffnen.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
    return;
  }

  // Soft-nav / JS chunks already covered; other same-origin GETs: network with cache fallback
  if (APP_SHELL_PATHS.includes(url.pathname)) {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(async () => {
        return (
          (await caches.match(request)) ||
          (await caches.match("/offline.html"))
        );
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "NutriSight";
  const options = {
    body: data.body || "Zeit für einen Check-in.",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    image: data.image,
    tag: data.tag || "nutrisight",
    renotify: true,
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(target);
            }
            return client;
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
