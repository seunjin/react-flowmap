# AGENTS.md

## 역할
- Vite 개발 서버와 연결되는 `flowmapInspect()` 통합 계층이다.

## 작업 규칙
- dev-only 동작을 유지하고 production build 로직과 섞지 않는다.
- virtual module ID, editor-open endpoint, ts-morph prop 추출 계약을 안정적으로 유지한다.
- Babel transform 옵션과 README 예제가 어긋나지 않게 한다.

## 확인
- 플러그인 옵션이나 주입 경로를 바꾸면 demo와 README를 같이 확인한다.
