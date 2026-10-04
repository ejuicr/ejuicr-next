import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep native/server-only dependencies out of the bundler so they are
  // required at runtime the way their Node.js builds expect.
  serverExternalPackages: ["mongoose", "bcryptjs", "nodemailer"],
};

export default nextConfig;
