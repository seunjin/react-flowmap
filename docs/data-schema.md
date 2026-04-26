# React Flowmap Data Schema

## Purpose

이 문서는 React Flowmap v1에서 사용하는 데이터 구조를 정의합니다.  
목표는 아키텍처 문서에서 합의한 개념을 실제 저장 가능하고 구현 가능한 스키마로 구체화하는 것입니다.

이 문서는 다음 네 가지를 다룹니다.

- 런타임 이벤트의 원시 형태
- 정규화된 그래프 스키마
- file-level projection 스키마
- selection 및 UI 상태 스키마

현재 구현은 초기 core graph 위에 workspace projection과 Next.js App Router용 hybrid route metadata를 추가로 얹고 있습니다.
따라서 이 문서는 다음을 구분합니다.

- `FlowmapGraph`: runtime event와 static metadata를 정규화하는 core schema
- `DocIndex` / `DocEntry`: popup workspace가 현재 화면 구조를 읽기 위해 사용하는 projection schema
- `RfmRoute` / `RfmServerComponent`: Next.js App Router와 router context를 표현하는 route metadata schema

1.0의 제품 기준 용어는 다음 세 가지 ownership 상태입니다.

- `LIVE`: browser runtime/fiber에서 관측된 client component. live props와 runtime relation을 제공할 수 있다.
- `STATIC-DOM`: SSR/RSC/static HTML에 남은 DOM owner marker에서 관측된 source owner. source jump, route context, static type metadata를 제공하지만 live props는 없다.
- `STATIC-DECLARED`: route/import graph에는 존재하지만 현재 DOM에서 직접 관측되지 않은 static 후보. source/context 참고용이며 화면 pick 대상이 아닐 수 있다.

---

## Design Rules

- 원본 데이터는 `Symbol` 중심으로 저장한다.
- 기본 사용자 경험은 현재 화면의 component ownership 중심으로 그린다.
- file/folder explorer는 같은 현재 화면 구조를 코드 구조 관점으로 다시 보여준다.
- `File Edge`는 저장 원본이 아니라 projection 결과다.
- `import`는 v1에서 정식 edge가 아니라 static metadata다.
- route declaration과 static JSX reference는 기본 ownership edge가 아니라 route metadata 또는 hint로 다룬다.
- Next.js의 static/server node와 live/client node는 같은 의미로 위장하지 않는다.
- 스키마는 확장 가능해야 하지만, v1에서는 최소 필드만 사용한다.

---

## 1.0 Schema Layers

### 1. Core Graph Layer

`src/core/types`의 `FlowmapGraph`는 파일, 심볼, API, runtime edge를 담는 내부 source of truth입니다.

이 레이어의 책임:

- `RuntimeEvent`를 node/edge로 정규화한다.
- `file`, `symbol`, `api` id 규칙을 안정적으로 유지한다.
- render/use/call/request 같은 runtime relation을 저장한다.
- UI projection이 참조할 수 있는 최소한의 구조 데이터를 제공한다.

주의:

- 현재 `FlowmapNode` union에는 `route` node가 직접 포함되어 있지 않다.
- route/layout/page node는 workspace projection과 route metadata에서 synthetic id로 다룬다.

### 2. Workspace Projection Layer

`src/ui/doc/build-doc-index.ts`와 `src/ui/graph-window/*`는 core graph와 route metadata를 workspace가 읽기 쉬운 형태로 투영합니다.

이 레이어의 책임:

- current screen에 기여하는 component entry를 만든다.
- `executionKind: 'static' | 'live'`로 static/server 정보와 live/client runtime 정보를 구분한다.
- `graphNodeKind`, `role`, `source`로 route/static/runtime 출처를 구분한다.
- graph, explorer, inspector가 같은 `symbolId` 또는 synthetic route id를 공유하게 한다.

### 3. Route Metadata Layer

Vite 라우터와 Next.js App Router는 서로 다른 방식으로 route context를 제공합니다.
React Flowmap은 이를 workspace에서 공통적으로 읽을 수 있는 metadata로 정규화합니다.

이 레이어의 책임:

- React Router / TanStack Router route declaration을 active screen context로 연결한다.
- Next.js App Router의 route/layout/page file을 static ownership layer로 제공한다.
- client boundary와 server-only import tree를 구분한다.

---

## Runtime Event Schema

React Flowmap는 먼저 실행 중 발생한 관측값을 `Runtime Event`로 수집하고, 이후 이를 그래프로 정규화합니다.

### Base Event

```ts
type RuntimeEventBase = {
  id: string;
  eventType: string;
  timestamp: number;
  traceId?: string;
  sessionId?: string;
};
```

기본 원칙:

- `id`: 이벤트 고유 식별자
- `timestamp`: 관측 시점
- `traceId`: 같은 실행 흐름을 묶기 위한 선택 필드
- `sessionId`: 개발 서버 세션 또는 브라우저 세션 구분용

---

### Render Event

```ts
type RenderEvent = RuntimeEventBase & {
  eventType: 'render';
  sourceSymbolId?: string;
  targetSymbolId: string;
  fileId: string;
};
```

의미:

- 어떤 컴포넌트가 렌더링되었는지 기록
- `sourceSymbolId`는 부모 컴포넌트를 알 수 있을 때만 포함

---

### Hook Usage Event

```ts
type HookUsageEvent = RuntimeEventBase & {
  eventType: 'use';
  sourceSymbolId: string;
  targetSymbolId: string;
};
```

의미:

- 컴포넌트 또는 훅이 어떤 훅을 사용했는지 기록

---

### Function Call Event

```ts
type FunctionCallEvent = RuntimeEventBase & {
  eventType: 'call';
  sourceSymbolId: string;
  targetSymbolId: string;
};
```

의미:

- 함수, 훅, 컴포넌트가 다른 함수를 호출한 관계

---

### Request Event

```ts
type RequestEvent = RuntimeEventBase & {
  eventType: 'request';
  sourceSymbolId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  status?: number;
};
```

의미:

- 어떤 심볼이 어떤 API endpoint를 요청했는지 기록

---

### Runtime Event Union

```ts
type RuntimeEvent =
  | RenderEvent
  | HookUsageEvent
  | FunctionCallEvent
  | RequestEvent;
```

---

## Static Metadata Schema

정적 메타데이터는 그래프의 의미를 보완하는 보조 정보입니다.

### File Metadata

```ts
type FileStaticMetadata = {
  fileId: string;
  path: string;
  imports: ImportRef[];
  exports: ExportRef[];
};
```

### Import Metadata

```ts
type ImportRef = {
  sourceFilePath: string;
  importedName: string;
  localName?: string;
  importedFrom: string;
  kind: 'named' | 'default' | 'namespace' | 'type';
};
```

의미:

- v1에서는 정식 edge가 아니라 Inspector와 정적 분석 기능용 정보

### Export Metadata

```ts
type ExportRef = {
  symbolId: string;
  name: string;
  symbolType: 'component' | 'hook' | 'function' | 'constant';
  exported: boolean;
};
```

---

## Route Metadata Schema

Route metadata는 core graph의 node/edge를 대체하지 않습니다.
현재 화면이 어떤 route/layout/page context 아래에서 만들어졌는지 설명하는 projection 입력입니다.

### Common Route Metadata

```ts
type RfmExecutionKind = 'static' | 'live';

type RfmRouteSource =
  | 'next'
  | 'react-router'
  | 'tanstack-router';

type RfmRouteType =
  | 'layout'
  | 'page'
  | 'loading'
  | 'error'
  | 'not-found'
  | 'template';

type RfmRoute = {
  id?: string;
  router?: RfmRouteSource;
  urlPath: string;
  filePath: string;
  type: RfmRouteType;
  componentName: string;
  nodeKind: 'route';
  executionKind: RfmExecutionKind;
  isServer: boolean;
  propTypes?: Record<string, PropTypeEntry>;
  children?: RfmServerComponent[];
};
```

의미:

- `urlPath`: 현재 location과 route metadata를 매칭하기 위한 URL path
- `filePath`: source jump와 explorer grouping에 사용하는 프로젝트 상대 경로
- `type`: route/layout/page 역할
- `executionKind`: static route metadata인지 live route context인지 구분
- `isServer`: UI에서 `SERVER`/`CLIENT` 의미를 결정하는 보조 필드

주의:

- `isServer` 하나만으로 node 의미를 모두 설명하지 않는다.
- 사용자-facing 의미는 `executionKind`, `nodeKind`, `type`, role badge를 함께 사용해 드러낸다.

### Next Static Import Tree

```ts
type RfmServerComponent = {
  filePath: string;
  componentName: string;
  nodeKind: 'server-component' | 'client-boundary';
  executionKind: 'static' | 'live';
  isServer: boolean;
  children?: RfmServerComponent[];
};
```

의미:

- Next.js App Router의 route file이 정적으로 import하는 server-only component와 client boundary를 표현한다.
- `'use client'` 파일을 만나면 `client-boundary`로 표시하고, 그 아래 재귀 정적 import 탐색은 멈춘다.
- client boundary 아래의 실제 component 구조는 live runtime graph가 담당한다.

주의:

- 이 tree는 import tree이지 runtime render tree가 아니다.
- 기본 graph에서는 runtime ownership과 같은 의미의 edge로 위장하지 않는다.

### Synthetic Route Selection ID

Route node는 core `SymbolNode`가 아니므로 workspace selection을 위해 synthetic id를 사용합니다.

예:

```ts
const routeSelectionId = `route:${filePath}`;
```

의미:

- explorer, graph, inspector가 route/layout/page node를 같은 selection 모델로 다룰 수 있게 한다.
- app-window overlay와 popup workspace 사이에서 static route highlight를 동기화하는 키로 사용한다.

---

## Graph Schema

정규화된 그래프는 React Flowmap의 source of truth입니다.

### Node Types

```ts
type FileNode = {
  id: string;
  kind: 'file';
  path: string;
  name: string;
  exports: ExportRef[];
};

type SymbolNode = {
  id: string;
  kind: 'symbol';
  fileId: string;
  name: string;
  symbolType: 'component' | 'hook' | 'function' | 'constant';
  exported: boolean;
};

type ApiNode = {
  id: string;
  kind: 'api';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  label: string;
};

type FlowmapNode = FileNode | SymbolNode | ApiNode;
```

ID 규칙 예시:

- `file:src/pages/user-page.tsx`
- `symbol:src/pages/user-page.tsx#UserPage`
- `api:GET:/api/user`

---

### Edge Types

```ts
type ContainsEdge = {
  id: string;
  kind: 'contains';
  source: string;
  target: string;
};

type RenderEdge = {
  id: string;
  kind: 'render';
  source: string;
  target: string;
};

type UseEdge = {
  id: string;
  kind: 'use';
  source: string;
  target: string;
};

type CallEdge = {
  id: string;
  kind: 'call';
  source: string;
  target: string;
};

type RequestEdge = {
  id: string;
  kind: 'request';
  source: string;
  target: string;
};

type FlowmapEdge =
  | ContainsEdge
  | RenderEdge
  | UseEdge
  | CallEdge
  | RequestEdge;
```

ID 규칙 예시:

- `contains:file:src/pages/user-page.tsx->symbol:src/pages/user-page.tsx#UserPage`
- `use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser`
- `request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user`

---

### Graph Container

```ts
type FlowmapGraph = {
  nodes: FlowmapNode[];
  edges: FlowmapEdge[];
};
```

v1에서는 단순 배열 구조로 시작해도 충분합니다.  
필요하면 이후 `Map` 기반 저장소나 인덱스를 별도 레이어로 둘 수 있습니다.

---

## Projection Schema

Projection은 원본 symbol graph와 route metadata를 특정 UI surface가 읽기 좋은 형태로 바꾸는 결과입니다.

초기 core projection은 symbol graph를 file-level view로 축약했습니다.
현재 1.0 workspace는 여기에 더해 current screen 중심의 `DocIndex` / `DocEntry` projection을 사용합니다.

### Core File Edge

```ts
type FileEdgeRelationType = 'render' | 'use' | 'call' | 'request';

type FileEdge = {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  relationTypes: FileEdgeRelationType[];
  supportingEdges: string[];
};
```

의미:

- file-level analysis에서 보이는 파일 간 연결선
- 내부적으로는 여러 symbol edge를 대표

---

### Core File-level View

```ts
type FileLevelView = {
  fileNodes: FileNode[];
  apiNodes: ApiNode[];
  fileEdges: FileEdge[];
};
```

원칙:

- file-level 분석 화면은 `FileNode`와 `ApiNode`만 표시할 수 있다.
- `SymbolNode`는 이 projection 결과에 직접 나타나지 않는다.
- 모든 `FileEdge`는 supporting edge를 반드시 가짐
- 현재 popup workspace의 기본 UX는 file-level graph가 아니라 current screen ownership graph다.

---

### Workspace Doc Entry

popup workspace는 현재 화면 구조를 component 중심으로 보여주기 위해 `DocEntry` projection을 사용합니다.

```ts
type DocEntry = {
  symbolId: string;
  name: string;
  filePath: string;
  category: 'page' | 'component' | 'hook' | 'function';
  executionKind?: 'static' | 'live';
  ownershipKind?: 'LIVE' | 'STATIC-DOM' | 'STATIC-DECLARED';
  graphNodeKind?: 'route' | 'component';
  role?: 'layout' | 'page' | 'loading' | 'error' | 'not-found' | 'template' | 'component';
  source?: 'runtime' | 'route' | 'static-import';
  renders: DocRef[];
  renderedBy: DocRef[];
  uses: DocRef[];
  usedBy: DocRef[];
  apiCalls: ApiRef[];
};
```

의미:

- explorer, graph, inspector가 공유하는 workspace entry다.
- `symbolId`는 canonical selection key다.
- `executionKind`는 static/server와 live/client 정보를 구분한다.
- `ownershipKind`는 화면에서의 관측 상태를 사용자-facing 용어로 구분한다.
- `graphNodeKind`와 `role`은 route/layout/page 역할을 UI에 노출하는 데 사용한다.
- `source`는 runtime event, route metadata, static import tree 중 어느 경로로 만들어진 entry인지 설명한다.

주의:

- `category: 'page'`는 전역 component 정체성이 아니라 route context에서의 역할에 가깝다.
- `renders`와 `uses`가 곧 모든 시각 edge를 뜻하지 않는다. graph window는 ownership/fiber/static fallback 규칙을 추가로 적용한다.

---

### Workspace Doc Index

```ts
type DocIndex = {
  pages: DocEntry[];
  components: DocEntry[];
  hooks: DocEntry[];
  apis: ApiDocEntry[];
};
```

의미:

- workspace가 현재 screen graph와 detail panel을 만들 때 사용하는 projection container다.
- API 정보는 v1의 중심 UX가 아니므로 inspector 기본 계약에서는 후순위다.

---

## Selection State Schema

Selection은 캔버스 노드가 아니라 component symbol 또는 synthetic route id 기준으로 관리합니다.

### Workspace Selection

현재 popup workspace의 기본 selection은 다음 원칙을 따릅니다.

- live/client component: `symbol:<filePath>#<componentName>`
- static/server component marker: `static:<filePath>#<componentName>`
- route/layout/page node: `route:<filePath>`

의미:

- explorer, graph, inspector가 같은 selection key를 공유한다.
- overlay highlight는 같은 key를 app window의 DOM marker 또는 owner overlay로 변환한다.
- route node는 core `SymbolNode`가 아니므로 synthetic id가 필요하다.

### Owner Visual Rect Hints

owner overlay는 기본적으로 `data-rfm-owner`, `data-rfm-static-owner`, `data-rfm-static` marker의 viewport rect를 사용한다. 이는 browser DevTools가 보여주는 element box와 같은 기준이다.

수동 보정이 필요한 앱은 다음 DOM hint를 사용할 수 있다.

- `data-rfm-owner-anchor`: 해당 subtree를 owner의 대표 시각 영역으로 사용한다.
- `data-rfm-owner-ignore`: fallback 또는 anchor subtree 안에서 해당 subtree를 owner visual rect 계산에서 제외한다.

이 hint는 core graph schema가 아니라 app-window overlay projection 전용 계약이다.

---

### Legacy File-level Selection

### Selection Mode

```ts
type SelectionMode = 'both' | 'outgoing' | 'incoming';
```

### Selection State

```ts
type SelectionState = {
  selectedFileId?: string;
  selectedSymbolIds: string[];
  mode: SelectionMode;
  hop: number;
};
```

v1 기본값:

- `mode = 'both'`
- `hop = 1`

원칙:

- 다중 symbol 선택 허용
- 선택이 없으면 전체 file-level view 표시
- 선택이 있으면 해당 symbol들 기준으로 projection 재계산
- 이 selection model은 file-level analysis에 유효하다.
- 현재 popup workspace의 기본 UX는 단일 current selection을 중심으로 동작한다.

---

## Inspector Schema

Inspector는 선택된 파일과 심볼에 대한 상세 정보를 보여줍니다.

### Symbol Relation Summary

```ts
type SymbolRelationSummary = {
  symbolId: string;
  outgoingEdgeIds: string[];
  incomingEdgeIds: string[];
  requestEdgeIds: string[];
};
```

### Inspector Payload

```ts
type InspectorPayload = {
  file?: FileNode;
  selectedSymbols: SymbolNode[];
  staticMetadata?: FileStaticMetadata;
  relations: SymbolRelationSummary[];
};
```

---

## Derived Analysis Schema

이 영역은 v1 코어는 아니지만, 이후 정적 메타데이터와 런타임 데이터를 결합할 때 사용할 수 있습니다.

```ts
type StaticRuntimeAnalysis = {
  unusedImports: ImportRef[];
  referencedButNotExecutedSymbolIds: string[];
  exportedButNeverObservedSymbolIds: string[];
  declaredButNeverReferencedSymbolIds: string[];
};
```

이 분석은 v1의 그래프 저장 모델 바깥에서 계산하는 것이 적절합니다.

---

## Example

다음 코드가 있다고 가정합니다.

### `src/api/user.ts`

```ts
export async function fetchUser() {
  return fetch('/api/user');
}
```

### `src/hooks/use-user.ts`

```ts
import { fetchUser } from '../api/user';

export function useUser() {
  return fetchUser();
}
```

### `src/pages/user-page.tsx`

```tsx
import { useUser } from '../hooks/use-user';

export function UserPage() {
  const user = useUser();
  return <div>{user?.name}</div>;
}
```

이때 원본 graph는 개념적으로 다음과 같습니다.

```ts
const graph: FlowmapGraph = {
  nodes: [
    {
      id: 'file:src/pages/user-page.tsx',
      kind: 'file',
      path: 'src/pages/user-page.tsx',
      name: 'user-page.tsx',
      exports: [
        {
          symbolId: 'symbol:src/pages/user-page.tsx#UserPage',
          name: 'UserPage',
          symbolType: 'component',
          exported: true,
        },
      ],
    },
    {
      id: 'file:src/hooks/use-user.ts',
      kind: 'file',
      path: 'src/hooks/use-user.ts',
      name: 'use-user.ts',
      exports: [
        {
          symbolId: 'symbol:src/hooks/use-user.ts#useUser',
          name: 'useUser',
          symbolType: 'hook',
          exported: true,
        },
      ],
    },
    {
      id: 'file:src/api/user.ts',
      kind: 'file',
      path: 'src/api/user.ts',
      name: 'user.ts',
      exports: [
        {
          symbolId: 'symbol:src/api/user.ts#fetchUser',
          name: 'fetchUser',
          symbolType: 'function',
          exported: true,
        },
      ],
    },
    {
      id: 'symbol:src/pages/user-page.tsx#UserPage',
      kind: 'symbol',
      fileId: 'file:src/pages/user-page.tsx',
      name: 'UserPage',
      symbolType: 'component',
      exported: true,
    },
    {
      id: 'symbol:src/hooks/use-user.ts#useUser',
      kind: 'symbol',
      fileId: 'file:src/hooks/use-user.ts',
      name: 'useUser',
      symbolType: 'hook',
      exported: true,
    },
    {
      id: 'symbol:src/api/user.ts#fetchUser',
      kind: 'symbol',
      fileId: 'file:src/api/user.ts',
      name: 'fetchUser',
      symbolType: 'function',
      exported: true,
    },
    {
      id: 'api:GET:/api/user',
      kind: 'api',
      method: 'GET',
      path: '/api/user',
      label: 'GET /api/user',
    },
  ],
  edges: [
    {
      id: 'contains:file:src/pages/user-page.tsx->symbol:src/pages/user-page.tsx#UserPage',
      kind: 'contains',
      source: 'file:src/pages/user-page.tsx',
      target: 'symbol:src/pages/user-page.tsx#UserPage',
    },
    {
      id: 'contains:file:src/hooks/use-user.ts->symbol:src/hooks/use-user.ts#useUser',
      kind: 'contains',
      source: 'file:src/hooks/use-user.ts',
      target: 'symbol:src/hooks/use-user.ts#useUser',
    },
    {
      id: 'contains:file:src/api/user.ts->symbol:src/api/user.ts#fetchUser',
      kind: 'contains',
      source: 'file:src/api/user.ts',
      target: 'symbol:src/api/user.ts#fetchUser',
    },
    {
      id: 'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
      kind: 'use',
      source: 'symbol:src/pages/user-page.tsx#UserPage',
      target: 'symbol:src/hooks/use-user.ts#useUser',
    },
    {
      id: 'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
      kind: 'call',
      source: 'symbol:src/hooks/use-user.ts#useUser',
      target: 'symbol:src/api/user.ts#fetchUser',
    },
    {
      id: 'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
      kind: 'request',
      source: 'symbol:src/api/user.ts#fetchUser',
      target: 'api:GET:/api/user',
    },
  ],
};
```

이 graph를 file-level로 투영하면:

```ts
const view: FileLevelView = {
  fileNodes: [
    graph.nodes[0] as FileNode,
    graph.nodes[1] as FileNode,
    graph.nodes[2] as FileNode,
  ],
  apiNodes: [graph.nodes[6] as ApiNode],
  fileEdges: [
    {
      id: 'file-edge:file:src/pages/user-page.tsx->file:src/hooks/use-user.ts',
      sourceFileId: 'file:src/pages/user-page.tsx',
      targetFileId: 'file:src/hooks/use-user.ts',
      relationTypes: ['use'],
      supportingEdges: [
        'use:symbol:src/pages/user-page.tsx#UserPage->symbol:src/hooks/use-user.ts#useUser',
      ],
    },
    {
      id: 'file-edge:file:src/hooks/use-user.ts->file:src/api/user.ts',
      sourceFileId: 'file:src/hooks/use-user.ts',
      targetFileId: 'file:src/api/user.ts',
      relationTypes: ['call'],
      supportingEdges: [
        'call:symbol:src/hooks/use-user.ts#useUser->symbol:src/api/user.ts#fetchUser',
      ],
    },
    {
      id: 'file-edge:file:src/api/user.ts->api:GET:/api/user',
      sourceFileId: 'file:src/api/user.ts',
      targetFileId: 'api:GET:/api/user',
      relationTypes: ['request'],
      supportingEdges: [
        'request:symbol:src/api/user.ts#fetchUser->api:GET:/api/user',
      ],
    },
  ],
};
```

---

## Summary

React Flowmap v1의 데이터 스키마는 다음 구조를 가집니다.

- 원시 입력 = `RuntimeEvent`
- 원본 저장 = `FlowmapGraph`
- core file-level projection = `FileLevelView`
- workspace projection = `DocIndex` / `DocEntry`
- route context = `RfmRoute` / `RfmServerComponent`
- workspace 사용자 선택 = `symbolId` 또는 `route:<filePath>` synthetic id
- legacy file-level 사용자 선택 = `SelectionState`
- core 상세 패널 payload = `InspectorPayload`
- 정적 분석 확장 = `StaticRuntimeAnalysis`

핵심 원칙은 core graph를 symbol 중심으로 안정적으로 유지하되, 사용자-facing workspace는 현재 화면 ownership과 static/live route context를 읽기 쉽게 투영한다는 것입니다.
