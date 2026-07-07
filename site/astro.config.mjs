import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://ruslanbes.github.io",
  base: "/eurovision-top-20/",
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  server: {
    port: 3420,
  },
});
