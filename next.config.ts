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
  async redirects() {
    return [
      {
        source: "/p/:org/:property/site",
        destination: "/properties/:property/brochure",
        permanent: true,
      },
      {
        source: "/p/:org/:property/brochure",
        destination: "/properties/:property/brochure-pdf",
        permanent: true,
      },
      {
        source: "/p/:org/:property/:channel/v/:documentId",
        destination: "/properties/:property/:channel/v/:documentId",
        permanent: true,
      },
      {
        source: "/p/:org/:property/:channel",
        destination: "/properties/:property/:channel",
        permanent: true,
      },
      {
        source: "/p/:org/:property",
        destination: "/properties/:property/brochure",
        permanent: true,
      },
    ];
  },
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
