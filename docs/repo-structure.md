# Gori Repository Structure

## Purpose

이 문서는 Gori v1의 Phase 0에서 사용할 저장소 구조와 초기 파일 배치를 정의합니다.  
목표는 구현을 시작하기 전에 코드 책임 경계를 분명히 하고, 이후 Phase 1~8이 구조적으로 흔들리지 않도록 기준선을 만드는 것입니다.

이 문서는 다음 질문에 답합니다.

- Gori는 어떤 디렉터리 구조로 시작해야 하는가
- 어떤 책임이 어떤 폴더에 들어가야 하는가
- 초기에는 어떤 파일들만 있으면 충분한가

---

## Repository Shape

Gori v1은 **단일 패키지 저장소(single package repo)** 로 시작합니다.

초기 최상위 구조:

```text
docs/
src/
demo/
tests/
```

이유:

- 아직 배포 단위가 `core`, `runtime`, `ui`로 분리된 상태가 아니다.
- 초기에는 구조적 경계가 중요하지, 패키지 분리는 중요하지 않다.
- 나중에 필요하면 `packages/` 기반 구조로 확장할 수 있다.

---

## Top-level Directories

### `docs/`

설계 문서와 운영 기준 문서를 저장합니다.

포함 대상:

- 소개 문서
- UI 개념 문서
- 용어집
- 아키텍처 문서
- 데이터 스키마 문서
- 실행 계획
- 유지보수 가이드
- 저장소 구조 문서

이 폴더는 구현 이전의 설계 기준선이며, schema-first 변경 규칙의 출발점입니다.

---

### `src/`

실제 라이브러리 코드를 둡니다.

핵심 원칙:

- `src/core`는 UI와 런타임 환경에 독립적이어야 한다.
- `src/runtime`은 관측을 담당한다.
- `src/static`은 정적 메타데이터를 담당한다.
- `src/ui`는 표현을 담당한다.

---

### `demo/`

Gori를 실제로 연결해볼 수 있는 최소 데모 앱을 둡니다.

목적:

- 문서 예제와 유사한 흐름을 실제로 검증
- collector와 builder가 실제 앱에서 동작하는지 확인
- UI 시각화 프로토타입의 수동 회귀 검증

초기 데모는 작고 설명 가능해야 합니다.

---

### `tests/`

코어 로직과 projection 규칙을 검증하는 테스트를 둡니다.

핵심 원칙:

- fixture 기반 테스트를 우선한다.
- UI 테스트보다 core 테스트가 먼저다.
- 작은 예제를 많이 두는 방식으로 회귀를 막는다.

---

## `src/` Structure

추천 초기 구조:

```text
src/
  core/
    types/
    ids/
    graph/
    projection/
    selection/
    inspector/
  runtime/
    events/
    collector/
  static/
    metadata/
  ui/
    canvas/
    nodes/
    inspector/
```

---

## `src/core/`

Gori의 핵심 데이터 모델과 순수 로직이 위치합니다.

여기에는 다음만 있어야 합니다.

- 타입 정의
- 그래프 저장소
- 그래프 생성
- projection
- selection
- inspector 데이터 모델

여기에는 다음이 있으면 안 됩니다.

- React 컴포넌트
- 브라우저 DOM 접근
- 시각화 라이브러리 종속 코드

### `src/core/types/`

문서에서 정의한 타입의 실제 구현 위치입니다.

초기 파일 제안:

```text
src/core/types/
  graph.ts
  runtime-events.ts
  projection.ts
  selection.ts
  inspector.ts
  static-metadata.ts
```

역할:

- `graph.ts`: `FileNode`, `SymbolNode`, `ApiNode`, `GoriEdge`, `GoriGraph`
- `runtime-events.ts`: `RuntimeEvent` 관련 타입
- `projection.ts`: `FileEdge`, `FileLevelView`
- `selection.ts`: `SelectionState`, `SelectionMode`
- `inspector.ts`: Inspector payload 타입
- `static-metadata.ts`: `ImportRef`, `FileStaticMetadata`

### `src/core/ids/`

ID 생성 규칙과 파싱 유틸을 둡니다.

초기 파일 제안:

```text
src/core/ids/
  create-file-id.ts
  create-symbol-id.ts
  create-api-id.ts
  parse-id.ts
```

역할:

- 안정적인 ID 생성
- 테스트와 projection에서 재사용

### `src/core/graph/`

그래프 저장과 정규화를 담당합니다.

초기 파일 제안:

```text
src/core/graph/
  graph-store.ts
  in-memory-graph-store.ts
  graph-builder.ts
```

역할:

- `graph-store.ts`: 저장소 인터페이스
- `in-memory-graph-store.ts`: 메모리 기반 구현
- `graph-builder.ts`: `RuntimeEvent[] -> GoriGraph`

### `src/core/projection/`

symbol graph를 file-level view로 투영합니다.

초기 파일 제안:

```text
src/core/projection/
  project-to-file-level-view.ts
  build-file-edge.ts
```

역할:

- `FileEdge` 생성
- supporting edge 집계
- same-file relation 제외

### `src/core/selection/`

선택 상태와 view 계산 규칙을 담당합니다.

초기 파일 제안:

```text
src/core/selection/
  apply-selection.ts
  filter-by-hop.ts
  filter-by-mode.ts
```

역할:

- `both | outgoing | incoming`
- `1-hop` 제한
- 다중 선택 합집합

### `src/core/inspector/`

Inspector에 필요한 파생 데이터를 만듭니다.

초기 파일 제안:

```text
src/core/inspector/
  build-inspector-payload.ts
  summarize-symbol-relations.ts
```

---

## `src/runtime/`

실행 중 이벤트를 관측하는 코드를 둡니다.

### `src/runtime/events/`

런타임 이벤트 생성 유틸과 관련 타입 연결 코드를 둡니다.

초기 파일 제안:

```text
src/runtime/events/
  create-render-event.ts
  create-hook-usage-event.ts
  create-function-call-event.ts
  create-request-event.ts
```

### `src/runtime/collector/`

실제 관측기 구현을 둡니다.

초기 파일 제안:

```text
src/runtime/collector/
  collector.ts
  fetch-interceptor.ts
```

초기 원칙:

- v1 PoC는 `fetch` interception부터 시작
- 컴포넌트/훅/함수 계측은 이후 단계에서 확장

---

## `src/static/`

정적 메타데이터 수집 로직을 둡니다.

### `src/static/metadata/`

초기 파일 제안:

```text
src/static/metadata/
  collect-file-static-metadata.ts
  collect-imports.ts
  collect-exports.ts
```

v1에서는 구현이 비어 있어도 괜찮지만, 폴더 경계는 미리 잡아두는 것이 좋습니다.

---

## `src/ui/`

시각화와 인터랙션 레이어를 둡니다.

### `src/ui/canvas/`

캔버스와 전체 뷰 조합

초기 파일 제안:

```text
src/ui/canvas/
  gori-canvas.tsx
  file-level-view.tsx
```

### `src/ui/nodes/`

파일 노드 UI

초기 파일 제안:

```text
src/ui/nodes/
  file-node.tsx
  export-list.tsx
  export-item.tsx
```

### `src/ui/inspector/`

사이드바 UI

초기 파일 제안:

```text
src/ui/inspector/
  inspector-sidebar.tsx
  symbol-relation-list.tsx
```

중요:

- UI는 `core` 계산 결과를 소비만 해야 한다.
- projection, selection 규칙을 UI 안에 다시 쓰면 안 된다.

---

## `demo/` Structure

현재 데모는 FSD(Feature-Sliced Design) 구조의 e-커머스 앱입니다.

```text
demo/
  src/
    entities/
      product/        — ProductCard, ProductBadge, ProductPrice
      cart/           — CartItem
      user/           — UserMenu
    features/
      category-filter.tsx
      add-to-cart.tsx
      quantity-control.tsx
    widgets/
      product-catalog.tsx
      product-detail.tsx
      cart-summary.tsx
    pages/
      home-page.tsx
      product-page.tsx
      cart-page.tsx
    shared/
      types.ts
      api/
    app.tsx
    main.tsx
    component-overlay.tsx   — Inspector UI (hover/select/editor open)
    gori-runtime.ts         — __goriCollector, __goriSession re-export
```

데모 목표:

- 실제 프로젝트 수준의 FSD 구조에서 Inspector 동작 검증
- 리스트 아이템 등 동일 컴포넌트 다중 인스턴스 시나리오 포함
- API 호출 추적 (`/api/products`, `/api/cart` 등)

---

## `tests/` Structure

추천 구조:

```text
tests/
  fixtures/
    simple-user-flow.ts
    same-file-call.ts
    unused-import.ts
  core/
    graph-builder.test.ts
    graph-store.test.ts
  projection/
    file-level-view.test.ts
  selection/
    apply-selection.test.ts
  inspector/
    build-inspector-payload.test.ts
```

### `tests/fixtures/`

작고 설명 가능한 예제 입력을 저장합니다.

예:

- `simple-user-flow.ts`
- `same-file-call.ts`
- `unused-import.ts`

이 fixture는 문서 예제와 테스트 예제를 연결하는 역할을 합니다.

---

## Minimal Initial File Set

Phase 0가 끝났다고 볼 수 있는 최소 파일 세트는 아래 정도입니다.

```text
src/
  core/
    types/
      graph.ts
      runtime-events.ts
      projection.ts
      selection.ts
      inspector.ts
      static-metadata.ts
    ids/
      create-file-id.ts
      create-symbol-id.ts
      create-api-id.ts
    graph/
      graph-store.ts
      in-memory-graph-store.ts
  runtime/
    collector/
      collector.ts
  ui/
    canvas/
      gori-canvas.tsx
demo/
  src/
    main.tsx
tests/
  fixtures/
    simple-user-flow.ts
  core/
    graph-store.test.ts
```

초기에는 빈 파일이어도 괜찮습니다.  
중요한 것은 기능 완성이 아니라 **역할 경계가 올바르게 잡혀 있는가**입니다.

---

## Import Direction Rules

초기부터 import 방향을 명확히 해야 유지보수가 쉬워집니다.

허용 방향:

- `ui -> core`
- `runtime -> core`
- `static -> core`

금지 방향:

- `core -> ui`
- `core -> runtime`
- `core -> static`

즉, `core`는 가장 안쪽 레이어여야 합니다.

---

## Naming Rules

초기 파일 이름 규칙도 같이 고정하는 것이 좋습니다.

- 파일명은 `kebab-case`
- 타입 export 이름은 `PascalCase`
- 함수 이름은 `camelCase`
- 생성 함수는 `create-*`
- 빌더 함수는 `build-*`
- projection 함수는 `project-*`

예:

- `create-file-id.ts`
- `build-inspector-payload.ts`
- `project-to-file-level-view.ts`

---

## Recommended Next Step

이 문서를 기준으로 다음 순서로 내려가면 됩니다.

1. 실제 디렉터리와 빈 파일 생성
2. TypeScript / 테스트 환경 설정
3. `src/core/types`부터 채우기
4. `GraphStore` 뼈대 구현

---

## Summary

Gori v1의 Phase 0 저장소 구조는 다음 원칙 위에 세워집니다.

- 단일 패키지 저장소로 시작한다.
- `core`, `runtime`, `static`, `ui`를 분리한다.
- `demo`와 `tests`를 초기에 함께 둔다.
- core는 가장 안쪽 레이어로 유지한다.
- 역할 경계가 기능보다 먼저 만들어져야 한다.

이 문서는 이후 실제 폴더 생성과 초기 프로젝트 부트스트랩의 기준 문서로 사용합니다.
