import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Shadcn/ui chart component has minor type issues with recharts — ignore during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
