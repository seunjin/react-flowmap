# AGENTS.md

## 역할
- render/use/call/request 이벤트 생성 헬퍼를 둔다.

## 작업 규칙
- 이벤트 shape는 일관되게 유지하고 필수 필드를 축약하지 않는다.
- side effect 없는 작은 팩토리 함수로 유지한다.
- 새 메타데이터를 붙이면 core type과 테스트를 같이 갱신한다.
