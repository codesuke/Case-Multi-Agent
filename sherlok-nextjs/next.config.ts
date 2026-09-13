import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Produces a self-contained production server for the Docker runtime.
  output: "standalone",
};

export default nextConfig;
