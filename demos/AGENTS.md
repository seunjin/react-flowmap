# AGENTS.md

## 역할
- `demos/`는 지원 프레임워크별 통합 검증 앱 모음이다.

## 작업 규칙
- demo는 라이브러리 기능을 설명하고 검증하는 용도다. library source of truth가 되면 안 된다.
- 생성 산출물이나 local install 결과물은 직접 수정하지 않는다.
- Playwright 포트 계약을 유지한다: react `3001`, tanstack `3002`, next `3003`.

## 확인
- mount 위치, selector, 라우팅 흐름을 바꾸면 `tests/e2e`도 같이 본다.
