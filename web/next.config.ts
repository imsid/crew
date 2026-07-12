import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle so the Docker image ships only
  // .next/standalone + .next/static instead of node_modules.
  output: "standalone",
};

export default nextConfig;
