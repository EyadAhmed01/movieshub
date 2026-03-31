/** @returns {import("next").MetadataRoute.Manifest} */
export default function manifest() {
  return {
    name: "Rotten Potatoes",
    short_name: "Rotten Potatoes",
    description: "Track movies and series with ratings and TMDB info",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a20",
    theme_color: "#1a1a20",
    icons: [
      {
        src: "/assets/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/assets/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
