import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/form/input';
import { RadioGroup } from '@/shared/ui/form/radio-group';

const sampleGenderOptions = [
  { id: 'gender-male',   value: 'male',   label: '남성' },
  { id: 'gender-female', value: 'female', label: '여성' },
];

export function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="flex min-h-[85vh] w-full max-w-2xl flex-col justify-center rounded-xl border bg-card p-12 shadow-lg">
        <h1 className="mb-3 text-3xl font-semibold">회원가입용 컴포넌트</h1>
        <p className="mb-12 text-muted-foreground">
          아래 컴포넌트는 회원가입 폼에서 사용할 수 있습니다.
        </p>

        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label htmlFor="id-input" className="text-sm font-medium">아이디</label>
            <Input id="id-input" type="text" placeholder="아이디를 입력하세요" autoComplete="username" />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="password-input" className="text-sm font-medium">비밀번호</label>
            <Input id="password-input" type="password" placeholder="비밀번호를 입력하세요" autoComplete="new-password" />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">성별</span>
            <RadioGroup options={sampleGenderOptions} defaultValue="male" className="flex gap-6" />
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button type="button">회원가입</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast('토스트가 표시됩니다', {
                description: '회원가입 완료 시 이렇게 알림을 띄울 수 있습니다.',
              })}
            >
              토스트 띄우기
            </Button>
          </div>
        </section>

        <div className="mt-12 border-t pt-8">
          <p className="mb-4 text-muted-foreground">
            위 컴포넌트를 참고하여 회원가입 페이지에 요구사항을 구현해주세요
          </p>
          <Button asChild>
            <Link to="/signup">회원가입 페이지로 이동</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
