import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained production server for the Docker runtime.
  output: "standalone",
};

export default nextConfig;
