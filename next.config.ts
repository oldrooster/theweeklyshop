import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@anthropic-ai/sdk", "@google-cloud/vertexai"],
};

export default nextConfig;
