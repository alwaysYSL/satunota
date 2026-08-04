// public/sw.js
// Service Worker manual untuk SATUNOTA offline-first PWA.
// CACHE_NAME v2 dengan strategi Network-First untuk navigasi & Cache-First untuk /_next/static/

const CACHE_NAME = "satunota-v2"
const APP_SHELL = [
  "/",
  "/dokumen/riwayat",
  "/favicon.ico",
  "/offline.html",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] Cache addAll warning:", err)
      })
    }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Abaikan WebSocket / HMR dev server requests
  if (url.pathname.startsWith("/_next/webpack-hmr")) return

  // 1. MASALAH 6: Strategi Navigasi (HTML Pages): NETWORK-FIRST
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // Jika offline, coba kembalikan dari cache atau fallback ke /offline.html
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse
            return caches.match("/offline.html").then((offlinePage) => {
              return (
                offlinePage ||
                new Response("Offline", {
                  status: 503,
                  statusText: "Offline",
                })
              )
            })
          })
        }),
    )
    return
  }

  // 2. MASALAH 6: Aset statis ber-hash Next.js (_next/static): CACHE-FIRST
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
      }),
    )
    return
  }

  // 3. Permintaan GET lainnya: NETWORK-FIRST dengan fallback ke Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          return new Response("Offline", { status: 503, statusText: "Offline" })
        })
      }),
  )
})
