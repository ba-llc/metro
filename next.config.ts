import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: [
    "playwright-core",
    "@sparticuz/chromium",
    "@prisma/client",
    "bcryptjs",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Konva's node entry optionally requires the native "canvas" package,
      // which we never use — the editor is client-only.
      config.externals = [...(config.externals ?? []), { canvas: "commonjs canvas" }];
    }
    return config;
  },
};

export default nextConfig;
