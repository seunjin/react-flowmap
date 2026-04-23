# AGENTS.md

## 역할
- Next.js App Router 개발 환경 통합을 담당한다.

## 작업 규칙
- 현재 전제는 `next dev --webpack`이다. Turbopack 지원처럼 보이게 만들지 않는다.
- client component만 추적된다는 제한을 문서와 샘플에서 숨기지 않는다.
- sidecar 서버, webpack loader, route scan은 dev 경험을 위한 보조 계층으로 유지한다.

## 확인
- 변경 후 `demos/next`와 관련 e2e를 함께 본다.
