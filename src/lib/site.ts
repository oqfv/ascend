// The site's public address: BETTER_AUTH_URL if set, the Vercel production URL on Vercel, else localhost.
export const SITE_URL =
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
