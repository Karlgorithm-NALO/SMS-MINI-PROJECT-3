/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The wallet file is read with fs at request time rather than imported,
    // so tell the file tracer to ship it with the functions that read it.
    outputFileTracingIncludes: {
      "/": ["./data/wallet.json"],
      "/api/process": ["./data/wallet.json"],
    },
  },
};

export default nextConfig;
