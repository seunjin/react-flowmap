# AGENTS.md

## 역할
- `src/ui`는 그래프를 사용자에게 보여주는 표현 계층이다.

## 작업 규칙
- 화면에서 필요한 파생 계산은 가능하지만 source of truth를 여기서 새로 만들지 않는다.
- 특정 프레임워크 데모에 종속된 UI 규칙을 넣지 않는다.
- mount/unmount, portal, popup, event listener 정리를 명확히 한다.

## 확인
- UI 동작을 바꿨다면 `tests/ui` 또는 `tests/e2e` 중 맞는 쪽을 같이 갱신한다.
