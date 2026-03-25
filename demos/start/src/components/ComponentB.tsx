import { Badge } from './Badge';

export function ComponentB() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-medium text-gray-900">Component B</h2>
        <Badge label="ssr" />
      </div>
      <p className="text-sm text-gray-500">
        SSR 환경에서 inspector overlay가 클라이언트에서만 마운트되는지 확인합니다.
      </p>
    </div>
  );
}
