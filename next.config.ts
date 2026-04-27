import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the production Docker image (output traces to .next/standalone)
  output: "standalone",
};

export default nextConfig;
