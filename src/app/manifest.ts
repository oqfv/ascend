import type { MetadataRoute } from "next";

/** Lets phones add Ascend to the home screen with its own icon and name. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ascend",
    short_name: "Ascend",
    description: "Track your habits and see your real progress.",
    start_url: "/today",
    display: "standalone",
    background_color: "#f1f2ef",
    theme_color: "#f1f2ef",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
