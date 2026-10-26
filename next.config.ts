import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parallel end-to-end runs each build into their own directory.
  distDir: process.env.SIGI_DIST_DIR ?? ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  // Loaded from node_modules at runtime rather than bundled: better-sqlite3 is
  // a native module, and pdf.js starts its worker from its own package path.
  serverExternalPackages: ["better-sqlite3", "pdfjs-dist", "pino"],
};

export default nextConfig;
