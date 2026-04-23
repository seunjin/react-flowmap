# AGENTS.md

## 역할
- `src/static`은 정적 분석 전용 경계를 위한 예약 공간이다.

## 작업 규칙
- import/export/static metadata 같은 정적 정보만 둔다.
- 런타임 이벤트 수집 로직과 섞지 않는다.
- 아직 구현이 비어 있어도 향후 책임 경계를 흐리지 않게 유지한다.
