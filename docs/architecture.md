# React Flowmap Architecture

## Purpose

이 문서는 React Flowmap의 초기 시스템 구조를 정의합니다.  
목표는 “무엇을 만들 것인가”를 설명하는 것이 아니라, **어떤 단위로 데이터를 수집하고, 어떤 모델로 저장하며, 어떤 방식으로 화면에 투영할 것인가**를 명확히 하는 것입니다.

React Flowmap v1은 React 애플리케이션의 런타임 관계를 추적하고, 이를 파일 중심의 탐색 가능한 그래프로 표현하는 것을 목표로 합니다.

이 문서의 핵심은 다음 세 가지입니다.

- React Flowmap의 원본 데이터 모델은 무엇인가
- React Flowmap의 화면 표현 모델은 무엇인가
- 런타임 분석과 정적 메타데이터는 어디서 분리되는가

---

## Architectural Principles

### 1. File-first view, Symbol-first storage

React Flowmap의 기본 캔버스 노드는 `File Node`입니다.  
하지만 실제 관계의 저장과 해석은 `Symbol Node` 기준으로 이루어집니다.

즉:

- 사용자가 보는 기본 단위 = `File`
- 시스템이 관계를 이해하는 기본 단위 = `Symbol`

이 분리는 React Flowmap의 핵심 설계 원칙입니다.

이유:

- 파일은 사람이 가장 쉽게 이해하는 단위다.
- 심볼은 실제 호출, 사용, 렌더링, 요청 관계의 단위다.
- 처음부터 symbol을 캔버스 기본 단위로 두면 그래프가 빠르게 폭발한다.

---

### 2. Runtime graph is the source of truth

React Flowmap의 중심은 정적 참조 그래프가 아니라 런타임 관계 그래프입니다.

즉, 다음과 같은 관계가 우선됩니다.

- `render`
- `use`
- `call`
- `request`

정적 정보는 중요하지만, v1에서 그것은 런타임 그래프를 보조하는 메타데이터로 취급합니다.

---

### 3. Complexity is allowed, disorder is not

React Flowmap은 복잡한 애플리케이션 구조를 억지로 단순화하지 않습니다.  
사용자는 여러 export를 동시에 선택할 수 있고, 그 결과 그래프가 복잡해질 수 있습니다.

하지만 시스템은 다음을 보장해야 합니다.

- 현재 무엇이 선택되었는지 확인 가능해야 한다.
- 어떤 선이 왜 생겼는지 설명 가능해야 한다.
- 관계가 많아져도 다시 좁혀 볼 수 있어야 한다.

React Flowmap은 복잡성을 숨기지 않되, 읽을 수 있게 만들어야 합니다.

---

### 4. Renderer is replaceable

React Flowmap의 코어는 시각화 라이브러리에 종속되면 안 됩니다.

시스템은 다음처럼 분리되어야 합니다.

- 코어는 React Flowmap의 그래프 모델을 생성한다.
- Projection 레이어는 화면용 모델을 만든다.
- Renderer는 그 결과를 그린다.

따라서 React Flow를 사용하더라도 그것은 React Flowmap의 본체가 아니라, 하나의 렌더링 전략입니다.

---

## System Overview

React Flowmap v1의 시스템은 개념적으로 다음 구성요소로 나뉩니다.

### 1. Runtime Collector

React 애플리케이션 실행 중 발생하는 이벤트를 수집합니다.

예:

- 컴포넌트 렌더링
- 훅 사용
- 함수 호출
- API 요청

출력:

- `Runtime Event`

---

### 2. Graph Builder

수집된 `Runtime Event`를 React Flowmap의 표준 그래프 모델로 정규화합니다.

역할:

- node 생성
- edge 생성
- symbol과 file 연결
- API endpoint 정규화

출력:

- `Graph`

---

### 3. Graph Store

정규화된 그래프를 저장하고 질의 가능한 형태로 유지합니다.

역할:

- node/edge 저장
- supporting edge 조회
- selection 기준 부분 그래프 계산
- projection 입력 제공

---

### 4. Projection Layer

원본 `Symbol Graph`를 화면 친화적인 `File-level View`로 축약합니다.

역할:

- `Symbol Edge`를 `File Edge`로 집계
- selection mode 반영
- hop 범위 적용
- edge type 필터 반영

출력:

- 캔버스용 view model

---

### 5. Visualization Layer

Projection 결과를 실제 UI로 렌더링합니다.

역할:

- 파일 노드 표시
- 파일 간 연결선 표시
- 하이라이트와 선택 상태 표현

참고:

- React Flow는 이 레이어의 구현 후보일 뿐이다.

---

### 6. Inspector Layer

선택된 파일, export, edge, API에 대한 상세 정보를 보여줍니다.

역할:

- file metadata 표시
- export 목록 표시
- supporting symbol edges 표시
- static metadata 표시

---

### 7. Component Overlay Inspector

앱 화면 위에서 직접 컴포넌트를 탐색하는 개발 도구입니다.

구성:

- **Vite 플러그인** (`src/vite-plugin/`) — 빌드 타임에 다음을 자동 주입:
  - `data-rfm-id`, `data-rfm-loc` DOM 속성 (hover 탐색용)
  - `useContext(__RfmCtx)` + `__useRfmRecord()` 훅 (렌더 추적용)
  - `<__RfmCtx.Provider>` 래핑 (부모-자식 관계 자동 전달)
  - 개발 서버 미들웨어 `/__rfm-open` (에디터 오픈)
- **Runtime Context** (`src/runtime/rfm-context.ts`) — `__RfmCtx`, `__useRfmRecord`, `__rfmCollector`, `__rfmSession` 싱글턴
- **Component Overlay UI** (`demo/src/component-overlay.tsx`) — hover/select 박스, 폴더 트리 사이드바

동작 원리:

1. Vite 플러그인이 각 컴포넌트 함수에 `data-rfm-id` 주입 + Context Provider로 감쌈
2. 앱 실행 중 컴포넌트가 렌더될 때 `__useRfmRecord`가 parent-child 관계를 `__rfmCollector`에 기록
3. Inspector 활성화 시 `document.elementsFromPoint`로 커서 아래 컴포넌트 스택 탐색
4. 컴포넌트 선택 시 `/__rfm-open` 엔드포인트를 통해 에디터에서 해당 파일 오픈

프로덕션 빌드에서는 Vite 플러그인의 `transform`이 `isDev = false`일 때 즉시 반환되어 어떠한 코드도 번들에 포함되지 않습니다.

---

## Core Data Model

React Flowmap v1의 최소 그래프 모델은 다음 세 종류의 node와 다섯 종류의 edge를 가집니다.

### Node Types

#### File Node

캔버스의 기본 노드입니다.

```ts
type FileNode = {
  id: string;
  kind: 'file';
  path: string;
  name: string;
  exports: ExportRef[];
};
```

역할:

- 사용자가 탐색하는 기본 단위
- export 목록의 컨테이너
- file-level projection의 기본 축

#### Symbol Node

파일 내부의 의미 단위입니다.

```ts
type SymbolNode = {
  id: string;
  kind: 'symbol';
  fileId: string;
  name: string;
  symbolType: 'component' | 'hook' | 'function' | 'constant';
  exported: boolean;
};
```

역할:

- 실제 관계 저장 단위
- selection의 의미 단위
- supporting edge의 근거 단위

#### API Node

네트워크 요청의 종착점입니다.

```ts
type ApiNode = {
  id: string;
  kind: 'api';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  label: string;
};
```

역할:

- `request` 관계의 대상
- 파일과 구분되는 외부 의존성 표현

---

### Edge Types

#### Contains

파일이 심볼을 포함하는 관계입니다.

```ts
type ContainsEdge = {
  id: string;
  kind: 'contains';
  source: string; // file id
  target: string; // symbol id
};
```

#### Render

컴포넌트가 다른 컴포넌트를 렌더링하는 관계입니다.

```ts
type RenderEdge = {
  id: string;
  kind: 'render';
  source: string; // symbol id
  target: string; // symbol id
};
```

#### Use

컴포넌트 또는 훅이 훅을 사용하는 관계입니다.

```ts
type UseEdge = {
  id: string;
  kind: 'use';
  source: string;
  target: string;
};
```

#### Call

함수, 훅, 컴포넌트가 다른 함수를 호출하는 관계입니다.

```ts
type CallEdge = {
  id: string;
  kind: 'call';
  source: string;
  target: string;
};
```

#### Request

심볼이 API endpoint를 요청하는 관계입니다.

```ts
type RequestEdge = {
  id: string;
  kind: 'request';
  source: string; // symbol id
  target: string; // api id
};
```

---

### Graph Shape

```ts
type FlowmapNode = FileNode | SymbolNode | ApiNode;

type FlowmapEdge =
  | ContainsEdge
  | RenderEdge
  | UseEdge
  | CallEdge
  | RequestEdge;

type ExportRef = {
  symbolId: string;
  name: string;
  symbolType: SymbolNode['symbolType'];
  exported: boolean;
};

type FlowmapGraph = {
  nodes: FlowmapNode[];
  edges: FlowmapEdge[];
};
```

---

## Edge Policy

### Runtime edges are first-class

v1에서 정식 edge는 런타임 관계를 표현하는 것들입니다.

- `render`
- `use`
- `call`
- `request`
- `contains`

이 관계들은 실제 그래프 모델의 일부이며, selection, hop 계산, file projection의 기준이 됩니다.

---

### Import is not a first-class edge in v1

`import`는 중요한 정보지만, v1에서는 정식 edge 타입으로 다루지 않습니다.

이유:

- `import`는 참조 가능성을 뜻하지만, 실제 실행을 보장하지 않는다.
- React Flowmap v1의 중심은 런타임 관계 추적이다.
- `import`를 런타임 edge와 같은 수준으로 넣으면 그래프 의미가 흐려진다.

따라서 v1의 정책은 다음과 같습니다.

- `import`는 static metadata로 수집할 수 있다.
- `import`는 Inspector나 분석 기능에서 사용할 수 있다.
- `import`는 기본 그래프 edge 타입에 포함하지 않는다.

---

### Hop calculation excludes import

hop 계산은 `render`, `use`, `call`, `request`를 기준으로 합니다.

예:

```text
UserPage -> useUser -> fetchUser -> GET /api/user
```

`UserPage` 기준:

- `1-hop` = `useUser`
- `2-hop` = `fetchUser`
- `3-hop` = `GET /api/user`

즉, hop은 import 횟수가 아니라 **의미 있는 관계를 몇 단계 따라갔는가**로 정의합니다.

---

## Graph Projection

React Flowmap의 원본 데이터는 `Symbol Graph`이지만, 기본 화면은 `File-level View`를 사용합니다.

### Source of truth

- 원본 저장 모델 = `Symbol Node` + `Symbol Edge`
- 기본 표시 모델 = `File Node` + `File Edge`

즉, `File Edge`는 원본 데이터가 아니라 파생 결과입니다.

---

### File Edge generation rule

어떤 `Symbol Edge`에 대해:

- source symbol이 속한 파일이 `A`
- target symbol 또는 API가 속한 대상이 `B`
- `A !== B`

이면 `A -> B`라는 `File Edge`를 생성합니다.

예:

- `UserPage -> useUser`
- `user-page.tsx -> use-user.ts`

---

### Same-file relations are not projected by default

같은 파일 내부의 symbol 관계는 기본 캔버스에 직접 선으로 표시하지 않습니다.

예:

- `fetchUserInfo -> buildRequestUrl`
- 둘 다 `api.ts`

결과:

- 원본 graph에는 존재
- 기본 file-level view에는 표시하지 않음
- Inspector에서는 조회 가능

---

### File Edge is an aggregation

같은 두 파일 사이에 여러 symbol 관계가 있어도, 화면에는 기본적으로 하나의 `File Edge`만 표시합니다.

예:

- `UserPage -> useUser`
- `loadUserPageData -> getUserQueryKey`

둘 다 같은 파일 쌍으로 이어질 수 있습니다.

이 경우 `File Edge`는 여러 supporting edge를 집계합니다.

```ts
type FileEdge = {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  relationTypes: Array<'render' | 'use' | 'call' | 'request'>;
  supportingEdges: string[];
};
```

---

### File Edge must remain explainable

화면에 보이는 모든 `File Edge`는 “왜 이 선이 생겼는가”를 설명할 수 있어야 합니다.

즉:

- 선 하나는 supporting symbol edges 목록을 가진다.
- 사용자는 hover 또는 Inspector를 통해 근거를 확인할 수 있다.

예:

- `user-page.tsx -> use-user.ts`
- supporting edges:
  - `UserPage -> useUser`
  - `loadUserPageData -> getUserQueryKey`

---

## Selection Model

### Selection unit

사용자가 선택하는 기본 단위는 `Exported Symbol`입니다.

즉:

- 캔버스 노드는 file 단위
- 실제 선택 의미는 export된 symbol 단위

---

### Multi-selection is allowed

한 파일 안에서 여러 export를 동시에 선택할 수 있습니다.

이 경우:

- 선택된 export들의 관계를 합집합으로 계산한다.
- projection도 그 결과를 바탕으로 다시 계산한다.

---

### Selection modes

v1에서 selection은 다음 세 모드를 가집니다.

- `both`
- `outgoing`
- `incoming`

기본값은 `both`입니다.

의미:

- `outgoing`: 선택된 export가 어디로 이어지는가
- `incoming`: 누가 선택된 export에 의존하는가
- `both`: 양방향 관계를 함께 표시

---

### Hop policy

v1의 기본 hop 범위는 `1-hop`입니다.

즉:

- 선택된 export에 직접 연결된 관계만 우선 표시한다.
- `2-hop` 이상 확장은 이후 단계의 기능으로 둔다.

이 정책은 초기 그래프 복잡도를 통제하고, 사용자가 연결 의미를 읽기 쉽게 하기 위한 것입니다.

---

## Static vs Runtime Boundaries

React Flowmap은 런타임 그래프와 정적 메타데이터를 구분합니다.

### Runtime graph

런타임 그래프는 실제 실행 중 관측된 관계의 집합입니다.

예:

- 렌더링된 컴포넌트
- 사용된 훅
- 호출된 함수
- 발생한 요청

이것은 React Flowmap의 source of truth입니다.

---

### Static metadata

정적 메타데이터는 코드 구조를 보완하는 정보입니다.

예:

- import 목록
- export 목록
- file path
- symbol type
- 선언 여부
- 참조 여부

이 정보는 그래프의 의미를 풍부하게 만들지만, v1에서는 런타임 edge와 같은 위상을 갖지 않습니다.

---

### Future analysis features

정적 메타데이터와 런타임 그래프를 함께 사용하면 이후 다음과 같은 기능을 구현할 수 있습니다.

- `unused import`
- `referenced but not executed`
- `exported but never observed`
- `declared but never referenced`

이 기능들은 React Flowmap의 확장 포인트이지만, v1의 core graph model에는 포함되지 않습니다.

---

## Runtime Event Model

v1에서 React Flowmap은 먼저 원시 런타임 이벤트를 수집하고, 이후 이를 그래프로 정규화합니다.

예상 이벤트 범주:

- component render event
- hook usage event
- function call event
- fetch request event

이벤트는 가능한 한 원시 관측값에 가깝게 유지하고, node/edge 해석은 `Graph Builder`에서 수행합니다.

이 분리의 이점:

- 수집 전략과 그래프 해석 전략을 독립적으로 수정할 수 있다.
- 동일한 event stream으로 여러 projection을 만들 수 있다.

---

## Visualization Contract

시각화 레이어는 React Flowmap 코어의 원본 그래프를 직접 해석하지 않고, Projection 결과를 입력으로 받습니다.

즉:

- Core는 `RfmGraph`를 관리한다.
- Projection은 `File-level View`를 만든다.
- Renderer는 그 결과를 그림으로 표현한다.

이 계약은 다음을 가능하게 합니다.

- React Flow 사용
- 다른 그래프 렌더러로 교체
- 리스트/매트릭스/타임라인 같은 대체 뷰 추가

시각화 기술 선택은 중요하지만, 코어 데이터 모델보다 앞서면 안 됩니다.

---

## V1 Scope

React Flowmap v1의 구현 범위는 다음으로 제한합니다.

- React 애플리케이션 대상
- `File Node`, `Symbol Node`, `API Node`
- `contains`, `render`, `use`, `call`, `request`
- file-first canvas
- export multi-selection
- `both | outgoing | incoming` selection mode
- 기본 `1-hop`
- Inspector sidebar
- import를 포함한 static metadata 보관
- symbol graph에서 file graph로의 projection

다음은 v1 범위에서 제외합니다.

- 모든 symbol의 직접 캔버스 노드화
- import를 정식 runtime edge로 취급
- 기본 `2-hop` 이상 탐색
- 범용 그래프 에디터 기능
- 다중 프레임워크 동시 지원

---

## Open Questions

다음 항목들은 이후 설계와 프로토타이핑을 통해 확정합니다.

- Runtime Collector가 React 컴포넌트, 훅, 함수 호출을 어떤 방식으로 계측할 것인가
- fetch 외의 네트워크 계층을 어디까지 지원할 것인가
- Symbol Node를 특정 상황에서 캔버스에 직접 확장할 것인가
- file-level view 외에 trace timeline 또는 matrix view를 언제 추가할 것인가
- static metadata 수집을 build-time에서 수행할 것인가

---

## Summary

React Flowmap v1의 아키텍처는 다음 원칙 위에 서 있습니다.

- 원본 데이터는 symbol 중심으로 저장한다.
- 기본 화면은 file 중심으로 보여준다.
- runtime graph를 source of truth로 둔다.
- import는 v1에서 static metadata로만 다룬다.
- selection과 projection은 file view를 위해 존재한다.
- renderer는 교체 가능해야 한다.

이 문서는 이후 구현, 프로토타입 설계, 데이터 스키마 구체화의 기준 문서로 사용합니다.
