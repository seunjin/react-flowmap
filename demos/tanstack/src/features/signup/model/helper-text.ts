import { signupMessages } from './signup-messages';

export type FieldState =
  | { type: 'default'; text: string; error?: undefined }
  | { type: 'success'; text: string; error?: undefined }
  | { type: 'error';   text: string; error: string };

export function resolveFieldState({
  error, isSuccess, successText, defaultText,
}: { error?: string; isSuccess: boolean; successText: string; defaultText: string }): FieldState {
  if (error) return { type: 'error', error, text: error };
  if (isSuccess) return { type: 'success', text: successText };
  return { type: 'default', text: defaultText };
}

export function resolvePasswordConfirmFieldState({
  passwordError, password, passwordConfirm,
}: { passwordError?: string; password: string; passwordConfirm: string }): FieldState {
  const hasConfirm = Boolean(passwordConfirm);
  const matched = Boolean(password) && hasConfirm && password === passwordConfirm;

  if (hasConfirm && passwordError) return { type: 'error', error: passwordError, text: passwordError };
  if (matched) return { type: 'success', text: signupMessages.passwordConfirm.matched };
  if (hasConfirm) return { type: 'error', error: signupMessages.passwordConfirm.mismatched, text: signupMessages.passwordConfirm.mismatched };
  return { type: 'default', text: signupMessages.passwordConfirm.defaultHelper };
}
