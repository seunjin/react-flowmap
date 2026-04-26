# react-flowmap

## 1.0.0-rc.12

### Patch Changes

- Use one visual style system for live and static owner overlays so hover and selected states render consistently across CSR and SSR ownership paths.

## 1.0.0-rc.11

### Patch Changes

- Avoid drawing viewport-sized overlays for layout route context nodes and keep owner boxes from covering selected content edges.

## 1.0.0-rc.10

### Patch Changes

- Keep floating owner overlays synchronized with fixed or sticky visual targets during scroll and layout changes.

## 1.0.0-rc.9

### Patch Changes

- Render owner selection boxes and labels through a floating overlay layer that tracks DOM owners during scroll, resize, layout shifts, and fixed or sticky positioning.

## 1.0.0-rc.8

### Patch Changes

- Render owner selection with Flowmap overlay boxes only instead of mutating app DOM with selected/hovered outline attributes.

## 1.0.0-rc.7

### Patch Changes

- Mark Next Link static owner roots directly so card components render a single owner overlay instead of separate child boxes.

## 1.0.0-rc.6

### Patch Changes

- Mark static owner DOM inside component wrapper roots such as Next Link so server components like PostCard are observed as STATIC-DOM instead of STATIC-DECLARED.

## 1.0.0-rc.5

### Patch Changes

- Reframe Next.js App Router support around screen-to-source ownership: static DOM owner markers are pickable from the app screen, graph entries distinguish LIVE, STATIC-DOM, and STATIC-DECLARED ownership states, and the graph window restores the latest snapshot after refresh.

## 1.0.0-rc.4

### Patch Changes

- Align owner highlights with the actual owner marker rect by default and keep visual child targeting behind explicit owner anchors.

## 1.0.0-rc.3

### Patch Changes

- Improve owner highlight boxes for fixed/sticky/absolute visual children and add `data-rfm-owner-anchor` / `data-rfm-owner-ignore` rect hints.

## 1.0.0-rc.2

### Patch Changes

- Improve Next.js client boundary naming and merge static client boundary metadata into matching live runtime nodes.

  Also add a workspace debug snapshot copy action for sharing graph state without live prop values.

## 1.0.0-rc.1

### Patch Changes

- Add default export conditions for package subpaths so Next.js config loaders can resolve `react-flowmap/next`.

## 1.0.0-rc.0

### Major Changes

- Prepare the 1.0 release candidate.

  - Freeze the public package surface around `react-flowmap`, `react-flowmap/vite`, `react-flowmap/next`, `react-flowmap/rfm-context`, and `react-flowmap/graph-window`.
  - Harden dev-only safety for editor open endpoints and production instrumentation stripping.
  - Stabilize current-screen ownership semantics across Vite React, React Router, TanStack Router, and Next.js App Router.
  - Add local package verification with tarball contents and Vite/Next import smoke checks.

## 0.5.0

### Minor Changes

- 프레임워크별 데모와 README 프리뷰를 정리했습니다.

  - Vite React, TanStack Router, Next.js App Router 데모가 같은 Flowmap Ops 화면과 라우팅 흐름을 사용하도록 통일했습니다.
  - README는 실제 Flowmap workspace 중심의 프리뷰로 정리하고, 재생성 가능한 캡처 스크립트를 추가했습니다.
  - 그래프 워크스페이스 패널 접힘 UI와 IDE 선택 흐름을 개선했습니다.
  - Next.js App Router 데모의 server/client graph 검증 범위를 보강했습니다.

## 0.4.0

### Minor Changes

- 109e59c: 그래프 워크스페이스를 현재 화면의 컴포넌트 구조 중심으로 정리했습니다.

  - react-router-dom과 TanStack Router route manifest를 현재 화면 scope 기준으로 반영합니다.
  - 기본 graph canvas에서 route island를 제거하고 mounted component graph만 유지합니다.
  - 상세 패널은 props 중심으로 단순화하고 screen context 섹션을 제거했습니다.

## 0.3.1

### Patch Changes

- **그래프 뷰 Next.js 서버 컴포넌트 지원**

  - 캔버스에 서버 라우트(layout / page) 노드 표시 — amber 색상으로 구분
  - layout → page → CSR 컴포넌트 계층 연결선 렌더링
  - 서버 노드 hover / 클릭 시 실제 화면에 rect 오버레이 표시 (layout·page 모두 full-viewport)
  - 그래프 상세 패널에서 서버 라우트 선택 시 `ServerComponentDetail` 표시
  - CSR 컴포넌트 상세에서 서버 부모 노드 자동 표시

- **그래프 뷰 버그 수정**
  - 그래프 창에서 노드를 선택한 뒤 메인 창의 `graph-update` 메시지가 선택을 덮어쓰던 문제 수정 (초기 동기화 시에만 적용)
  - 상세 패널 Relations에서 센터 노드(자기 자신)가 사라지던 문제 수정

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
