# AGENTS.md

## 역할
- 런타임 이벤트를 파일/심볼/API 그래프로 정규화하는 계층이다.

## 작업 규칙
- repeated observation이 들어와도 그래프 형태는 안정적으로 dedupe 되어야 한다.
- edge/node ID 형식은 결정적이어야 한다.
- 새 event type을 추가하면 exhaustive handling과 테스트를 같이 추가한다.

## 확인
- `tests/core/graph-builder.test.ts`와 관련 fixture를 같이 갱신한다.
