import { http } from '@/shared/api/http';

interface CheckUserIdResponseData {
  available: boolean;
  userId: string;
}

export function checkUserId(userId: string) {
  return http<CheckUserIdResponseData>(`/users/check-id/${encodeURIComponent(userId)}`);
}
