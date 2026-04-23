# AGENTS.md

## 역할
- context stack과 trace/session 메타데이터 전파를 담당한다.

## 작업 규칙
- nested context가 항상 LIFO로 정리되게 유지한다.
- 테스트에서는 시간과 ID 생성기를 주입해 결정적으로 검증한다.
- context propagation은 collector나 UI 구현 세부와 느슨하게 연결한다.
