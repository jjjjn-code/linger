/** @type {import('next').NextConfig} */
const nextConfig = {
  // Product images come from arbitrary retail domains, so we can't pre-allowlist
  // them. We render them with plain <img> (not next/image) to avoid the remote
  // domain allowlist entirely — appropriate for a personal, local-first app.
  reactStrictMode: true,
};

export default nextConfig;
