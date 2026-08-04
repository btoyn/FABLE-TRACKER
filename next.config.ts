import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The in-app guide renders docs/USER_GUIDE.md at request time, and that file
  // lives outside the bundle, so trace it into the /guide serverless function.
  outputFileTracingIncludes: {
    "/guide": ["./docs/USER_GUIDE.md"],
  },
};

export default nextConfig;
