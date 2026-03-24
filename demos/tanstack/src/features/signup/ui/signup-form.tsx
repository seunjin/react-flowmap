import { Controller } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/form/field';
import { Input } from '@/shared/ui/form/input';
import { RadioGroup } from '@/shared/ui/form/radio-group';
import { genderOptions } from '../model/gender-options';
import { useSignupForm } from '../model/use-signup-form';

export function SignupForm() {
  const { form: { register, control }, fields, actions, status } = useSignupForm();

  return (
    <>
      <form
        id="signup-form"
        className="flex flex-col gap-6 px-6 pb-6 max-[416px]:px-0"
        onSubmit={actions.submit}
      >
        <Field label="아이디" error={fields.userId.error} helperText={fields.userId.text}>
          <div className="flex gap-1">
            <Input
              placeholder="아이디를 입력하세요"
              {...register('userId')}
              error={!!fields.userId.error}
            />
            <Button
              type="button"
              variant="outline"
              onClick={actions.handleCheckUserId}
              disabled={status.isCheckingUserId || status.isUserIdAvailable}
              isPending={status.isCheckingUserId}
            >
              중복확인
            </Button>
          </div>
        </Field>

        <Field label="비밀번호" error={fields.password.error} helperText={fields.password.text}>
          <Input
            type="password"
            placeholder="비밀번호를 입력하세요"
            {...register('password')}
            error={!!fields.password.error}
          />
        </Field>

        <Field label="비밀번호 확인" error={fields.passwordConfirm.error} helperText={fields.passwordConfirm.text}>
          <Input
            type="password"
            placeholder="비밀번호를 다시 입력하세요"
            {...register('passwordConfirm')}
            error={!!fields.passwordConfirm.error}
          />
        </Field>

        <Field label="성별" error={fields.gender.error}>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <RadioGroup
                options={genderOptions}
                value={field.value}
                error={!!fields.gender.error}
                className="flex gap-6"
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="MBTI" helperText={fields.mbti.text} error={fields.mbti.error}>
          <Input
            type="text"
            placeholder="MBTI 유형을 입력하세요"
            {...register('mbti')}
            error={!!fields.mbti.error}
          />
        </Field>
      </form>

      <div className="flex justify-end gap-2 p-4 max-[416px]:px-0">
        <Button variant="outline" type="button" onClick={() => actions.reset()}>취소</Button>
        <Button
          type="submit"
          form="signup-form"
          disabled={status.isSubmitting}
          isPending={status.isSubmitting}
        >
          완료
        </Button>
      </div>
    </>
  );
}
