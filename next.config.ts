import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /** Vercel serverless: fs path to JSON is not statically traced; force-include the snapshot. */
  outputFileTracingIncludes: {
    "/api/summarize": ["./src/data/transparency-register.json"],
  },
};

export default nextConfig;
