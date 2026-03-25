import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // TODO: react-flowmap Next.js 지원을 위해 필요한 것들:
  //
  // 1. webpack plugin: babel-plugin을 webpack transform으로 래핑
  //    → 각 .tsx 파일에 컴포넌트 추적 코드 주입
  //
  // 2. virtual:rfm/context alias
  //    config.resolve.alias['virtual:rfm/context'] = 'react-flowmap/rfm-context'
  //
  // 3. dev server middleware for /__rfm-open
  //    → Next.js rewrites + API route 또는 custom server
  //
  // 현재: inspector overlay UI만 클라이언트에서 렌더링 (컴포넌트 추적 없음)
};

export default nextConfig;
