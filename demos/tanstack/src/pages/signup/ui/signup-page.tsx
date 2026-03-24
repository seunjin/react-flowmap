import { SignupForm } from '@/features/signup/ui/signup-form';

export function SignupPage() {
  return (
    <main className="bg-slate-50 min-h-dvh px-4 py-11 max-[416px]:bg-white max-[416px]:py-4">
      <div className="shadow-lg w-[min(100%,416px)] mx-auto rounded-md border border-[#E5E5E5] bg-white max-[416px]:shadow-none max-[416px]:border-none">
        <div className="p-6 max-[416px]:px-0">
          <h1 className="text-2xl font-bold pb-2 text-foreground">회원가입</h1>
          <p className="text-[15px] text-muted-foreground">서비스 이용을 위해 아래 정보를 입력해 주세요.</p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
