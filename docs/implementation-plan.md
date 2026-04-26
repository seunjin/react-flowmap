# React Flowmap 1.0 Release Plan

## Purpose

이 문서는 React Flowmap을 `1.0.0`으로 올리기 전까지의 실행 계획을 정의합니다.

이전 구현 계획은 초기 PoC phase를 기준으로 작성되어 있었고, 현재 코드베이스는 이미 Vite, React Router, TanStack Router, Next.js App Router 데모와 popup workspace, server/client graph 검증을 상당 부분 갖춘 상태입니다.

1.0 제품 정의는 "React runtime graph를 완벽히 재현하는 도구"가 아니라 "현재 화면의 DOM 조각이 어떤 source file / component / route context에서 왔는지 찾아주는 screen-to-source ownership tool"입니다. Next.js App Router, SSR, RSC에서는 server component의 live React instance가 브라우저에 없기 때문에 runtime fiber graph처럼 취급하지 않습니다. 대신 build-time manifest, SSR/CSR DOM owner marker, CSR runtime fiber supplement를 합쳐 현재 화면 ownership map을 만듭니다.

따라서 지금의 계획은 "무엇을 새로 만들 것인가"보다 다음 질문에 답하는 데 집중합니다.

- 1.0에서 어떤 경험과 API를 안정 계약으로 약속할 것인가
- 현재 구현과 문서가 어긋난 지점은 무엇인가
- 릴리즈 전에 반드시 고정해야 할 회귀 검증은 무엇인가
- Next.js, packaging, editor sidecar처럼 깨지기 쉬운 부분을 어떻게 hardening할 것인가

---

## Current Baseline

기준일: 2026-04-26

| 영역 | 현재 상태 | 1.0 판단 |
| --- | --- | --- |
| 패키지 버전 | `1.0.0-rc.4` | Next client boundary merge, debug snapshot, owner marker rect 보정을 포함한 release candidate 준비됨 |
| Vite React 지원 | 구현됨 | 1.0 핵심 지원 대상 |
| React Router 데모 | 구현됨 | Vite routing 검증 대상 |
| TanStack Router 데모 | 구현됨 | Vite routing 검증 대상 |
| Next.js App Router 지원 | 제한 있는 지원으로 검증됨 | `next dev --webpack` 범위에서 1.0 지원 |
| Turbopack | 미지원 | 1.0 범위 밖, README에 명시 |
| Popup workspace | 구현됨 | 1.0 기본 UX |
| In-app overlay | 구현됨 | workspace 진입점 및 highlight bridge |
| Props/type metadata | 구현됨 | 1.0 핵심 기능 |
| Source jump/editor select | root-boundary guard 구현됨 | editor command 정책 검토 필요 |
| Build/export 설정 | 구현 및 tarball smoke 검증됨 | `pnpm verify:package`로 반복 검증 |
| Changesets | 설정됨 | 1.0 versioning flow에 사용 |

최근 확인 결과:

- `pnpm lint`: 통과
- `pnpm typecheck`: 통과
- `pnpm test`: 통과
- `pnpm build`: 통과
- `pnpm verify:package`: 통과, `react-flowmap-1.0.0-rc.4.tgz` 299.4 KB / source maps 10개
- `pnpm test:e2e`: 통과, 28 tests

---

## 1.0 Product Contract

1.0에서 React Flowmap이 안정적으로 보장해야 하는 기본 계약은 다음입니다.

1. 사용자는 앱 화면에서 UI 조각을 선택할 수 있다.
2. 선택한 UI 조각의 owning component와 source file을 확인할 수 있다.
3. source jump로 바로 편집기에서 해당 파일을 열 수 있다.
4. mounted client component는 live props와 TypeScript props type을 보여준다.
5. 현재 화면의 route subtree 기준 graph와 explorer가 같은 selection을 공유한다.
6. Vite React, React Router, TanStack Router, Next.js App Router에서 핵심 흐름이 일관된다.
7. Next.js App Router에서는 static/server node와 live/client node를 혼동시키지 않는다.
8. production build에는 dev inspector 계측이 들어가지 않는다.
9. SSR/RSC source ownership에는 `withFlowmap()` build transform이 필요하며 provider-only 설치가 가능하다고 문서화하지 않는다.

1.0에서 약속하지 않는 것은 다음입니다.

- Turbopack 지원
- DOM marker가 없는 pure server markup의 정확한 component ownership 보장
- 네트워크 요청 분석을 중심으로 한 DevTools 대체 기능
- 함수 호출/훅/API까지 포함한 범용 dependency graph
- repo 전체 소스 브라우저
- multi-instance switching

---

## Release Gates

`1.0.0` 태그 전에는 아래 gate가 모두 통과해야 합니다.

### Gate 1. Core Quality

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- core/runtime/ui model 테스트가 현재 제품 계약을 설명하는 이름과 fixture를 가진다.

### Gate 2. Demo E2E

- `pnpm test:e2e`
- Vite React demo:
  - inspector button mount
  - workspace open
  - graph data reload 유지
  - React Router route transition 후 현재 화면 graph 유지
- TanStack Router demo:
  - inspector button mount
  - workspace open
  - route transition 후 현재 화면 graph 유지
- Next demo:
  - route/layout/page/server component node 표시
  - client boundary 중복 없음
  - route transition 반영
  - server node detail에서 parent layout과 client boundaries 표시
  - static owner highlight와 client runtime highlight 동작

### Gate 3. Package Contract

- `pnpm build`
- `pnpm verify:package`
- `dist/`에 공개 subpath별 JS와 `.d.ts`가 생성된다.
- `package.json` `exports`와 실제 build output이 일치한다.
- fresh Vite app에서 `react-flowmap` 설치 후 `react-flowmap/vite`가 동작한다.
- fresh Next App Router app에서 `react-flowmap/next`가 `next dev --webpack` 기준으로 동작한다.
- Next-only 사용자의 `vite` peer warning 처리 방침을 결정하고 README에 반영한다.

### Gate 4. Dev-Only Safety

- dev server에서만 instrumentation이 동작한다.
- production build에는 runtime owner marker, static owner marker, graph window guard, sidecar define 값이 들어가지 않는다.
- editor open endpoint/sidecar는 project root 밖 파일을 열지 못한다.
- editor parameter는 알려진 editor 또는 명시적인 custom command 정책으로 제한/문서화한다.
- sidecar port 충돌 시 사용자가 이해할 수 있는 warning이 남는다.

### Gate 5. Documentation

- README가 1.0 지원 범위와 제한을 정확히 말한다.
- `docs/product-direction.md`와 실제 UX가 모순되지 않는다.
- `docs/architecture.md`가 current screen, ownership, static/live boundary를 현재 구현 기준으로 설명한다.
- `docs/data-schema.md`가 Next/static route metadata와 현재 DocIndex/graph model의 차이를 숨기지 않는다.
- CHANGELOG에 1.0 변경 범위와 breaking/non-breaking 판단이 남는다.

---

## Workstreams

### P0. Documentation Sync

목표: 오래된 phase 문서를 현재 코드 상태와 맞춘다.

Tasks:

- 이 문서를 1.0 release plan으로 갱신한다.
- README의 "Partial" Next 지원 문구를 1.0 목표 문구와 맞춘다.
- `docs/data-schema.md`가 초기 file-level graph 중심 설명에 머무는 부분을 현재 workspace model과 비교해 갱신한다.
- `docs/glossary.md`에 `static`, `live`, `server component`, `client boundary`, `route node`를 추가한다.
- `docs/architecture.md`의 package responsibilities와 open questions를 현재 구현 기준으로 정리한다.

Exit criteria:

- 새 contributor가 문서만 읽어도 1.0에서 무엇을 지원하고 무엇을 지원하지 않는지 알 수 있다.

### P1. Public API Freeze

목표: 1.0 이후 semver로 보호할 public surface를 확정한다.

Status: completed in the current 1.0 preparation branch. The package export map is now treated as the public contract and covered by `tests/public-api/public-api.test.ts`.

Public surface:

- `react-flowmap`
  - `ReactFlowMap`
  - config types
  - advanced graph/runtime/doc helpers
- `react-flowmap/vite`
  - `flowmapInspect`
  - `FlowmapInspectOptions`
- `react-flowmap/next`
  - `withFlowmap`
  - `WithFlowmapOptions`
  - `openInEditor` compatibility helper
- `react-flowmap/rfm-context`
  - instrumentation runtime bridge for custom integrations
- `react-flowmap/graph-window`
  - standalone workspace window entry for custom tooling

Internal implementation details:

- Babel transform bundle
- Next webpack loader
- editor sidecar helpers
- inspector implementation components such as `ComponentOverlay`, `InspectButton`, `EntryDetail`

Tasks:

- [x] `src/index.ts` re-export 범위를 검토한다.
- [x] `package.json` `exports`를 public contract로 확정한다.
- [x] `packages/babel-plugin`은 private workspace package / internal build artifact로 유지한다.
- [x] README의 Advanced exports 섹션을 package export map과 맞춘다.
- [x] public export map과 root package API를 테스트로 고정한다.

Exit criteria:

- README의 "Advanced exports"와 `package.json` exports가 같은 계약을 말한다.

### P2. Ownership Graph Semantics

목표: 기본 graph를 current screen ownership 중심으로 유지한다.

Status: in progress for the screen-to-source 1.0 direction. Graph projection now distinguishes `LIVE`, `STATIC-DOM`, and `STATIC-DECLARED` so the UI can prefer currently observed DOM owners while still showing route/import candidates as lower-confidence context.

Tasks:

- [x] 기본 graph layout 입력에서 ownership edge와 declaration fallback의 의미를 테스트로 고정한다.
- [x] `staticJsx`는 fallback/hint로만 쓰고, runtime/fiber ownership과 경쟁하지 않도록 테스트를 보강한다.
- [x] React Router route declaration이 route island처럼 보이지 않는지 e2e와 unit test로 고정한다.
- [x] TanStack Router `Outlet` mediated ownership이 fiber relation으로 유지되는지 테스트한다.
- [x] node category를 global `page/component`보다 current route role badge 중심으로 설명한다.
- [x] `LIVE`, `STATIC-DOM`, `STATIC-DECLARED` projection 상태를 schema와 graph entry에 반영한다.
- [x] static DOM marker로 관측된 owner를 `STATIC-DOM`으로 표시하고, import tree에만 있는 후보를 `STATIC-DECLARED`로 표시한다.

Exit criteria:

- 사용자가 graph를 봤을 때 "실제 화면 ownership"과 "route declaration"을 혼동하지 않는다.

### P3. Next App Router Hardening

목표: Next 지원을 "부분 구현"이 아니라 명시적 제한을 가진 안정 기능으로 만든다.

Status: in progress for the screen-to-source 1.0 direction. Route scanner behavior, production stripping, server/static detail behavior, client boundary de-duplication, route transitions, static DOM owner pick, and nested static owner marker behavior are covered by unit/e2e tests.

1.0 지원 범위:

- App Router
- `next dev --webpack`
- route/layout/page/template/loading/error/not-found static route node
- server-only component static ownership node
- `'use client'` boundary와 live runtime subtree
- source jump, static prop types, parent layout, reachable client boundaries

1.0 제외 범위:

- Turbopack
- 모든 parallel/intercepting route edge case
- pure server markup의 exact component pick
- server component live props

Tasks:

- [x] `scanAppDirectory()`가 route groups, dynamic segments, ignored folders를 문서화된 방식으로 처리하는지 fixture test를 추가한다.
- [x] `transformStaticOwnerMarks()`가 production build에서 실행되지 않는지 검증한다.
- [x] server/static node detail에서 live props UI가 노출되지 않는지 테스트한다.
- [x] client boundary node 중복 제거 규칙을 unit/e2e로 고정한다.
- [x] route transition 후 popup workspace가 stale route를 보여주지 않는지 e2e를 유지한다.
- [x] `findComponentsAt()`이 live fiber가 없는 static DOM owner marker를 `static:<filePath>#<componentName>` selection으로 반환한다.
- [x] `transformStaticOwnerMarks()`가 route/page root뿐 아니라 nested server component host root에도 marker를 붙이는지 테스트한다.

Exit criteria:

- README의 Next 설명이 실제 구현과 정확히 일치한다.

### P4. Dev-Only Safety And Editor Open

목표: dev tool이라도 local machine에서 과하게 열려 있지 않게 한다.

Tasks:

- Vite `/__rfm-open`에서 `file` query가 project root 밖으로 resolve되지 않도록 막는다.
- Next sidecar open route도 같은 root-boundary check를 적용한다.
- `editor` query parameter 정책을 정한다.
- editor availability endpoint가 필요한 최소 정보만 반환하는지 확인한다.
- sidecar listen host를 `127.0.0.1`로 유지하고 README에 이유를 짧게 문서화한다.

Exit criteria:

- source jump가 편하지만, arbitrary local file opener처럼 동작하지 않는다.

### P5. Packaging And Install Verification

목표: npm 설치 사용자가 문서대로 따라 했을 때 동작한다.

Status: completed for the local 1.0 preparation branch. `pnpm verify:package` builds on top of the generated `dist/`, creates an npm tarball with `pnpm pack`, validates packed files/source maps/package size, and smoke-loads the tarball from temporary Vite and Next-style apps.

Tasks:

- [x] `pnpm build` output을 확인한다.
- [x] `npm pack` 또는 임시 fixture app 설치 방식으로 루트 패키지를 검증한다.
- [x] fresh Vite app fixture에서 `flowmapInspect()`와 `<ReactFlowMap />`가 동작하는지 확인한다.
- [x] fresh Next app fixture에서 `withFlowmap()`과 client wrapper가 동작하는지 확인한다.
- [x] `files` 필드에 필요한 runtime assets만 포함되는지 확인한다.
- [x] source map 포함 여부와 package size를 확인한다.

Exit criteria:

- registry publish 전 로컬 tarball로 Vite/Next 양쪽이 재현 가능하게 동작한다.

### P6. Release Candidate Flow

목표: 바로 `1.0.0`을 찍지 않고 beta/rc에서 설치 검증을 거친다.

Status: in progress. `1.0.0-rc.0` was published and verified from a registry-installed temporary project. `1.0.0-rc.4` is prepared locally with the Next config loader fix, client boundary merge fix, debug snapshot copy action, and owner marker rect alignment; publish and verify it before collecting the next round of rc feedback.

Tasks:

- [x] `1.0.0-rc.0` changeset prerelease를 만든다.
- [x] npm `rc` tag로 publish한다.
- [x] 실제 외부 fixture에서 설치 검증한다.
- [x] `1.0.0-rc.1` Next config loader 호환성 패치를 만든다.
- [x] `1.0.0-rc.2` Next client boundary merge와 debug snapshot 패치를 만든다.
- [x] `1.0.0-rc.3` owner visual rect 패치를 만든다.
- [x] `1.0.0-rc.4` owner marker rect alignment 패치를 만든다.
- npm `rc` tag로 `1.0.0-rc.4`를 publish한다.
- 실제 외부 fixture에서 `1.0.0-rc.4`를 설치 검증한다.
- 문제를 patch한 뒤 `rc`를 반복한다.
- 마지막 rc와 main 문서가 일치하면 `1.0.0`으로 version/publish한다.

Exit criteria:

- 1.0.0 publish 전에 package install, type import, dev server, e2e smoke가 한 번 이상 registry artifact로 검증된다.

---

## Suggested Execution Order

1. P0 Documentation Sync
2. P1 Public API Freeze
3. P4 Dev-Only Safety And Editor Open
4. P2 Ownership Graph Semantics
5. P3 Next App Router Hardening
6. P5 Packaging And Install Verification
7. P6 Release Candidate Flow

이 순서를 권장하는 이유:

- 먼저 문서와 public API를 맞춰야 이후 변경이 1.0 계약을 흔들지 않는다.
- editor open safety는 기능 추가보다 릴리즈 리스크가 크므로 초반에 막는다.
- graph semantics와 Next hardening은 UX 품질을 고정하는 작업이다.
- packaging 검증은 코드와 문서가 안정된 뒤 해야 의미가 있다.

---

## Immediate Next Checklist

가장 먼저 처리할 작업은 다음입니다.

- [x] `docs/glossary.md`에 static/live/route/client boundary 용어 추가
- [x] `docs/data-schema.md`를 현재 workspace/Next hybrid graph 모델과 맞추기
- [x] editor open root-boundary guard 추가
- [x] editor query command 제한 추가
- [x] editor open guard 테스트 추가
- [x] `pnpm lint && pnpm typecheck && pnpm test`
- [x] 권한 있는 로컬 환경에서 `pnpm test:e2e`
- [x] `pnpm build`

---

## Release Decision Rule

다음 중 하나라도 남아 있으면 `1.0.0` 대신 beta/rc로만 배포합니다.

- e2e가 권한 있는 환경에서 통과하지 않았다.
- production build에서 dev marker 제거를 검증하지 않았다.
- Next 지원 범위와 README 설명이 다르다.
- public exports 중 내부 구현으로 남겨야 할 항목이 정리되지 않았다.
- source jump가 project root 밖 파일을 열 수 있다.

1.0은 기능 수의 문제가 아니라, 사용자가 README대로 설치했을 때 같은 경험을 안정적으로 얻는지의 문제입니다.
