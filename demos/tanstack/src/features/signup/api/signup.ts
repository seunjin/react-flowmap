import { http } from '@/shared/api/http';
import type { SignUpSubmitValues } from '../model/signup-schema';

type SignUpRequestBody = Omit<SignUpSubmitValues, 'passwordConfirm'>;

export function signUp(body: SignUpRequestBody) {
  return http<{ userId: string }>('/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
