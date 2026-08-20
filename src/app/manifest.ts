import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Basecamp",
    short_name: "Basecamp",
    description: "Personal lender relationship and communication command center",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1d3a",
    theme_color: "#1e5bff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
