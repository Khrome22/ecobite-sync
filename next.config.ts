import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev assets are blocked unless the browser host is listed here.
  // 127.0.0.1 is the local preview. *.agent.cvm.dev is the cloud preview.
  allowedDevOrigins: ["127.0.0.1", "*.agent.cvm.dev", "**.cvm.dev"],
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
