// lib/retention.test.ts
// Unit test murni untuk retensi tamu & cadangan otomatis mingguan (SRS §4.5).

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import "fake-indexeddb/auto"
import { db } from "./db/local"
import { tahapRetensi, ensureWeeklyBackup } from "./retention"
import { updateLastUserId } from "./db/owner"

describe("Retention & Weekly Backup (SRS 4.5)", () => {
  const now = "2026-08-05T12:00:00.000Z"
  const ownerId = "test-retention-owner"

  beforeEach(async () => {
    await db.delete()
    await db.open()
    await updateLastUserId(ownerId)
  })

  afterEach(async () => {
    await db.close()
  })

  it("1. tahapRetensi tepat pada ambang batas Tahap 1, 2, dan 3", () => {
    // 6 hari & 9 dokumen -> Tahap 0
    expect(
      tahapRetensi(
        { guestStartedAt: "2026-07-30T12:00:00.000Z", docCount: 9 },
        now,
      ),
    ).toBe(0)

    // 7 hari -> Tahap 1
    expect(
      tahapRetensi(
        { guestStartedAt: "2026-07-29T12:00:00.000Z", docCount: 0 },
        now,
      ),
    ).toBe(1)

    // 10 dokumen -> Tahap 1
    expect(
      tahapRetensi(
        { guestStartedAt: "2026-08-04T12:00:00.000Z", docCount: 10 },
        now,
      ),
    ).toBe(1)

    // 29 hari & 49 dokumen -> Tahap 1
    expect(
      tahapRetensi(
        { guestStartedAt: "2026-07-07T12:00:00.000Z", docCount: 49 },
        now,
      ),
    ).toBe(1)

    // 30 hari -> Tahap 2
    expect(
      tahapRetensi(
        { guestStartedAt: "2026-07-06T12:00:00.000Z", docCount: 0 },
        now,
      ),
    ).toBe(2)

    // 50 dokumen -> Tahap 2
    expect(
      tahapRetensi(
        { guestStartedAt: "2026-08-04T12:00:00.000Z", docCount: 50 },
        now,
      ),
    ).toBe(2)

    // 89 hari tidak dibuka -> Tahap 0/1/2 (tergantung started/docs)
    expect(
      tahapRetensi(
        {
          guestStartedAt: "2026-08-04T12:00:00.000Z",
          lastOpenedAt: "2026-05-08T12:00:00.000Z",
          docCount: 0,
        },
        now,
      ),
    ).toBe(0)

    // 90 hari tidak dibuka -> Tahap 3
    expect(
      tahapRetensi(
        {
          guestStartedAt: "2026-08-04T12:00:00.000Z",
          lastOpenedAt: "2026-05-07T12:00:00.000Z",
          docCount: 0,
        },
        now,
      ),
    ).toBe(3)
  })

  it("2. ensureWeeklyBackup membuat cadangan baru bila lastBackupAt >= 7 hari lalu", async () => {
    const eightDaysAgo = "2026-07-28T12:00:00.000Z"
    await db.meta.put({ key: "lastBackupAt", value: eightDaysAgo })

    const result = await ensureWeeklyBackup(now)
    expect(result).toBe(true)

    const updatedBackupAt = await db.meta.get("lastBackupAt")
    expect(updatedBackupAt?.value).toBe(now)

    const autoBackupJson = await db.meta.get("autoBackupJson")
    expect(autoBackupJson?.value).toBeDefined()
    expect(typeof autoBackupJson?.value).toBe("string")
  })

  it("3. ensureWeeklyBackup TIDAK membuat cadangan baru bila lastBackupAt < 7 hari lalu", async () => {
    const twoDaysAgo = "2026-08-03T12:00:00.000Z"
    await db.meta.put({ key: "lastBackupAt", value: twoDaysAgo })

    const result = await ensureWeeklyBackup(now)
    expect(result).toBe(false)

    const updatedBackupAt = await db.meta.get("lastBackupAt")
    expect(updatedBackupAt?.value).toBe(twoDaysAgo)
  })
})
