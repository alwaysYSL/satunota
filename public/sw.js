// public/sw.js
// Service Worker manual untuk SATUNOTA offline-first PWA.

const CACHE_NAME = "satunota-v1"
const APP_SHELL = [
  "/",
  "/dokumen/riwayat",
  "/favicon.ico",
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
  if (url.pathname.startsWith("/_next/webpack-hmr")) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse)
              })
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      return fetch(event.request)
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
          if (event.request.mode === "navigate") {
            return caches.match("/")
          }
          return new Response("Offline", { status: 503, statusText: "Offline" })
        })
    }),
  )
})
