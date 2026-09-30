import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "우리끼리",
        short_name: "우리끼리",
        description: "친한 사람들끼리 일상을 나누는 작은 공간",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f6f4",
        theme_color: "#f6f6f4",
        icons: [
            {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}