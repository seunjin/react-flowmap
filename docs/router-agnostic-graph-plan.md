# Router-Agnostic Graph Plan

## Why This Document Exists

React Flowmap의 기본 목표는 특정 라우터의 내부 구현을 시각화하는 것이 아니라, **현재 화면의 UI 조각이 어떤 컴포넌트에 의해 소유되고 어떤 구조로 조립되어 있는지 보여주는 것**입니다.

하지만 현재 그래프는 runtime render 관계, static JSX 관계, route declaration 관계를 한 화면에 같은 종류의 edge로 섞어 보여줍니다.

이 문서는 다음 두 가지를 정리합니다.

- `react-router-dom`과 `tanstack-router`를 모두 지원할 수 있는 공통 그래프 모델
- 현재 graph window를 어떤 렌더링 방식으로 유지하거나 교체할지에 대한 판단 기준

---

## Current Problem

현재 구현은 graph layout과 edge rendering에서 다음 관계를 함께 사용합니다.

- runtime `render` / `use`
- `staticJsx`
- `fiberRelations`
- Next route edge

이 방식은 보정에는 도움이 되지만, 사용자에게는 관계의 의미를 흐리게 만듭니다.

예를 들어 React Router에서:

- `App -> HomePage`는 실제 화면 ownership 관계에 가깝습니다.
- `AppRouter -> HomePage`는 route definition 안에서 `element={<HomePage />}`로 참조한 정적 선언 관계입니다.

두 관계가 같은 파란 선으로 보이면 사용자는 "누가 실제로 이 UI를 렌더하고 있는가"를 읽기 어렵습니다.

---

## Design Goal

React Flowmap은 라우터를 설명하는 도구가 아니라 **컴포넌트 ownership inspector** 여야 합니다.

따라서 기본 그래프는 다음 질문에 답해야 합니다.

- 지금 화면에서 이 UI를 실제로 누가 렌더하고 있는가
- 현재 화면 구조에서 이 컴포넌트는 어디에 위치하는가
- 이 route는 어떤 상위 context 안에서 렌더되고 있는가

즉:

- component graph가 주인공이다
- route graph는 context다
- declaration graph는 기본 숨김 정보다

---

## Edge Semantics

React Flowmap은 edge를 의미별로 분리해야 합니다.

### 1. Ownership Edge

기본 그래프에서 보여줄 edge입니다.

- 의미: 현재 화면에서 parent component가 child component를 실제로 렌더한다
- 소스 후보: runtime render edge, live fiber parent-child relation
- 기본 표시: `visible`

이 edge만으로도 사용자는 현재 화면의 실제 구조를 읽을 수 있어야 합니다.

### 2. Route Context Edge

현재 active route chain을 설명하는 context edge입니다.

- 의미: 현재 location에서 어떤 route/layout/page chain이 활성화됐는가
- 소스 후보:
  - React Router `matchRoutes`
  - React Router data router의 `useMatches`
  - TanStack Router `useMatches`
- 기본 표시: `visible`, 하지만 component ownership edge와는 다른 시각 언어 사용

이 edge는 component graph와 섞이지 않고 breadcrumb, lane, header, 별도 style로 보여주는 편이 맞습니다.

### 3. Declaration Edge

정적 선언 관계입니다.

- 의미: 어떤 component file 또는 route definition이 어떤 component symbol을 참조한다
- 소스 후보: `staticJsx`, route manifest import analysis
- 기본 표시: `hidden`

이 edge는 advanced mode나 debug mode에서만 노출하는 것이 적절합니다.

### 4. Hint Edge

런타임에서 못 잡힌 관계를 보완하기 위한 edge입니다.

- 의미: ownership일 가능성이 높지만 확정적이지 않은 보정 관계
- 소스 후보: alias import, wrapper, router mediation, static inference
- 기본 표시: `layout-only` 또는 `hidden`

핵심 원칙은 **보정 정보가 기본 UX를 오염시키면 안 된다**는 점입니다.

---

## Graph Layers

그래프는 하나의 데이터셋이 아니라, 목적이 다른 레이어들의 조합으로 보는 편이 맞습니다.

### Component Layer

- 실제 mounted component
- runtime ownership 중심
- 선택, hover, props, source jump의 기준 레이어

### Route Layer

- 현재 active route match chain
- layout / page / index route 맥락
- 현재 화면의 시작점을 설명하는 보조 레이어

### Declaration Layer

- file import / JSX declaration / route definition
- 컴포넌트 구조를 해석할 때 참고 가능한 보조 레이어

기본 graph window는 `Component Layer + Route Layer`까지만 보여주고,
`Declaration Layer`는 나중에 토글로 여는 방향이 적절합니다.

---

## Router-Agnostic Data Model

라우터를 가리지 않으려면 내부적으로 route 정보를 같은 형태로 정규화해야 합니다.

```ts
type RouteManifestNode = {
  id: string;
  parentId?: string;
  path?: string;
  index?: boolean;
  kind: 'route' | 'layout' | 'page';
  filePath: string;
  componentName: string;
  componentSymbolId?: string;
};

type ActiveRouteMatch = {
  routeId: string;
  pathname: string;
  params: Record<string, string>;
};
```

이 모델의 목적은 다음과 같습니다.

- 어떤 라우터를 쓰든 active route chain을 공통 형식으로 다룬다
- route node와 component node를 느슨하게 연결한다
- route는 component graph의 parent처럼 행동하지 않고 context로만 참여한다

---

## React Router Strategy

React Router는 JSX route 선언과 route object 선언을 모두 지원합니다. 공식 문서도 두 방식의 동작이 동일하다고 설명합니다.

- [React Router Route](https://reactrouter.com/6.30.3/route/route)
- [React Router matchRoutes](https://reactrouter.com/api/utils/matchRoutes)
- [React Router useMatches](https://reactrouter.com/v6/hooks/use-matches)

따라서 React Flowmap에서는 다음 전략이 적절합니다.

### Build-time

- `<Route>` JSX 또는 route object를 route manifest로 정규화
- `element={<HomePage />}`와 `Component={HomePage}`를 route ownership 후보로 저장
- 이 정보는 component graph edge가 아니라 route metadata로 저장

### Runtime

- data router를 쓰면 `useMatches()`로 active route chain을 얻는다
- declarative `<Routes>`만 쓰면 정적 manifest + `matchRoutes(location)`로 active route chain을 계산한다

### Important Rule

`element={<HomePage />}`는 route declaration 정보이지, 기본 graph에서의 direct component ownership edge가 아닙니다.

즉:

- `Route -> HomePage`는 context/declaration 관계
- `App -> HomePage`는 ownership 관계

둘은 분리해서 표시해야 합니다.

---

## TanStack Router Strategy

TanStack Router는 route tree가 더 명시적입니다.

- [TanStack Router createRoute](https://tanstack.com/router/latest/docs/api/router/createRouteFunction)
- [TanStack Router useMatches](https://tanstack.com/router/latest/docs/api/router/useMatchesHook)

현재 데모처럼 `createRoute({ component: HomePage })` 구조에서는 route manifest 추출이 React Router보다 오히려 단순합니다.

### Build-time

- `createRootRoute`, `createRoute`, `addChildren`을 분석해 route tree manifest 생성
- `component` 참조는 route metadata로 저장

### Runtime

- `useMatches()`로 active route chain 획득
- route id, pathname, params를 공통 `ActiveRouteMatch`로 정규화

### Important Rule

`route.component = HomePage` 역시 declaration/context 정보로 취급해야 합니다.

기본 그래프에서 `RootRoute -> HomePage` 같은 선을 main ownership edge로 그리면 안 됩니다.

---

## Category And Badge Direction

현재처럼 component 자체를 `page` / `component`로 전역 분류하는 방식은 router-agnostic 목표와 충돌할 가능성이 큽니다.

더 나은 방향은:

- 기본 category는 대부분 `component`
- route manifest와 연결된 경우에만 role badge를 붙임
- badge는 전역 정체성이 아니라 현재 screen context 안의 역할을 뜻함

예:

- `App` + `Layout` badge
- `HomePage` + `Route` 또는 `Index route` badge
- 일반 leaf component는 badge 없음

즉, "이건 page다"보다 "현재 route chain에서 이 역할을 가진다"가 더 정확합니다.

---

## Graph Window Direction

graph window의 기본 모드는 다음 기준이 적절합니다.

### Default

- 현재 active route subtree 기준
- inactive page / route island는 기본 그래프에서 제외
- ownership edge만 주로 표시
- route context는 graph node가 아니라 explorer / header 같은 보조 UI에서 표시

### Optional Modes

- declaration edges 보기
- 숨겨진 hint edges 보기
- route graph 강조
- file tree와 graph 동기 강조

이 구조면 React Router와 TanStack Router 모두 같은 UX 원칙을 유지할 수 있습니다.

---

## Renderer Evaluation

현재 graph window는 React Flow를 쓰는 것이 아니라, 커스텀 SVG + 수동 layout으로 구현되어 있습니다.

이제 선택지는 세 가지입니다.

### Option A. Current Custom Renderer 유지

장점:

- 현재 제품 목적에 딱 맞는 UI를 바로 제어할 수 있음
- dependency 추가 없이 동작
- ownership-only graph에 필요한 최소 동작만 직접 유지 가능

단점:

- pan / zoom / fit / minimap / node drag / selection / keyboard navigation을 계속 직접 관리해야 함
- 레이아웃과 edge style이 복잡해질수록 유지비가 빠르게 올라감

### Option B. React Flow 도입

React Flow는 custom node, viewport, controls, minimap, selection 같은 그래프 UI 인프라가 강합니다.

- [React Flow viewport](https://reactflow.dev/learn/concepts/the-viewport)
- [React Flow custom nodes](https://reactflow.dev/learn/customization/custom-nodes)

장점:

- interactive workspace로 확장하기 좋음
- custom node로 inspector 스타일의 카드형 노드를 유지하기 쉬움
- node selection / focus / viewport 제어를 직접 다시 만들 필요가 적음

단점:

- 공식 문서 기준 자체 layout 엔진은 없고 dagre / d3 / elk 같은 외부 layout을 붙여야 함
- 지금의 핵심 문제인 edge semantics 혼선을 해결해주지는 못함

결론:

- graph window가 앞으로 더 인터랙티브해질 예정이라면 가장 현실적인 선택지
- 하지만 지금 당장 가장 먼저 해야 할 일은 renderer 교체가 아니라 graph semantics 정리

### Option C. Cytoscape.js 같은 범용 그래프 엔진 도입

- [Cytoscape.js](https://js.cytoscape.org/)

장점:

- 다양한 그래프 이론 use case와 layout에 강함
- 큰 그래프와 분석 기능에 적합

단점:

- 지금 제품처럼 React component card 중심의 inspector UI와는 결이 다름
- 네트워크 분석 도구에 더 가깝고, 현재 제품 메시지와는 약간 어긋남

결론:

- 현재 단계의 React Flowmap에는 과한 선택일 가능성이 큼

---

## Recommendation

현재 기준 추천은 다음과 같습니다.

### Short Term

- 커스텀 renderer 유지
- 먼저 ownership / route / declaration 관계를 분리
- 기본 그래프에서 declaration edge 제거

### Mid Term

- React Router adapter 추가
- TanStack Router adapter 추가
- active route chain을 route context lane으로 노출

### Long Term

- graph window를 interactive workspace로 확장할 계획이 명확해지면 React Flow 도입 검토
- layout은 처음엔 dagre, 복잡한 route / group / subgraph가 필요해지면 ELK 검토

참고로 React Flow 공식 문서도 자체 layout 대신 외부 layout 라이브러리 조합을 권장합니다.

- [React Flow layouting overview](https://reactflow.dev/learn/layouting/layouting)

---

## Implementation Phases

### Phase 1. Meaning Cleanup

- edge 타입을 `ownership`, `route`, `declaration`, `hint`로 분리
- graph window 기본 edge를 ownership만 사용하도록 변경
- layout depth 계산에서도 declaration edge 제거

### Phase 2. Route Context Extraction

- React Router route manifest adapter 구현
- TanStack Router route manifest adapter 구현
- active route matches를 공통 `ActiveRouteMatch`로 정규화

### Phase 3. UI Cleanup

- node의 `page/component` 전역 category 축소
- route role badge 방식으로 변경
- route context는 panel / breadcrumb / lane 중 하나로 표현

### Phase 4. Advanced Graph Mode

- declaration edge toggle
- hint edge toggle
- route graph debugging mode

### Phase 5. Renderer Re-evaluation

- custom renderer 유지비 점검
- viewport / minimap / node interaction 요구가 커지면 React Flow PoC 수행

---

## Immediate Changes Worth Doing

가장 먼저 해볼 만한 변경은 다음입니다.

1. React Router에서 `Route element={<... />}`로 생긴 static relation을 기본 edge에서 제외
2. runtime parent가 있는 child에 대해서는 competing static edge를 기본 graph에서 숨김
3. `page` category를 global classification이 아니라 route badge로 바꾸기
4. graph layout 입력을 ownership edge 중심으로 축소하기

이 네 가지를 먼저 해도 현재 혼선은 크게 줄어듭니다.

---

## Non-goals

이 문서의 목표는 다음이 아닙니다.

- 모든 라우터를 완전 지원하는 범용 meta-framework 만들기
- route loader / action / search param / cache layer까지 전부 시각화하기
- DOM 태그 단위 구조 그래프 제공

핵심은 **현재 화면의 컴포넌트 ownership을 더 정확하게 읽게 만드는 것**입니다.

---

## Decision Summary

- React Flowmap의 기본 그래프는 ownership graph여야 한다
- route는 주인공이 아니라 context다
- declaration 관계는 기본 숨김이 맞다
- React Router와 TanStack Router는 각자 adapter를 두고 공통 route manifest로 정규화한다
- renderer 교체보다 edge semantics 정리가 먼저다
- renderer를 바꾼다면 현재 제품에는 Cytoscape보다 React Flow가 더 적합하다
