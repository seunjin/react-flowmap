import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkUserId } from '../api/check-user-id';
import { signUp } from '../api/signup';
import { resolveFieldState, resolvePasswordConfirmFieldState } from './helper-text';
import { signupMessages } from './signup-messages';
import { type SignUpFormValues, signupSchema } from './signup-schema';

const DEFAULT_VALUES: SignUpFormValues = {
  userId: '', password: '', passwordConfirm: '', gender: '', mbti: '',
};

export function useSignupForm() {
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
    defaultValues: DEFAULT_VALUES,
  });

  const { trigger, getValues, reset, handleSubmit, setError, clearErrors, watch, formState: { errors } } = form;

  const userId = watch('userId');
  const password = watch('password');
  const passwordConfirm = watch('passwordConfirm');

  const [availableUserId, setAvailableUserId] = useState<string | null>(null);
  const prevUserIdRef = useRef(DEFAULT_VALUES.userId);

  useEffect(() => {
    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;
    if (availableUserId && availableUserId !== userId) setAvailableUserId(null);
    if (errors.userId?.type === 'manual') clearErrors('userId');
  }, [userId, availableUserId, errors.userId?.type, clearErrors]);

  const checkUserIdMutation = useMutation({
    mutationFn: checkUserId,
    onSuccess(response) {
      if (!response.data) return;
      if (response.data.available) {
        clearErrors('userId');
        setAvailableUserId(response.data.userId);
      } else {
        setAvailableUserId(null);
        setError('userId', { type: 'manual', message: signupMessages.userId.duplicate });
      }
    },
    onError(error) { toast.error(error.message); },
  });

  const signUpMutation = useMutation({
    mutationFn: signUp,
    onSuccess(response) {
      setAvailableUserId(null);
      clearErrors('userId');
      toast.success(response.message ?? signupMessages.submit.success);
      reset();
    },
    onError(error) {
      if (error.message === signupMessages.userId.duplicate) {
        setError('userId', { type: 'manual', message: error.message });
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleCheckUserId = async () => {
    if (!await trigger('userId')) return;
    checkUserIdMutation.mutate(getValues('userId'));
  };

  const submit = handleSubmit(values => {
    const { userId, password, gender, mbti } = signupSchema.parse(values);
    signUpMutation.mutate({ userId, password, gender, mbti: mbti.toUpperCase() as Uppercase<string> });
  });

  const isUserIdAvailable = availableUserId === userId && !errors.userId;

  return {
    form,
    fields: {
      userId: resolveFieldState({
        error: errors.userId?.message,
        isSuccess: isUserIdAvailable,
        successText: signupMessages.userId.available,
        defaultText: signupMessages.userId.defaultHelper,
      }),
      password: resolveFieldState({
        error: errors.password?.message,
        isSuccess: false,
        successText: '',
        defaultText: signupMessages.password.defaultHelper,
      }),
      passwordConfirm: resolvePasswordConfirmFieldState({ passwordError: errors.password?.message, password, passwordConfirm }),
      gender: { error: errors.gender?.message },
      mbti: resolveFieldState({
        error: errors.mbti?.message,
        isSuccess: false,
        successText: '',
        defaultText: signupMessages.mbti.defaultHelper,
      }),
    },
    actions: { reset, submit, handleCheckUserId },
    status: {
      isCheckingUserId: checkUserIdMutation.isPending,
      isUserIdAvailable,
      isSubmitting: signUpMutation.isPending,
    },
  };
}
