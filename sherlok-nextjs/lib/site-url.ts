const defaultSiteUrl = "http://localhost:3000";

/**
 * The public, canonical origin used in metadata, robots.txt, and sitemap.xml.
 * Set NEXT_PUBLIC_SITE_URL to the production HTTPS origin when deploying.
 */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl,
);
