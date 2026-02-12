import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    // Enable Sharp for image optimization
    images: {
        formats: ['image/avif', 'image/webp'],
        // Add your image domains if using external images
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // Important for Railway deployment
    output: 'standalone',
};

export default nextConfig;
