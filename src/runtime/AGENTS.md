# AGENTS.md

## 역할
- `src/runtime`은 브라우저 런타임 관측과 trace/session 전파를 담당한다.

## 작업 규칙
- UI 상태나 그래프 해석 로직을 여기로 끌어오지 않는다.
- 전역 훅킹이 필요한 경우 반드시 cleanup 경로를 남긴다.
- dev-only 도구라는 전제를 유지하고 production 영향이 없게 설계한다.

## 확인
- `tests/runtime`를 먼저 보고, 관측 방식이 바뀌면 e2e도 확인한다.
