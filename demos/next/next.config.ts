import type { NextConfig } from 'next';
import { withFlowmap } from '../../dist/next-plugin.js';

const nextConfig: NextConfig = {};

export default withFlowmap(nextConfig);
