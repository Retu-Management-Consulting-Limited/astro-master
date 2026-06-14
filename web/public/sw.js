// Molly service worker — "fresh when online" shell.
//
// Staleness fix: the ONLY things served cache-first are Next's content-hashed
// immutable assets (/_next/static/*) — their filenames change every build, so
// cache-first there is both fast and never stale. EVERYTHING else (HTML
// navigations + other GETs) is network-first, falling back to cache only when
// offline. So an online (installed) PWA always shows the latest deploy.
//
// Bump CACHE on any breaking change to purge old entries on activate.
const CACHE = "molly-v2";
const PRECACHE = ["/offline.html", "/icon.svg"];

const isImmutable = (url) => url.pathname.startsWith("/_next/static/");

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function networkFirst(req, offlineFallback) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() =>
      caches.match(req).then((m) => m || (offlineFallback ? caches.match(offlineFallback) : undefined)),
    );
}

function cacheFirst(req) {
  return caches.match(req).then(
    (m) =>
      m ||
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(req, "/offline.html"));
    return;
  }
  if (isImmutable(url)) {
    e.respondWith(cacheFirst(req));
    return;
  }
  // API, RSC payloads, dynamic assets → always try the network first.
  e.respondWith(networkFirst(req));
});

// ---- Web Push ----
self.addEventListener("push", (e) => {
  let data = { title: "Molly", body: "今天有句话，我想单独跟你说 →", url: "/today" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {
    /* keep defaults */
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/today";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
