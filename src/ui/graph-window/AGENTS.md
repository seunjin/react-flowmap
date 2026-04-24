# AGENTS.md

## 역할
- popup 기반 분석 워크스페이스 UI를 둔다.
- explorer, graph, inspector를 한 창에서 조합하는 진입점이다.

## 작업 규칙
- inspector overlay와 분리된 독립 진입점으로 유지한다.
- `?__rfm=graph` 기반 팝업 흐름을 깨지 않게 한다.
- 프레임워크별 앱 라우트에 의존하지 않는 구조를 우선한다.
- overlay가 picker 역할로 남을 수 있게 workspace 쪽에 분석 UI를 집중시킨다.
