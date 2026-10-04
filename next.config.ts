import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev assets are blocked unless the browser host is listed here.
  // 127.0.0.1 is the local preview. *.agent.cvm.dev is the cloud preview.
  allowedDevOrigins: ["127.0.0.1", "*.agent.cvm.dev", "**.cvm.dev"],
  devIndicators: { position: "top-right" },
  serverExternalPackages: ["@electric-sql/pglite", "tesseract.js", "msedge-tts", "pg", "@neondatabase/serverless"],
};

export default nextConfig;
