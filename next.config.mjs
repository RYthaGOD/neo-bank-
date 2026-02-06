import { createRequire } from "module";
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@solana/web3.js", "@coral-xyz/anchor"],
  serverExternalPackages: ["ws", "bufferutil", "utf-8-validate"],
  typescript: {
    ignoreBuildErrors: true,
  },
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
        buffer: require.resolve("buffer/"),
      };
    }
    // Force ws to be external on server side to avoid bundling issues
    if (isServer) {
      config.externals.push("ws", "bufferutil", "utf-8-validate");
    }
    return config;
  },
};

export default nextConfig;
