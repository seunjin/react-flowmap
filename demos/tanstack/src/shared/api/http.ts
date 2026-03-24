const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export interface ApiResponse<T = unknown> {
  code: 200 | 500;
  message?: string;
  data?: T;
}

export async function http<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (body.code === 500) {
    throw new Error(body.message ?? '요청 처리 중 오류가 발생했습니다.');
  }
  return body;
}
