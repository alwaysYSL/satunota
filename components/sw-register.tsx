"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[SW] Registered with scope:", reg.scope)
          })
          .catch((err) => {
            console.warn("[SW] Registration failed:", err)
          })
      })
    }
  }, [])

  return null
}
