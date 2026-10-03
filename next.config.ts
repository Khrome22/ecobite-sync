import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The booth and the preview open 127.0.0.1. Next treats that as a
  // different host from localhost and will block the dev client otherwise.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
