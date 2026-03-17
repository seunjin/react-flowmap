# React Flowmap Implementation Plan

## Purpose

이 문서는 React Flowmap v1을 실제로 구현하기 위한 단계별 실행 계획을 정의합니다.  
목표는 아이디어를 나열하는 것이 아니라, **어떤 순서로 무엇을 만들고, 각 단계에서 무엇을 검증해야 하는지**를 명확히 하는 것입니다.

이 계획은 다음 원칙을 따릅니다.

- 가장 먼저 코어 데이터 모델을 고정한다.
- 시각화보다 수집과 정규화 로직을 먼저 검증한다.
- 모든 단계는 독립적으로 확인 가능한 산출물을 가져야 한다.
- v1은 React 중심의 최소 코어 엔진 증명에 집중한다.

---

## Success Criteria

React Flowmap v1은 아래를 만족하면 성공으로 간주합니다.

- React 애플리케이션에서 최소한의 런타임 관계를 수집할 수 있다.
- 수집된 이벤트를 `FlowmapGraph`로 정규화할 수 있다.
- `FlowmapGraph`를 `FileLevelView`로 투영할 수 있다.
- 파일 노드 내부에서 export를 선택해 연결을 탐색할 수 있다.
- `render`, `use`, `call`, `request` 관계를 최소 예제로 시각화할 수 있다.

---

## Phase 0. Repository Foundation

### Goal

문서 기반 합의를 실제 코드 구조로 옮길 준비를 합니다.

### Tasks

- 프로젝트 디렉터리 구조 설계
- 패키지 매니저와 빌드 환경 선택
- TypeScript 설정
- lint / format / test 기본 설정
- 예제용 playground 또는 demo app 위치 결정

### Expected Output

- 초기 프로젝트 구조
- 개발 스크립트
- 타입 검사 및 테스트가 가능한 최소 환경

### Exit Criteria

- 빈 타입 파일과 테스트가 정상 실행됨
- 이후 단계에서 코어 타입과 유틸을 바로 추가할 수 있음

---

## Phase 1. Core Types and Graph Contracts

### Goal

문서에 정의한 스키마를 실제 코드 타입으로 고정합니다.

### Tasks

- `RuntimeEvent` 타입 정의
- `FlowmapGraph` 타입 정의
- `FileLevelView` 타입 정의
- `SelectionState` 타입 정의
- node / edge ID 규칙 유틸 정의

### Expected Output

- `src/core/types/*`
- graph 관련 타입 정의
- id 생성 규칙 유틸

### Exit Criteria

- 타입만으로 예제 graph를 구성할 수 있음
- 문서와 구현 타입 이름이 일치함

---

## Phase 2. In-Memory Graph Store

### Goal

정규화된 그래프를 저장하고 조회하는 최소 저장소를 구현합니다.

### Tasks

- node 추가/조회
- edge 추가/조회
- file별 symbol 조회
- symbol별 in/out edge 조회
- supporting edge 조회를 위한 인덱스 설계

### Expected Output

- `GraphStore` 인터페이스
- 메모리 기반 구현체
- 그래프 조회 유틸

### Exit Criteria

- 예제 graph를 저장하고 file/symbol/API 기준으로 조회 가능
- 이후 projection 레이어가 store를 직접 사용할 수 있음

---

## Phase 3. Runtime Event Collector PoC

### Goal

실제 React 애플리케이션에서 최소한의 런타임 이벤트를 수집하는 PoC를 만듭니다.

### Scope

v1 PoC에서는 아래를 우선 대상으로 삼습니다.

- component render
- hook usage
- function call
- fetch request

### Tasks

- 이벤트 수집 API 정의
- 수집기와 앱 코드 사이의 최소 연결 방식 결정
- `fetch` request 가로채기
- 간단한 React 예제 앱 연결

### Expected Output

- `Runtime Collector` 초안
- 콘솔 또는 메모리로 이벤트가 수집되는 데모

### Exit Criteria

- 예제 앱 실행 시 `RuntimeEvent[]`가 생성됨
- `request` 이벤트가 안정적으로 수집됨

---

## Phase 4. Graph Builder

### Goal

수집된 런타임 이벤트를 정규화된 그래프로 변환합니다.

### Tasks

- `RuntimeEvent -> FlowmapNode/FlowmapEdge` 변환 규칙 구현
- symbol/file/API node 생성 규칙 구현
- 중복 node/edge 정규화
- `contains` edge 생성
- request 이벤트를 `API Node`로 정규화

### Expected Output

- `GraphBuilder`
- 이벤트 배열을 받아 `FlowmapGraph`를 생성하는 함수

### Exit Criteria

- 예제 `RuntimeEvent[]`를 넣으면 `FlowmapGraph`가 생성됨
- 예제 코드 흐름이 문서와 동일한 graph로 재현됨

---

## Phase 5. File-level Projection

### Goal

원본 symbol graph를 file-first view로 축약합니다.

### Tasks

- `FileEdge` 생성 규칙 구현
- supporting edge 집계
- relation type 집계
- same-file relation 제외
- API node 대상 예외 처리

### Expected Output

- `projectToFileLevelView(graph, selectionState?)`
- `FileLevelView`

### Exit Criteria

- 예제 graph를 넣으면 문서에 정의한 file-level 결과가 나옴
- supporting edge 목록이 정확히 연결됨

---

## Phase 6. Selection Engine

### Goal

export 선택과 시각화 대상 재계산 규칙을 구현합니다.

### Tasks

- `both | outgoing | incoming` 처리
- `1-hop` 기본 동작
- 다중 symbol 선택 합집합 계산
- 선택 없음 상태 처리

### Expected Output

- selection 기반 projection 유틸
- 선택 상태 변경 시 결과 view 재계산 가능

### Exit Criteria

- 특정 exported symbol을 선택하면 해당 관계만 반영된 file-level view 생성
- incoming/outgoing 모드 차이가 테스트로 검증됨

---

## Phase 7. Inspector Model

### Goal

UI가 필요한 상세 데이터를 받을 수 있도록 Inspector payload를 구성합니다.

### Tasks

- selected file 상세 조회
- selected symbols 상세 조회
- incoming/outgoing edge 요약
- static metadata 결합

### Expected Output

- `buildInspectorPayload(...)`
- symbol relation summary

### Exit Criteria

- 선택된 파일과 export에 대해 상세 패널 데이터를 만들 수 있음

---

## Phase 8. Visualization Prototype

### Goal

최초의 탐색 가능한 UI를 만듭니다.

### Scope

이 단계에서 UI는 증명 도구입니다.  
핵심은 “예쁘게 보이는가”보다 “구조가 읽히는가”입니다.

### Tasks

- 파일 노드 렌더링
- 노드 내부 export 목록 표시
- 다중 선택 UI
- file edge 렌더링
- Inspector sidebar 표시

### Expected Output

- 작동하는 프로토타입 UI
- 파일 중심 graph 탐색 가능

### Exit Criteria

- 사용자가 파일을 보고 export를 선택해 관계를 탐색할 수 있음
- `request` 흐름까지 끝까지 볼 수 있음

---

## Phase 9. Static Metadata Overlay

### Goal

런타임 그래프와 별도로 정적 정보를 겹쳐서 유지보수성과 분석력을 높입니다.

### Tasks

- import metadata 수집
- exported symbol 목록 정적 검증
- Inspector에서 static metadata 표시

### Expected Output

- `FileStaticMetadata`
- static metadata 로더 또는 수집기 초안

### Exit Criteria

- 파일 상세에서 imports/exports를 확인 가능
- runtime graph와 static metadata가 분리된 채 함께 표시됨

---

## Phase 10. Developer Experience and Reliability

### Goal

프로토타입을 유지 가능한 프로젝트 상태로 끌어올립니다.

### Tasks

- 단위 테스트 추가
- fixture 기반 graph snapshot 테스트
- demo app 시나리오 추가
- 문서와 타입 동기화 절차 정리

### Expected Output

- 핵심 유틸 테스트
- 회귀 방지 장치

### Exit Criteria

- graph builder / projection / selection의 주요 동작이 테스트로 고정됨

---

## Suggested Directory Structure

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
    collector/
    events/
  static/
    metadata/
  ui/
    canvas/
    nodes/
    inspector/
demo/
tests/
docs/
```

이 구조의 목적은 역할 분리입니다.

- `core`: 데이터 모델과 순수 로직
- `runtime`: 런타임 수집
- `static`: 정적 메타데이터
- `ui`: 렌더링과 인터랙션

---

## Risks and Controls

### Risk 1. Visualization-first drift

시각화 작업이 먼저 커지면 코어 엔진이 약해질 수 있습니다.

Control:

- Phase 1~6 완료 전에는 UI 기능 확장을 제한

### Risk 2. Runtime instrumentation complexity

컴포넌트, 훅, 함수 호출 수집은 생각보다 어려울 수 있습니다.

Control:

- `fetch request`부터 먼저 PoC
- event model을 먼저 고정하고 수집 전략은 점진적으로 확장

### Risk 3. Schema drift

문서와 실제 타입이 어긋날 수 있습니다.

Control:

- 타입 정의를 문서 구조와 같은 이름으로 유지
- fixture 기반 예제를 테스트에 포함

### Risk 4. Graph explosion

너무 많은 symbol 관계가 한꺼번에 노출될 수 있습니다.

Control:

- v1 기본 selection은 `1-hop`
- file-first projection 유지

---

## Recommended Immediate Next Steps

가장 먼저 해야 할 작업은 아래 세 가지입니다.

1. 프로젝트 초기 구조와 TypeScript 기반 설정
2. `core/types`와 `GraphStore` 구현
3. `fetch request` 기반 Runtime Collector PoC

이 순서가 맞는 이유는, 가장 낮은 비용으로 React Flowmap의 핵심 가설을 빠르게 검증할 수 있기 때문입니다.

---

## Summary

React Flowmap v1의 실행 계획은 다음 흐름으로 진행합니다.

1. 타입과 그래프 계약을 고정한다.
2. 메모리 기반 graph store를 만든다.
3. 최소 런타임 이벤트를 수집한다.
4. 이벤트를 graph로 정규화한다.
5. symbol graph를 file-level view로 투영한다.
6. selection과 inspector를 붙인다.
7. 마지막에 시각화 프로토타입으로 연결한다.

이 계획은 React Flowmap를 “다이어그램 도구”가 아니라, **런타임 관계 엔진을 가진 탐색 가능한 시스템**으로 구현하기 위한 기준선이다.
