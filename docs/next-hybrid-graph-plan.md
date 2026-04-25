# Next Hybrid Graph Plan

## Why This Document Exists

Next.js App Router에서는 현재 화면 구조를 이해하려면 두 종류의 정보를 함께 봐야 합니다.

- 파일 기반의 route / layout / page / server component 구조
- 브라우저에서 실제로 살아 있는 client component runtime 구조

둘 중 하나만 보여주면 반쪽입니다.

- client runtime만 보여주면 현재 화면의 파일 기반 소유 구조를 읽기 어렵습니다.
- server route / import tree만 보여주면 실제로 어떤 component가 mounted 되어 props와 상호작용을 갖는지 알기 어렵습니다.

따라서 Next 지원은 `static ownership`과 `live runtime graph`를 함께 다루는 **hybrid graph**가 되어야 합니다.

---

## Current Reality In The Codebase

현재 구현은 이미 이 hybrid graph의 재료를 일부 갖고 있습니다.

- `'use client'` 파일만 webpack loader로 변환해 runtime render 관계를 수집합니다.
- `app/` 디렉토리는 정적 스캔으로 route metadata와 import tree를 만듭니다.
- 정적 import tree는 client boundary에서 재귀를 멈춥니다.

즉 현재도 다음처럼 나뉘어 있습니다.

- client component: live runtime data가 있음
- server route / server-only component: static metadata만 있음

문제는 이 둘을 어떻게 **한 화면 안에서 의미를 섞지 않고 보여줄지**가 아직 정리되지 않았다는 점입니다.

---

## Product Position

Next 지원에서 React Flowmap은 다음을 약속해야 합니다.

- server component / route file도 보인다
- client runtime component도 보인다
- 둘은 같은 종류의 node나 edge로 위장되지 않는다

즉:

- server 쪽은 `static ownership`
- client 쪽은 `live runtime`

으로 구분해 설명해야 합니다.

`SSR/CSR`라는 말은 여기서 애매합니다.
Next의 `'use client'` component도 초기 HTML은 서버를 거칠 수 있기 때문입니다.

이 문서에서는 내부적으로 다음 용어를 사용합니다.

- `static`
- `live`

사용자에게 보이는 배지는 `SERVER` / `CLIENT` 입니다.

---

## Core Design Goal

Next graph의 기본 질문은 다음이어야 합니다.

1. 현재 화면은 어떤 route / layout / page / server component 파일 구조에서 시작되는가
2. 어디에서 client boundary로 넘어가는가
3. 그 아래에서 실제로 mounted 되어 있는 client component 구조는 어떻게 생겼는가

즉 기본 그래프는:

- 위쪽은 file-based ownership
- 경계에서 client boundary
- 아래쪽은 live runtime subtree

를 보여주는 방향이 맞습니다.

---

## Terminology

### 1. Server Route Node

`layout.tsx`, `page.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`처럼
App Router가 직접 인식하는 파일 노드입니다.

이 노드는:

- 현재 화면의 route context를 설명합니다
- DOM instance가 없습니다
- source jump와 static metadata는 가질 수 있습니다

### 2. Server-Only Component Node

server route file이 정적으로 import하는 component 중 `'use client'`가 아닌 노드입니다.

이 노드는:

- file-based ownership 구조를 설명합니다
- 브라우저에서 live props나 mounted instance를 갖지 않습니다

### 3. Client Boundary Node

정적 import tree에서 `'use client'`를 만나는 지점입니다.

이 노드는:

- static layer와 live layer를 연결합니다
- 파일 기준으로는 static graph에 속하지만
- 그 아래 subtree는 live runtime data로 연결됩니다

### 4. Client Runtime Node

실제로 브라우저에서 mounted 되어 있고, runtime render relation과 props를 가질 수 있는 노드입니다.

이 노드는:

- pick, hover, props, source jump의 주 대상입니다
- 현재 Flowmap graph의 주인공이기도 합니다

---

## Proposed Graph Layers

### Layer 1. Static Ownership Layer

포함 대상:

- active route chain의 layout / page / template / loading / error / not-found
- active route file이 정적으로 import하는 server-only component
- client boundary까지의 static ownership chain

이 레이어는 **현재 화면이 어떤 파일 구조에서 조립되는지**를 설명합니다.

### Layer 2. Boundary Layer

포함 대상:

- `'use client'` 경계 노드

이 레이어는 **static 구조가 어디서 live 구조로 전환되는지**를 설명합니다.

### Layer 3. Runtime Layer

포함 대상:

- mounted client component
- runtime render edge
- fiber ownership edge

이 레이어는 **브라우저에서 지금 실제로 살아 있는 구조**를 설명합니다.

---

## Node Semantics

기본 node 종류는 다음 네 가지가 적절합니다.

```ts
type NextGraphNodeKind =
  | 'route'
  | 'server-component'
  | 'client-boundary'
  | 'live';
```

추가로 route node에는 현재처럼 role metadata가 붙을 수 있습니다.

```ts
type RouteRole =
  | 'layout'
  | 'page'
  | 'template'
  | 'loading'
  | 'error'
  | 'not-found';
```

현재의 `isServer` 플래그 하나만으로는 이 차이를 충분히 설명하기 어렵습니다.
향후에는 `nodeKind`와 `executionKind: 'static' | 'live'` 같은 명시적 필드가 필요합니다.

---

## Edge Semantics

Next hybrid graph는 edge 종류도 분리해야 합니다.

### 1. Static Ownership Edge

- 의미: 상위 route / server component file이 하위 file을 소유한다
- 예: `RootLayout -> HomePage`
- 예: `HomePage -> ProductSection`

이 edge는 file-based ownership을 보여줍니다.

### 2. Boundary Edge

- 의미: static structure에서 client boundary로 진입한다
- 예: `HomePage -> ProductFilters.client`

이 edge는 ownership과 hydration boundary를 함께 뜻합니다.

### 3. Runtime Render Edge

- 의미: client runtime에서 parent가 child를 실제로 렌더한다
- 예: `ProductFilters -> FilterChip`

이 edge는 현재 React graph의 핵심 edge입니다.

### 4. Hidden Hint Edge

- 의미: runtime을 보정하기 위한 static fallback
- 기본 표시: 숨김 또는 layout-only

기본 Next UX에서는 이 edge를 전면에 두지 않는 편이 좋습니다.

---

## Default Next Graph

기본 graph scope는 현재 active route 기준이어야 합니다.

표시 규칙:

- inactive page / route는 제외
- active route chain만 포함
- route 아래 static ownership chain 포함
- client boundary 아래에는 현재 mounted runtime subtree 연결

이때 중요한 원칙은:

- static node와 live node를 같은 스타일로 그리지 않는다
- boundary 전환이 한눈에 보여야 한다

예시:

```text
RootLayout [route]
  -> HomePage [route]
    -> ProductSection [server-component]
      -> ProductFilters [client-boundary]
        -> FilterBar [live]
          -> FilterChip [live]
```

---

## Visual Language Direction

UI는 의미를 스타일로 분리해야 합니다.

- route node: muted + role badge + `SERVER`/`CLIENT` badge
- server-component node: muted neutral tone + `SERVER` badge
- client-boundary node: bridge 성격이 드러나는 별도 badge + `CLIENT` badge
- live runtime node: 현재와 같은 primary selection 스타일 + `CLIENT` badge

edge 스타일도 구분합니다.

- static ownership: 얇은 neutral line
- boundary: dashed 또는 transition line
- runtime render: 현재의 primary blue line

즉 사용자가 그래프만 보고도
`이건 파일 구조`인지 `이건 실제 live runtime`인지 구분할 수 있어야 합니다.

---

## Inspector Direction

선택된 node 종류에 따라 상세 패널도 달라져야 합니다.

### Route / Server-Static Node

보여줄 정보:

- file path
- route role
- static import children
- static prop types
- source jump

보여주지 않을 정보:

- live props
- mounted 여부를 의미하는 상태값
- runtime render count 같은 숫자

### Client Boundary / Client Runtime Node

보여줄 정보:

- live props
- TypeScript prop types
- source jump
- 현재 runtime subtree 안의 위치

필요하면 boundary node에는:

- "이 node 아래는 client runtime graph로 이어짐"

같은 설명 문구를 둘 수 있습니다.

---

## Picking And Highlight Behavior

Next에서는 pure server markup에 대해 브라우저에서 정확한 component owner를 찾을 수 없는 경우가 있습니다.

따라서 pick 동작은 다음처럼 가는 것이 정직합니다.

### Case 1. Client owner가 있는 경우

- nearest client runtime component 선택
- 현재와 같은 정확한 DOM highlight 사용

### Case 2. Client owner가 없는 경우

- active route 또는 nearest static owner를 fallback 선택
- 이 선택은 "static context fallback"임을 UI에서 드러냄

이때 중요한 점:

- static node에 대해 exact DOM highlight를 약속하지 않는다
- viewport 전체 박스를 exact ownership처럼 보이게 만들지 않는다

server node hover는 필요하다면:

- no highlight
- 또는 context banner 수준의 약한 피드백

으로 낮추는 편이 낫습니다.

---

## Explorer Direction

Explorer는 Next에서 hybrid graph와 같은 구조를 코드 관점으로 다시 읽게 만들어야 합니다.

즉:

- route / static / client-boundary / live 구분이 보여야 하고
- 파일 트리 안에서도 현재 active route branch가 우선적으로 보여야 합니다

기본 원칙은 graph와 explorer가 같은 의미 모델을 공유하는 것입니다.

---

## Non-goals

Next 지원에서 다음은 당장 목표로 두지 않는 편이 맞습니다.

- server render call graph 완전 추적
- pure server markup의 exact DOM ownership 보장
- parallel routes / intercepting routes / 모든 Next edge case의 완전한 시각화
- hydration lifecycle 전체를 타임라인처럼 표현

즉 v1의 목표는:

- active route spine을 보여주고
- client boundary를 드러내고
- live runtime subtree를 정확히 보여주는 것

입니다.

---

## Implementation Phases

### Phase 1. Terms And UI Contract

- `SSR/CSR` 대신 내부는 `static/live`, 사용자 배지는 `SERVER/CLIENT`로 통일
- 현재 문서와 UI copy에서 의미를 바로잡기
- `isServer`가 곧 `SSR`이라는 오해를 줄이기

### Phase 2. Next-Specific Node Model

- route
- server-component
- client-boundary
- live

을 구분하는 node model 추가

### Phase 3. Hybrid Graph Renderer

- active route shell을 상단에 배치
- boundary 아래에 runtime subtree 연결
- static ownership / runtime render / boundary edge를 시각적으로 분리

### Phase 4. Picker Fallback

- client owner miss 시 static fallback selection 도입
- fallback selection임을 UI에서 표시
- server node hover는 exact overlay를 약하게 하거나 제거

### Phase 5. Tests

- active route shell이 graph에 포함되는지
- client boundary 아래 runtime subtree가 붙는지
- pure server route 선택이 live props UI를 노출하지 않는지
- client pick과 server fallback pick이 모두 동작하는지

---

## Success Criteria

Next App Router에서 다음이 가능하면 이 방향은 성공입니다.

- 현재 화면이 어떤 route / layout / page 구조에서 시작되는지 보인다
- 어디서 client boundary로 넘어가는지 보인다
- client boundary 아래 live runtime component graph가 정확히 보인다
- 사용자가 static 구조와 live 구조를 혼동하지 않는다
- source jump와 props reading이 여전히 빠르다

---

## Bottom Line

Next 지원의 정답은 `server를 없애는 것`이 아니라 `server를 runtime처럼 위장하지 않는 것`입니다.

React Flowmap의 Next graph는:

- static ownership을 보여주고
- client boundary를 드러내고
- live client runtime subtree를 이어 붙이는

**hybrid graph**가 되어야 합니다.
