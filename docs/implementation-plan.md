# React Flowmap Implementation Plan

## Purpose

이 문서는 React Flowmap을 실제로 구현하기 위한 단계별 실행 계획을 정의합니다.
완료된 단계와 앞으로 남은 단계를 함께 관리합니다.

---

## Current Status (2026-03-17 기준)

| 영역 | 상태 |
|------|------|
| 코어 데이터 모델 & 그래프 엔진 | ✅ 완료 |
| 런타임 이벤트 수집 & 세션 추적 | ✅ 완료 |
| Component Overlay Inspector (UI) | ✅ 완료 |
| Vite 플러그인 (Babel AST 변환) | ✅ 완료 |
| Babel 변환 패키지 분리 (`@react-flowmap/babel-plugin`) | ✅ 완료 |
| Next.js 플러그인 코드 작성 (`@react-flowmap/next-plugin`) | ✅ 완료 |
| 서브패스 exports (`react-flowmap/vite`, `react-flowmap/next`) | ✅ 완료 |
| Next.js App Router 실제 동작 검증 | 🔄 다음 단계 |
| 빌드 시스템 정비 (dist 빌드 + 타입 선언) | ⬜ 예정 |
| 데모 라우터 추가 | ⬜ 예정 |
| npm 배포 | ⬜ 예정 |

---

## Completed Phases

### ✅ Phase 0. Repository Foundation

프로젝트 구조, TypeScript, pnpm, Vite, ESLint, Vitest 기본 환경 구성 완료.

---

### ✅ Phase 1–4. Core Engine

- `FlowmapGraph` 타입, `GraphStore`, `GraphBuilder` 구현
- `RuntimeEvent` → `FlowmapNode/Edge` 변환 파이프라인 완료
- file/symbol/api ID 규칙 확정

---

### ✅ Phase 5–6. Projection & Selection

- `projectToFileLevelView()` — symbol graph → file-level view 축약
- `FileEdge` 생성 및 supporting edge 집계
- `both | outgoing | incoming` 선택 모드 구현

---

### ✅ Phase 7. Inspector Model

- `buildInspectorPayload()` — 선택된 파일/심볼 상세 데이터 생성
- relation summary 구현

---

### ✅ Phase 8. Component Overlay Inspector

Vite 플러그인 기반의 런타임 인스펙터 UI 완료:

- **Babel AST 변환**: `data-rfm-id`, Context 훅, Provider 래핑 자동 주입
- **ts-morph prop 타입 추출**: 인스펙터 사이드바에서 TypeScript 타입 표시
- **Pick Mode**: 크로스헤어로 화면에서 직접 컴포넌트 선택
- **FloatingSidebar**: 드래그 가능한 컴포넌트 트리 + Inspector
- **에디터 열기**: `/__rfm-open` → Cursor / VS Code / Windsurf / Zed 지원
- **Tailwind CSS v4** 기반 UI

---

### ✅ Phase 9. Multi-Bundler Architecture

Babel 변환 로직을 번들러 독립 패키지로 분리:

- `packages/babel-plugin/` — `@react-flowmap/babel-plugin`
  - `transformFlowmap(code, fileId, opts)` — 핵심 변환 함수
  - `contextImport` 옵션으로 import 경로 커스텀 가능
- `packages/next-plugin/` — `@react-flowmap/next-plugin`
  - `withFlowmap(nextConfig)` — Next.js config 래퍼
  - webpack 로더로 dev 빌드에 변환 주입
  - App Router / Pages Router 에디터 열기 API 핸들러 포함
- `react-flowmap/vite`, `react-flowmap/next` 서브패스 exports 추가
- 프로젝트명 **gori → react-flowmap** 전면 리네이밍 완료
- 브랜드 심볼 SVG 아이콘 (컴포넌트 트리 형태) 적용

---

## Upcoming Phases

### 🔄 Phase 10. Next.js App Router 실제 검증

**목표**: 코드로만 작성된 next-plugin이 실제 앱에서 동작하는지 검증합니다.

**범위**: Next.js App Router 기반으로 확정.

**Tasks**:
- Next.js 테스트 앱 생성 (App Router)
- `withFlowmap()` webpack 로더가 JSX를 올바르게 변환하는지 확인
- `react-flowmap/context` import 해석 (webpack alias) 동작 확인
- `app/api/__rfm-open/route.ts` 에디터 열기 동작 확인
- ComponentOverlay UI가 Next.js 환경에서 올바르게 렌더되는지 확인
- 발견된 버그 수정

**Exit Criteria**:
- Next.js App Router 앱에서 Pick Mode, 컴포넌트 트리, 에디터 열기가 동작함
- Vite 환경과 동일한 핵심 기능이 Next.js에서 작동함

---

### ⬜ Phase 11. 빌드 시스템 정비

**목표**: npm 배포를 위해 TypeScript 소스를 JS + 타입 선언으로 빌드합니다.

**Tasks**:
- `vite build --mode library` 또는 `tsc` 기반으로 `dist/` 빌드 구성
- `react-flowmap`, `@react-flowmap/babel-plugin`, `@react-flowmap/next-plugin` 각각 빌드
- `package.json` exports를 `./src/*` → `./dist/*` 경로로 변경
- TypeScript 선언 파일(`.d.ts`) 생성 확인
- prod 빌드에서 인스펙터 코드가 완전히 제거되는지 검증

**Exit Criteria**:
- `dist/` 빌드 후 외부 프로젝트에서 `react-flowmap` 설치·사용 가능

---

### ⬜ Phase 12. 데모 라우터 추가

**목표**: 라우터가 있는 실제 앱 환경에서 Inspector 동작을 검증합니다.

**Tasks**:
- 데모에 TanStack Router 또는 react-router-dom 추가
- 페이지 전환 시 컴포넌트 트리가 올바르게 갱신되는지 확인
- 다중 페이지(홈/상품/장바구니) 환경에서 Inspector 동작 확인
- 페이지 unmount 시 세션 데이터 처리 방식 결정

**Exit Criteria**:
- 페이지 전환 후에도 Inspector가 현재 페이지의 컴포넌트 트리를 올바르게 표시함

---

### ⬜ Phase 13. npm 배포 준비 및 배포

**목표**: 공개 사용 가능한 패키지로 npm에 배포합니다.

**Tasks**:
- README 작성
  - 한 줄 소개
  - Vite 설치/사용법
  - Next.js App Router 설치/사용법
  - 스크린샷
- `package.json` 정비 (`peerDependencies`, `files`, `repository`, `keywords`)
- npm publish 스크립트 구성
- `react-flowmap` / `@react-flowmap/babel-plugin` / `@react-flowmap/next-plugin` 배포

**Exit Criteria**:
- `npm install react-flowmap` 후 Vite + Next.js 양쪽에서 동작함

---

### ⬜ Phase 14. 문서 사이트 (미래)

Vitepress 기반 문서 사이트. npm 배포 이후 우선순위 결정.

---

## Recommended Execution Order

```
Next.js 실제 검증 → 빌드 시스템 → 라우터 테스트 → README → npm 배포
```

이 순서의 이유:
- Next.js 검증을 먼저 해야 코드가 실제로 동작하는지 알 수 있음
- 동작이 확인된 코드를 빌드하고, 빌드된 걸 배포함
- 문서는 동작하는 것을 기준으로 써야 정확함
