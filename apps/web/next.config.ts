import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@pinecone-database/pinecone", "pdf2json"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
