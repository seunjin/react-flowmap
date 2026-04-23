# AGENTS.md

## 역할
- `packages/babel-plugin`은 JSX 소스를 instrument 하는 AST 변환 코어를 담당한다.
- Vite/Next 통합 모두 이 계층의 변환 결과에 의존한다.

## 작업 규칙
- 변환 로직은 프레임워크 비의존적으로 유지하고 환경 차이는 옵션으로 푼다.
- symbol ID, import 주입, exclude 규칙은 안정적으로 유지한다.
- 번들러별 서버 로직이나 editor-open 처리 같은 것은 여기 넣지 않는다.

## 확인
- 변경 후 `tests/babel-plugin`과 전체 `pnpm test`를 우선 확인한다.
- JSX 주입 규칙을 바꿨다면 관련 demo와 `tests/e2e`도 같이 본다.
