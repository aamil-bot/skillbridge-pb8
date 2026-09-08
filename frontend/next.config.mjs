/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Inter is loaded with a plain <link> in app/layout.tsx. Turning off Next's
  // build-time font inlining keeps `next build` hermetic (no network call), and
  // the browser still fetches the font at runtime when it has a connection.
  optimizeFonts: false,
};

export default nextConfig;
