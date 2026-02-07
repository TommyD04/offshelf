import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle WASM files for OpenCV.js
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fallbacks for Node.js modules in browser
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          path: false,
        },
      };
    }

    return config;
  },
};

export default nextConfig;
