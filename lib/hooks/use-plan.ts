// lib/hooks/use-plan.ts
// Hook untuk membaca paket bisnis aktif dari Dexie via useLiveQuery.

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/local"
import { type Plan } from "@/lib/entitlements"

export function usePlan(): Plan {
  const plan = useLiveQuery(async () => {
    const biz = await db.businesses.toCollection().first()
    return (biz?.plan as Plan) || "guest"
  }, [])

  return plan || "guest"
}
