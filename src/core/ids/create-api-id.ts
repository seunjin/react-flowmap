import type { ApiMethod } from '../types/graph.js';

export function createApiId(method: ApiMethod, path: string): string {
  return `api:${method}:${path}`;
}
