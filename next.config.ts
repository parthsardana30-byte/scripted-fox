import type { NextConfig } from "next";

const developmentScriptPolicy = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
const upgradeInsecureRequests = process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://secure.payu.in; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'${developmentScriptPolicy}; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.groq.com https://api.x.ai https://generativelanguage.googleapis.com; frame-src 'self' https://accounts.google.com https://secure.payu.in${upgradeInsecureRequests}`,
        },
      ],
    }];
  },
};

export default nextConfig;
