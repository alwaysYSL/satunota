// lib/schema/customer.ts
// Skema Zod untuk validasi data pelanggan.

import { z } from "zod"

export const customerSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().min(1),
  businessId: z.string().uuid(),
  nama: z.string().min(1, "Nama pelanggan wajib diisi").max(200),
  telepon: z.string().max(50).nullable().default(null),
  alamat: z.string().max(500).nullable().default(null),
  email: z
    .string()
    .email("Format email tidak valid")
    .or(z.literal(""))
    .nullable()
    .default(null),
  catatan: z.string().max(1000).nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
})

export type CustomerInput = z.infer<typeof customerSchema>
