import { Badge } from './Badge';

export function ComponentA() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-medium text-gray-900">Component A</h2>
        <Badge label="start" />
      </div>
      <p className="text-sm text-gray-500">
        TanStack Start (Vinxi/SSR) 환경에서 react-flowmap이 정상 작동하는지 검증하는 컴포넌트입니다.
      </p>
    </div>
  );
}
