# AGENTS.md

## 역할
- `packages/`는 외부 통합이나 별도 배포 경계를 둘 필요가 있는 코드를 둔다.

## 작업 규칙
- 루트 `src/`와 책임이 겹치면 중복 구현보다 명확한 경계 정의를 먼저 한다.
- 새 패키지를 추가하면 빌드 엔트리, export 경로, 테스트, README까지 같이 맞춘다.
- 플랫폼 특화 코드는 패키지/플러그인에 두고 코어 그래프 로직은 `src/core`에 남긴다.

## 현재 상태
- 실사용 중인 패키지는 `packages/babel-plugin`이다.
- `packages/next-plugin`은 현재 placeholder 취급이며 실제 구현은 `src/next-plugin`에 있다.
