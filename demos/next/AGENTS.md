# AGENTS.md

## 역할
- `demos/next`는 Next.js App Router 통합 검증용 standalone npm 앱이다.

## 작업 규칙
- client component만 추적된다는 제약을 샘플 구조에서 명확히 유지한다.
- 이 폴더의 설치/lockfile은 npm 기준으로 관리한다.
- Turbopack이 아니라 webpack dev 흐름을 전제로 한다.

## 확인
- `pnpm demo:next`
