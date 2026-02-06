import { createRequire } from "module";
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@solana/web3.js", "rpc-websockets", "@coral-xyz/anchor"],
  serverExternalPackages: ["ws"],
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
    return config;
  },
};

export default nextConfig;
