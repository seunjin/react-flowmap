import { z } from 'zod';
import { signupMessages } from './signup-messages';

export const signupSchema = z
  .object({
    userId: z
      .string()
      .min(1, signupMessages.userId.required)
      .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/, signupMessages.userId.invalidFormat)
      .max(20, signupMessages.userId.maxLength),
    password: z
      .string()
      .min(1, signupMessages.password.required)
      .max(20, signupMessages.password.maxLength)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).+$/,
        signupMessages.password.invalidFormat,
      ),
    passwordConfirm: z.string().min(1, signupMessages.passwordConfirm.required),
    gender: z
      .string()
      .min(1, signupMessages.gender.required)
      .refine((v): v is 'MALE' | 'FEMALE' => v === 'MALE' || v === 'FEMALE', {
        message: signupMessages.gender.required,
      }),
    mbti: z.string().regex(/^[EI][NS][TF][PJ]$/i, signupMessages.mbti.invalidFormat),
  })
  .refine(d => d.password === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: signupMessages.passwordConfirm.mismatched,
  });

export type SignUpFormValues = z.input<typeof signupSchema>;
export type SignUpSubmitValues = z.output<typeof signupSchema>;
