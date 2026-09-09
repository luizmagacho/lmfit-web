import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Loop 30 — só pra permitir as ilustrações SVG de produto seedadas em dev local
    // (lmfit-api/uploads/futebol/*.svg); CSP restritiva no próprio SVG serve, como o Next recomenda.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d1a9qnv764bsoo.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.lmfit.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.lmfit.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.kivo.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.kivoni.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.kivoni.com.br",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
