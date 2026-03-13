# Gori Tech Stack

## Purpose

이 문서는 Gori v1의 Phase 0에서 채택한 기술 스택을 고정합니다.  
목표는 구현 전에 도구 선택을 안정화하고, 이후 부트스트랩과 유지보수 기준을 일관되게 만드는 것입니다.

---

## Chosen Stack

### Runtime and Package Management

- `Node.js`: minimum `22.22+`, recommended target `24.x LTS`
- `Package manager`: `pnpm`
- `.npmrc`:
  - `auto-install-peers=true`
  - `node-linker=hoisted`

이 조합은 단일 패키지 저장소에서 빠른 설치와 이후 workspace 확장 가능성을 모두 보장합니다.

---

### Language

- `TypeScript`

기본 원칙:

- `strict: true`
- `isolatedModules: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

Gori는 데이터 구조와 관계 모델이 핵심이므로, 타입 안정성은 기능 안정성과 같은 수준으로 중요합니다.

---

### Build and Demo

- `Vite`
- `@vitejs/plugin-react`
- `React`
- `react-dom`

구성 원칙:

- 개발 서버와 데모 앱은 `Vite`로 실행
- 라이브러리 빌드는 `Vite build.lib` 사용
- 단일 설정 파일에서 demo와 library build를 모두 관리

---

### Testing

- `Vitest`
- `jsdom`

초기 테스트 전략:

- UI 테스트보다 core 테스트 우선
- fixture 기반 graph/projection/selection 테스트 우선

---

### Linting

- `ESLint v9`
- `typescript-eslint`
- `@eslint/js`
- `globals`

초기 lint 목표:

- TypeScript/JS 품질 규칙 적용
- `core -> ui/runtime/static` 의존 금지
- type import 일관성 유지

---

## Current Package Versions

- `react`: `19.1.1`
- `react-dom`: `19.1.1`
- `typescript`: `5.8.3`
- `vite`: `7.1.4`
- `@vitejs/plugin-react`: `5.0.2`
- `vitest`: `3.2.4`
- `jsdom`: `26.1.0`
- `eslint`: `9.35.0`
- `@eslint/js`: `9.35.0`
- `typescript-eslint`: `8.42.0`
- `globals`: `16.3.0`
- `@types/react`: `19.1.12`
- `@types/react-dom`: `19.1.9`

---

## Deferred Decisions

다음 항목은 v1 코어 검증 이후 다시 판단합니다.

- `Storybook`
- `Playwright`
- 별도 formatter 도입
- monorepo 분리
- build-time AST pipeline 고도화

---

## Summary

Gori v1은 다음 조합으로 시작합니다.

- minimum `Node 22.22+`
- recommended target `Node 24 LTS`
- `pnpm`
- `TypeScript`
- `Vite`
- `React`
- `Vitest`
- `ESLint v9`

이 스택은 Gori를 앱 프레임워크가 아니라, **코어 엔진 + 데모 + 탐색 UI를 가진 라이브러리 프로젝트**로 유지하기 위한 기준선입니다.
