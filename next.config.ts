import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/pdf": ["./public/fonts/**"],
  },
}

export default nextConfig
