import { site } from "./config.ts";

// Generated rather than copied, so the name, the language and the description have one home.
export const manifest = {
  name: site.title,
  short_name: "苏斯基",
  description: site.motto,
  lang: site.lang,
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#ffffff",
  icons: [
    { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
};
