import type { APIRoute } from "astro";

const robotsTxt = (sitemapURL: URL) => `\
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("astro.config site is required to generate robots.txt");
  }
  // Honor `base` so GitHub Pages serves the sitemap under /eurovision-top-20/.
  const sitemapURL = new URL(
    "sitemap-index.xml",
    new URL(import.meta.env.BASE_URL, site),
  );
  return new Response(robotsTxt(sitemapURL), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
