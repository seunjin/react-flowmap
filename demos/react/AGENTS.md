# AGENTS.md

## 역할
- `demos/react`는 workspace 기반 Vite React 데모다.
- 쇼핑 도메인 샘플과 `react-router-dom`을 이용해 Vite React 라우팅 환경의 render/use/call/request 흐름을 보여준다.

## 작업 규칙
- `react-flowmap`는 workspace 의존성으로 유지한다.
- 데모 자체보다 inspector 동작을 검증하기 좋은 흐름을 우선한다.
- 루트 앱에서 `<ReactFlowMap />` 마운트 위치를 바꿀 때는 e2e 영향 범위를 같이 본다.

## 확인
- `pnpm demo:react`
