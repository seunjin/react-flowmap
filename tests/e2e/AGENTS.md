# AGENTS.md

## 역할
- Playwright 기반 통합 smoke/regression 테스트를 둔다.

## 작업 규칙
- 데모 포트 계약은 `playwright.config.ts`와 맞춘다.
- shadow DOM helper와 안정적 selector를 우선 사용한다.
- arbitrary sleep 대신 mount/selector 기반 대기를 사용한다.
