# react-flowmap

## 0.3.0

### Minor Changes

- Next.js App Router support via `withFlowmap` webpack plugin. Adds `react-flowmap/next` export with `withFlowmap()` config wrapper and `openInEditor()` helper for API routes.

## 0.2.9

### Patch Changes

- - Inspector overlay: Shadow DOM CSS isolation 개선 — 호스트 앱의 전역 스타일이 inspector 유틸리티 클래스를 덮어쓰던 문제 수정
  - CSS pre-compilation 도입 — 소비자 앱의 Tailwind 인스턴스와 무관하게 항상 올바른 스타일 보장
  - Tailwind Preflight 제외 — 그래프 창 SVG 렌더링 간섭 문제 해결
  - 그래프 뷰: staticJsx/fiberRelations 기반 연결선도 렌더링 (일부 노드 간 선이 누락되던 버그 수정)

## 0.2.8

### Patch Changes

- 4a346dc: fix: graph window now correctly lays out component hierarchy using live fiber relationships

  Previously, the full-graph layout relied on `staticJsx` (which only tracked relative-path imports like `./Foo`) and runtime render events. This caused nearly all nodes to appear in a single horizontal line in projects that use alias imports (`@components/Nav`) or Outlet-mediated routing (TanStack Router), because no edges were resolved and every node got depth 0.

  Added `buildFiberRelationships()` which walks the live React fiber tree to extract direct parent→child relationships between RFM-instrumented components. This correctly captures alias-imported components and route components rendered through `<Outlet />`, since it traverses the actual fiber `.return` chain rather than relying on import path analysis.

  The fiber relationship map is now broadcast to the graph window alongside `staticJsx` and used as an additional edge source in the Kahn's topological sort, so nodes are properly arranged top-to-bottom reflecting the real component hierarchy.

## 0.2.2

### Patch Changes

- fix: 컴포넌트 목록이 비어있는 문제 수정 (TanStack Router 등)

  두 가지 근본 원인을 수정합니다:

  1. **collector reset 타이밍**: ReactFlowMap의 `useEffect`보다 먼저 실행된
     라우트 컴포넌트들의 이벤트가 `reset()`으로 지워지던 문제.
     `subscribe()`를 먼저 호출(기존 이벤트 즉시 전달)하고 cleanup에서만 reset합니다.

  2. **DOM 커밋 전 fiber-walk**: `allEntries`가 React 첫 렌더(DOM 커밋 전)에
     계산되어 fiber-walk 결과가 비어있던 문제.
     mount 이후 `domReady` state로 재계산을 트리거합니다.

## 0.2.1

### Patch Changes

- fix: detect components wrapped with React.memo / React.forwardRef in fiber tree

  Previously, `findAllMountedRfmComponents` and all related fiber-walk helpers
  only checked `typeof f.type === 'function'`, so components rendered through
  React.memo or React.forwardRef wrappers (e.g. TanStack Router wrapping route
  components internally) were silently skipped, causing "No components rendered
  on screen" even when the babel transform was working correctly.

  Also fixes `getRootHostEls` to treat React.memo/forwardRef fibers as component
  boundaries instead of descending into them like Fragment nodes.

## 0.2.0

### Minor Changes

- feat: TanStack Router / 라우터 라이브러리의 익명 component 패턴 지원

  `createRootRoute`, `createFileRoute` 등에서 사용하는 `component: () => <JSX />` 패턴을
  자동 감지하여 인스펙터에 표시. `errorComponent`, `pendingComponent`, `notFoundComponent`도 동일하게 지원.
  합성 이름은 파일 경로 기반으로 생성 (예: `routes/__root.tsx` → `_Root`).

## 0.1.5

### Patch Changes

- fix: 인스펙터 UI 개선

  - 트리뷰 hover 시 Fragment 컴포넌트도 전체 영역 하이라이트 (union rect 적용)
  - 기본 패널 위치를 `right` 고정으로 변경
  - float 모드 최대 높이 `80vh` → `90dvh`로 변경

## 0.1.4

### Patch Changes

- fix: Fragment를 사용하는 컴포넌트의 선택 영역이 첫 번째 자식만 표시되는 문제 수정

  `<>...</>` Fragment로 여러 요소를 렌더링하는 컴포넌트(App 등) 선택 시 Fragment fiber를 올바르게 순회하여 전체 영역이 하이라이트되도록 수정.

## 0.1.3

### Patch Changes

- fix: Fragment 컴포넌트 선택 영역 및 에디터 타입 자동완성 개선

  - Fragment로 여러 요소를 렌더링하는 컴포넌트(App 등) 선택 시 전체 영역이 하이라이트되도록 union rect 계산 방식 적용
  - 그래프 창을 열 때 localStorage의 active 상태를 초기화하여 새로고침 후 오버레이가 재생성되는 문제 수정
  - `flowmapInspect` 옵션의 `editor` 필드에 알려진 에디터 이름(`code`, `cursor`, `antigravity`, `windsurf`, `zed` 등) 자동완성 지원

## 0.1.2

### Patch Changes

- f439ea7: fix: dist에 타입 선언 파일(.d.ts) 누락 문제 수정

  vite-plugin-dts 설정에 `entryRoot: 'src'`와 `rollupTypes: true` 옵션을 추가하여
  `dist/index.d.ts`, `dist/vite-plugin.d.ts` 등이 올바른 경로에 생성되도록 수정.
