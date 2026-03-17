# React Flowmap Tech Stack

## Purpose

이 문서는 React Flowmap v1의 Phase 0에서 채택한 기술 스택을 고정합니다.  
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

React Flowmap는 데이터 구조와 관계 모델이 핵심이므로, 타입 안정성은 기능 안정성과 같은 수준으로 중요합니다.

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

## Additional Stack (추가된 항목)

### AST 변환

- `@babel/parser`, `@babel/traverse`, `@babel/generator`, `@babel/types`
  - `@vitejs/plugin-react` 및 `next`의 전이 의존성으로 제공됨
  - 직접 설치 불필요
- `ts-morph` — TypeScript 타입 정보 추출 (prop 타입 인스펙터용)

### Styling

- `Tailwind CSS v4` (`@tailwindcss/vite`) — Inspector UI 스타일링

### Next.js 지원

- `@react-flowmap/babel-plugin` — Babel AST 변환 코어 (workspace 패키지)
- `@react-flowmap/next-plugin` — Next.js App Router 통합 (workspace 패키지)

---

## Deferred Decisions

- `Storybook` — 현재 불필요
- `Playwright` — E2E 테스트는 수동 검증으로 대체 중
- 별도 formatter 도입 — ESLint로 충분
- SWC 플러그인 — Babel보다 복잡, 현재 채택하지 않음

---

## Summary

React Flowmap v1은 다음 조합으로 시작합니다.

- minimum `Node 22.22+`
- recommended target `Node 24 LTS`
- `pnpm`
- `TypeScript`
- `Vite`
- `React`
- `Vitest`
- `ESLint v9`

이 스택은 React Flowmap를 앱 프레임워크가 아니라, **코어 엔진 + 데모 + 탐색 UI를 가진 라이브러리 프로젝트**로 유지하기 위한 기준선입니다.
