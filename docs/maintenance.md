# React Flowmap Maintenance Guide

## Purpose

이 문서는 React Flowmap를 장기적으로 유지보수 가능한 프로젝트로 만들기 위한 운영 원칙을 정의합니다.  
초기 단계의 프로젝트는 구현 속도에 밀려 구조가 쉽게 무너질 수 있으므로, 코드보다 먼저 유지보수 기준을 정해둘 필요가 있습니다.

React Flowmap의 유지보수 핵심은 다음 세 가지입니다.

- 문서와 코드가 같은 개념을 말하게 만들 것
- 런타임 수집, 그래프 해석, UI 렌더링을 분리할 것
- 회귀를 빠르게 발견할 수 있는 테스트와 예제를 유지할 것

---

## Maintenance Principles

### 1. Documentation is part of the architecture

React Flowmap는 문서가 설계의 일부입니다.  
특히 아래 문서는 코드와 함께 유지되어야 합니다.

- `intro.md`
- `ui-concept.md`
- `glossary.md`
- `architecture.md`
- `data-schema.md`
- `implementation-plan.md`

원칙:

- 데이터 모델이 바뀌면 `data-schema.md`를 먼저 또는 함께 수정한다.
- selection 규칙이 바뀌면 `ui-concept.md`와 `architecture.md`를 함께 수정한다.
- 새 용어를 만들면 먼저 `glossary.md`에 추가한다.

---

### 2. Core logic must remain UI-independent

React Flowmap의 핵심은 UI가 아니라 그래프 엔진입니다.

유지보수 원칙:

- `core`는 React나 특정 시각화 라이브러리를 몰라야 한다.
- `projection`과 `selection`은 순수 함수 중심으로 유지한다.
- UI는 core 결과를 소비하는 레이어로만 남겨둔다.

이 원칙이 깨지면, 시각화 교체나 테스트가 매우 어려워집니다.

---

### 3. Static and runtime concerns must not collapse into one layer

정적 메타데이터와 런타임 그래프는 서로 보완하지만 같은 것이 아닙니다.

유지보수 원칙:

- `import`는 static metadata로 분리 유지
- `render/use/call/request`는 runtime graph로 분리 유지
- 두 결과를 한 구조에 억지로 섞지 않는다

이 분리가 있어야 나중에 `unused import`, `referenced but not executed` 같은 분석 기능을 안정적으로 추가할 수 있습니다.

---

## Recommended Ownership Boundaries

프로젝트 내부 경계는 다음처럼 유지하는 것이 좋습니다.

### `core/`

책임:

- 타입 정의
- graph store
- graph builder
- projection
- selection
- inspector model

금지:

- React 컴포넌트 의존
- 브라우저 DOM 의존
- 렌더러 전용 상태 포함

### `runtime/`

책임:

- 런타임 이벤트 수집
- 이벤트 스트림 생성

금지:

- UI 상태 관리
- file-level projection 직접 수행

### `static/`

책임:

- imports/exports 등 정적 정보 수집
- 이후 lint-like 분석 보조

### `ui/`

책임:

- 캔버스 렌더링
- 노드 내부 export 선택 UI
- Inspector sidebar

금지:

- 그래프 해석 규칙 자체를 UI 안에 재구현

---

## Change Management Rules

### Rule 1. Schema-first changes

Node, edge, selection, projection 규칙이 바뀌는 변경은 항상 아래 순서를 따릅니다.

1. `glossary.md` 확인
2. `architecture.md` 또는 `data-schema.md` 수정
3. 타입 정의 수정
4. 테스트 수정
5. UI 수정

이 순서를 지키면 의미가 뒤틀리는 변경을 줄일 수 있습니다.

---

### Rule 2. Additive changes before destructive changes

새 기능은 기존 개념을 깨기보다 확장하는 방식으로 추가합니다.

예:

- 새 edge type 추가는 가능
- 기존 edge의 의미를 조용히 바꾸는 것은 위험

변경이 기존 의미를 바꾼다면 반드시 문서와 테스트를 함께 수정해야 합니다.

---

### Rule 3. Every view rule needs a source-of-truth rule

UI에서 보이는 규칙은 반드시 core layer에서 설명 가능해야 합니다.

예:

- 파일 간 선이 보인다
- 그러면 supporting symbol edges가 반드시 존재해야 한다

즉, 화면 표현만 있고 데이터 근거가 없는 기능은 금지합니다.

---

## Testing Strategy

### 1. Type-level confidence

초기 단계에서는 타입 안전성이 중요합니다.

유지 원칙:

- 코어 스키마는 명확한 union 타입 유지
- edge 종류 추가 시 exhaustive handling 확인

---

### 2. Fixture-based graph tests

React Flowmap는 예제 기반 테스트가 매우 중요합니다.

추천 방식:

- 작은 코드 예제를 fixture로 둔다
- 예상 `RuntimeEvent[]`를 만든다
- 예상 `FlowmapGraph`를 비교한다
- 예상 `FileLevelView`를 비교한다

이 방식이 유지보수에 강한 이유:

- 개념 변경이 바로 테스트 차이로 드러남
- 문서 예제와 테스트 예제를 비슷하게 유지 가능

---

### 3. Projection regression tests

특히 아래는 회귀 테스트가 꼭 필요합니다.

- same-file relation이 file edge로 새지 않는지
- supporting edge가 올바르게 집계되는지
- multi-selection이 합집합으로 처리되는지
- `both / outgoing / incoming` 차이가 유지되는지
- `1-hop` 제한이 정확히 동작하는지

---

### 4. Inspector tests

Inspector는 UI처럼 보이지만 실제로는 데이터 해석 계층입니다.

테스트 대상:

- 선택된 symbol의 incoming/outgoing summary
- static metadata 결합
- supporting edge 근거 노출

---

## Versioning and Compatibility

### Schema versioning

React Flowmap의 데이터 구조는 이후 진화할 수 있으므로, 장기적으로는 schema version 개념을 두는 것이 좋습니다.

초기 권장 방식:

```ts
type FlowmapDocument = {
  schemaVersion: 1;
  graph: FlowmapGraph;
};
```

v1에서는 꼭 파일 저장 기능이 없더라도, 내부 직렬화 기준은 염두에 두는 것이 좋습니다.

---

### Stable IDs

유지보수에서 가장 중요한 것 중 하나는 안정적인 ID 규칙입니다.

원칙:

- file id는 path 기반
- symbol id는 `file path + symbol name` 기반
- api id는 `method + path` 기반

ID 규칙이 흔들리면 projection, selection, 테스트가 모두 불안정해집니다.

---

## Documentation Maintenance Workflow

문서 유지 순서는 아래처럼 고정하는 것이 좋습니다.

### 용어 변경

- `glossary.md` 먼저 수정
- 관련 문서 일괄 확인

### 데이터 구조 변경

- `data-schema.md`
- `architecture.md`
- 타입 정의

### UI 상호작용 변경

- `ui-concept.md`
- `architecture.md`
- selection 관련 테스트

### 구현 순서 변경

- `implementation-plan.md`

---

## Operational Guidelines

### Keep a demo app alive

React Flowmap는 라이브러리 성격상 실제 예제가 중요합니다.

원칙:

- 항상 작은 demo app를 유지한다
- demo는 최소한 `render/use/call/request`를 모두 포함한다
- 문서 예제와 demo 흐름이 최대한 비슷해야 한다

이 demo가 곧 회귀 검증 도구가 됩니다.

---

### Prefer small, explainable fixtures

큰 실제 프로젝트를 바로 테스트 대상으로 삼기보다,  
작고 설명 가능한 fixture를 여러 개 유지하는 것이 좋습니다.

예:

- component -> hook
- hook -> function
- function -> api request
- same-file call
- unused import

---

### Log intermediate artifacts

유지보수 초기에는 아래 중간 결과를 확인 가능하게 두는 것이 좋습니다.

- `RuntimeEvent[]`
- `FlowmapGraph`
- `FileLevelView`
- `InspectorPayload`

이 중간 산출물을 볼 수 있어야 문제가 collector인지, builder인지, projection인지 바로 분리할 수 있습니다.

---

## Maintenance Risks

### Risk 1. The UI becomes the source of truth

문제:

- UI 코드 안에 그래프 해석 로직이 퍼지기 시작함

대응:

- projection과 selection을 core에 고정
- UI는 결과만 소비

### Risk 2. Runtime collector becomes too magical

문제:

- 수집기가 무엇을 보장하는지 설명 불가능해짐

대응:

- collector의 관측 범위를 문서화
- 수집 가능한 것과 아닌 것을 구분

### Risk 3. Static metadata grows into a second graph

문제:

- import/export 분석이 runtime graph와 섞여 복잡도가 급증

대응:

- static metadata는 별도 레이어 유지
- 결합 분석은 derived analysis로만 수행

### Risk 4. Documents drift from code

문제:

- 문서는 옛 설계를 말하고 코드는 다른 설계를 구현함

대응:

- schema-first 변경 규칙 적용
- fixture 테스트와 문서 예제를 비슷하게 유지

---

## Recommended Ongoing Checklist

기능을 추가할 때마다 아래를 확인하는 것이 좋습니다.

- 새 개념이 기존 용어집으로 설명 가능한가
- 새 데이터 구조가 `data-schema.md`에 반영되었는가
- projection 규칙이 테스트로 고정되었는가
- UI가 core 해석 로직을 복제하고 있지 않은가
- demo app에서 눈으로 검증 가능한가

---

## Summary

React Flowmap를 유지보수 가능하게 만드는 핵심은 복잡성을 줄이는 것이 아니라, **복잡성이 어디에 있어야 하는지 통제하는 것**입니다.

즉:

- 코어는 데이터와 규칙을 책임진다
- 런타임 수집은 관측을 책임진다
- UI는 표현을 책임진다
- 문서는 이 경계를 고정한다

이 문서는 React Flowmap가 초기 프로토타입에서 장기 유지 가능한 라이브러리로 성장하기 위한 운영 기준으로 사용합니다.
