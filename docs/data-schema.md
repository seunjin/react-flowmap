# React Flowmap Data Schema

## Purpose

이 문서는 React Flowmap v1에서 사용하는 데이터 구조를 정의합니다.  
목표는 아키텍처 문서에서 합의한 개념을 실제 저장 가능하고 구현 가능한 스키마로 구체화하는 것입니다.

이 문서는 다음 네 가지를 다룹니다.

- 런타임 이벤트의 원시 형태
- 정규화된 그래프 스키마
- file-level projection 스키마
- selection 및 UI 상태 스키마

---

## Design Rules

- 원본 데이터는 `Symbol` 중심으로 저장한다.
- 기본 화면은 `File` 중심으로 그린다.
- `File Edge`는 저장 원본이 아니라 projection 결과다.
- `import`는 v1에서 정식 edge가 아니라 static metadata다.
- 스키마는 확장 가능해야 하지만, v1에서는 최소 필드만 사용한다.

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

Projection은 원본 symbol graph를 file-level view로 축약한 결과입니다.

### File Edge

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

- 화면에 보이는 파일 간 연결선
- 내부적으로는 여러 symbol edge를 대표

---

### File-level View

```ts
type FileLevelView = {
  fileNodes: FileNode[];
  apiNodes: ApiNode[];
  fileEdges: FileEdge[];
};
```

원칙:

- 기본 화면은 `FileNode`와 `ApiNode`만 표시
- `SymbolNode`는 projection 결과에 직접 나타나지 않음
- 모든 `FileEdge`는 supporting edge를 반드시 가짐

---

## Selection State Schema

Selection은 캔버스 노드가 아니라 exported symbol 기준으로 관리합니다.

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
- 화면 출력 = `FileLevelView`
- 사용자 선택 = `SelectionState`
- 상세 패널 = `InspectorPayload`
- 정적 분석 확장 = `StaticRuntimeAnalysis`

이 문서는 이후 실제 타입 정의, 저장소 설계, 프로토타입 구현의 기준으로 사용합니다.
