# React Flowmap UI Concept

## Purpose

이 문서는 현재 React Flowmap UI의 기준 계약을 정의합니다.

핵심 목표는 다음 순서를 유지하는 것입니다.

- 화면에서 UI 조각을 집는다
- 선택한 조각의 상세를 먼저 읽는다
- 그 조각이 현재 화면 구조 안에서 어디에 놓여 있는지 본다
- 필요할 때만 넓은 graph / file tree 문맥으로 확장한다

이 문서는 구현 디테일보다 먼저 다음 질문에 답하도록 작성합니다.

- 각 화면은 무엇을 책임지는가
- selection은 무엇을 의미하는가
- 어떤 정보는 어디서 봐야 하는가
- 어떤 정보는 일부러 보여주지 않는가

---

## Product Surfaces

React Flowmap의 UI는 두 개의 surface로 나뉩니다.

### 1. In-app overlay

앱 위에 겹쳐지는 overlay는 `workspace button + picker bridge` 입니다.

책임:

- floating workspace button
- popup workspace 열기
- popup과 app window 사이의 highlight / pick 동기화

하지 않는 일:

- 인앱 popover 패널 렌더링
- 복잡한 관계 탐색
- 좁은 패널 안에서 tree, graph, detail을 모두 설명하기

overlay는 짧고 즉각적이어야 합니다.
제품적으로는 DevTools의 element picker에 가깝고, IDE 전체 화면이 아닙니다.
실제 pick action은 popup workspace에서 시작해 app window에 반영되는 흐름을 기본으로 둡니다.

### 2. Popup workspace

새 창은 `graph popup`이 아니라 `analysis workspace` 입니다.

책임:

- 현재 화면 구조 탐색 제공
- route subtree 기준 graph 제공
- 선택된 대상의 상태 inspector 제공
- file / folder 관점의 구조 탐색 제공

popup은 사용자가 실제로 오래 머물며 분석하는 공간입니다.

---

## Shared Selection Model

UI 혼란을 줄이기 위해 selection 의미를 먼저 고정합니다.

### Canonical selection: `symbolId`

좌측 explorer, 중앙 graph, 우측 inspector가 공유하는 기본 선택 단위는 `symbolId` 입니다.

예:

- `symbol:src/widgets/product-detail.tsx#ProductDetail`
- `symbol:src/shared/ui/button.tsx#Button`

이 선택은 "코드에 정의된 컴포넌트 심볼"을 가리킵니다.

### Optional live instance

화면에서 pick한 경우에는 같은 `symbolId`라도 실제 DOM instance가 존재합니다.

현재 UI는 이 instance를 props 조회와 app-window highlight에 활용합니다.
다만 workspace 전반의 canonical identity는 여전히 `symbolId` 입니다.

즉 현재 버전은 다음처럼 동작합니다.

- selection의 기준: `symbolId`
- live lookup의 보조 기준: 현재 선택된 mounted instance

향후 인스턴스 목록과 instance switching이 추가되면 `selectedInstance`가 별도 상태로 승격됩니다.

### Server route selection

Next.js App Router의 route / layout context는 DOM instance가 없으므로 `route:<filePath>` 형태의 synthetic id를 사용합니다.

예:

- `route:src/app/products/page.tsx`

이 id는 popup graph/explorer와 overlay route highlight 사이의 공통 키입니다.

---

## Core User Flow

React Flowmap의 기본 흐름은 "나무를 보고 숲을 본다" 입니다.

1. 사용자는 화면에서 특정 UI 조각을 pick한다.
2. inspector는 그 조각의 owning component와 props를 먼저 보여준다.
3. graph와 explorer는 그 조각이 현재 화면 구조 안에서 어디에 놓여 있는지 보여준다.
4. 사용자는 그 구조를 보고 컴포넌트화 경계와 추출 가능성을 판단한다.

즉, graph는 시작점이 아니라 **상세를 둘러싼 문맥 제공 장치**입니다.

---

## Workspace Layout

popup workspace의 기본 레이아웃은 3패널입니다.

### Left: Explorer

역할:

- 현재 렌더된 route subtree에 기여하는 component / route file을 파일 트리 형태로 보여준다
- search와 folder grouping을 제공한다
- graph와 같은 데이터를 코드 구조 관점으로 다시 읽게 만든다
- 선택의 안정적인 진입점 역할을 한다

이 패널은 "코드 구조상 어디에 있는가"에 답합니다.

### Center: Graph canvas

역할:

- 현재 화면 구조를 넓게 보여준다
- active route root에서 시작하는 ownership structure를 시각화한다
- explorer보다 더 넓은 조립 문맥을 제공한다
- route, server, client 노드를 같은 캔버스 안에서 보여준다
- role과 `SERVER` / `CLIENT` 배지로 node 의미를 구분한다

이 패널은 "무엇과 연결되는가"에 답합니다.

기본 scope는 "현재 보고 있는 화면"입니다.
즉 repo 전체 구조보다 **현재 렌더된 route subtree**를 먼저 보여줍니다.

### Right: Inspector

역할:

- 현재 선택된 대상이 어떤 상태인지 보여준다
- live node면 props를, static node면 정적 메타데이터를 보여준다
- type metadata를 우선적으로 보여준다
- source jump 같은 action을 제공한다

이 패널은 "지금 이건 무엇이고 어떤 상태인가"에 답합니다.

---

## Panel Responsibilities

### Explorer is not the graph

Explorer는 tree 탐색을 위한 패널입니다.

- 파일/폴더 구조를 유지한다
- 그래프처럼 모든 관계를 풀어 설명하지 않는다
- selection anchor 역할을 우선한다

### Graph is not the detail panel

graph는 관계 탐색기입니다.

- 현재 화면 구조를 넓게 본다
- 선택된 조각이 어느 상위 문맥 안에 있는지 보여준다
- props를 상세히 읽는 용도가 아니다
- 구조를 시각적으로 탐색하는 데 집중한다

### Inspector is not a mini graph

Inspector는 현재 선택한 항목의 상태를 읽는 패널입니다.

기본 정보:

- name
- file path
- live props 또는 static metadata
- TypeScript props type
- actions

여기서 관계 mini-graph를 기본 UI로 넣지 않습니다.
관계 자체는 가운데 graph가 더 적절한 공간과 문맥을 갖습니다.

---

## Inspector Content Contract

Inspector는 다음 순서로 정보를 보여줍니다.

### 1. Identity

- component / route name
- file path
- source location jump

### 2. Props

props는 inspector의 중심 정보입니다.

- mounted component라면 live props 표시
- props type metadata가 있으면 type 힌트 표시
- 현재 props가 비어 있으면 `No props`

### 3. Static metadata

- route node나 static node라면 정적 타입 정보와 역할을 표시한다
- `SERVER` node라면 parent layout과 reachable client boundaries를 같이 표시한다
- live route node라면 live props 아래에 static route metadata를 같이 표시할 수 있다

### 4. Actions

- source jump
- 필요한 최소한의 보조 액션

다음 정보는 inspector의 기본 계약에서 제외합니다.

- request 목록
- hook 수 / request 수 같은 숫자 요약
- parent / child 관계 목록의 중복 노출
- raw markup을 별도 node처럼 설명하는 세부 구조

---

## Interaction Rules

### Pick from overlay

1. 사용자가 앱 화면에서 컴포넌트를 pick한다
2. overlay는 해당 symbol을 선택 상태로 만든다
3. popup이 열려 있다면 explorer, graph, inspector도 같은 selection으로 동기화된다

### Select from explorer

1. tree에서 컴포넌트 또는 route를 클릭한다
2. graph가 해당 노드로 focus를 맞춘다
3. overlay는 해당 symbol 또는 route를 highlight한다
4. inspector가 즉시 갱신된다

### Select from graph

1. graph node를 클릭한다
2. explorer가 같은 항목을 선택 상태로 맞춘다
3. inspector가 같은 selection을 보여준다

### Detail visibility

popup workspace에서는 detail이 항상 열려 있습니다.

즉:

- tree에서 선택 후 detail로 "한 번 더 들어가는" 모드 전환을 두지 않는다
- selection 결과는 즉시 우측 inspector에서 읽는다

---

## Graph Scope

graph의 기본 범위는 repo 전체가 아니라 **현재 렌더된 route의 최상단부터 시작하는 화면 구조**입니다.

즉:

- 현재 active route subtree를 먼저 보여준다
- 현재 화면과 무관한 구조는 기본 뷰에서 후순위로 둔다
- file tree도 같은 scope를 다른 관점으로 보여준다

graph와 explorer는 서로 다른 데이터를 보여주는 것이 아니라, **같은 현재 화면 구조를 서로 다른 읽기 방식으로 보여주는 것**입니다.

---

## Ownership Interpretation

React Flowmap은 raw markup을 별도 노드 타입으로 기본 노출하지 않습니다.

대신 사용자가 다음을 추론할 수 있어야 합니다.

- 선택한 컴포넌트가 차지하는 전체 영역
- 그 안에서 이미 자식 컴포넌트가 소유한 영역
- 남는 부분은 부모가 직접 렌더한 UI일 가능성이 높다는 점

이 해석은 graph, overlay highlight, 문서 가이드를 통해 지원합니다.

즉, 제품은 raw markup을 세밀하게 분해하기보다 **component ownership을 읽게 만드는 것**에 집중합니다.

---

## Current Scope

현재 popup workspace가 다루는 것은 `live runtime workspace` 입니다.

즉 현재 범위는 다음으로 제한합니다.

- mounted runtime component explorer
- Next.js App Router route file explorer
- current-route-rooted structure graph
- props-focused inspector
- overlay <-> popup BroadcastChannel 동기화

현재 범위에서 제외하는 것:

- 전체 소스코드 브라우저
- repo 전체 파일 탐색기
- inspector 안의 재귀 descendant tree
- instance list / instance switching
- multi-selection
- request / hook 중심 분석 UI

---

## Implementation Boundaries

현재 코드 기준으로 책임은 다음처럼 나눕니다.

### `src/ui/inspector/ComponentOverlay.tsx`

- app-window overlay
- picking
- DOM highlight
- popup channel bridge

### `src/ui/graph-window/GraphWindow.tsx`

- popup workspace shell
- explorer / graph / inspector layout
- shared selection state
- toolbar actions

### `src/ui/graph-window/FullGraph.tsx`

- 중앙 graph canvas
- layout 계산
- graph node interaction

### `src/ui/inspector/UnifiedTreeView.tsx`

- runtime explorer tree 렌더링
- route file + mounted component tree UI

---

## Why This Split Exists

기존 confusion의 원인은 한 패널이 동시에 세 질문에 답하려 했기 때문입니다.

- 내가 지금 집은 게 무엇인가
- 이게 무엇과 연결되는가
- 이 컴포넌트가 지금 어떤 상태인가

이 질문은 각각 다른 UI가 더 잘 답합니다.

- explorer: 위치와 맥락
- graph: 연결과 구조
- inspector: 상태와 입력

이 분리가 유지되어야 제품이 커져도 복잡성이 읽을 수 있는 형태로 남습니다.
