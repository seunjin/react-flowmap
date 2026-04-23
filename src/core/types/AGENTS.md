# AGENTS.md

## 역할
- 저장소 전반이 공유하는 핵심 타입 계약을 정의한다.

## 작업 규칙
- 여기가 schema source of truth다.
- breaking semantic change는 문서와 테스트를 같은 변경에서 갱신한다.
- optional 필드 추가/삭제는 runtime 수집기와 UI 소비자까지 함께 검토한다.

## 확인
- 타입 변경 후 `tests/core`, `tests/runtime`, `tests/ui` 중 영향 범위를 모두 본다.
