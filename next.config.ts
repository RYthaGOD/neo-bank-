import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@solana/web3.js", "rpc-websockets", "@coral-xyz/anchor"],
  serverExternalPackages: ["ws"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        vm: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
