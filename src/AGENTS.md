# AGENTS.md

## 역할
- `src/`는 루트 패키지 `react-flowmap`의 실제 라이브러리 소스다.

## 작업 규칙
- `core`, `runtime`, `ui`, `vite-plugin`, `next-plugin`의 경계를 흐리지 않는다.
- public API를 바꾸면 `src/index.ts`, `package.json`, `vite.config.ts`, `README.md`를 함께 확인한다.
- 코어 로직은 여기서 만들고 demo 앱으로 역류시키지 않는다.

## 확인
- 구현 변경 후 최소 `pnpm typecheck`와 관련 테스트를 확인한다.
