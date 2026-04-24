# React Flowmap Architecture

## Purpose

이 문서는 React Flowmap의 현재 시스템 구조를 정의합니다.
React Flowmap은 범용 런타임 분석 플랫폼이 아니라, **현재 화면의 UI 조각이 어떤 컴포넌트에 의해 소유되고 어떤 구조로 조립되어 있는지 보여주는 시각적 컴포넌트 구조 검사기**입니다.

제품 정의 자체는 [docs/product-direction.md](/Users/jin/Desktop/dev/react-flowmap/docs/product-direction.md)를 기준으로 삼고, 이 문서는 그 제품을 가능하게 하는 내부 구조를 설명합니다.

---

## Product Implications

제품 정체성이 바뀌면 아키텍처도 그에 맞춰야 합니다.

React Flowmap의 현재 아키텍처는 다음 전제를 가집니다.

- 현재 화면 구조가 최우선이다.
- selection의 시작점은 코드가 아니라 화면 위 UI 조각이다.
- runtime 수집은 구현 수단이지 제품의 주인공이 아니다.
- props와 source jump가 기본 inspector 가치다.
- request / hook / call 신호는 있어도 2차 정보다.

즉, "더 많이 계측하는 시스템"보다 "현재 화면 구조를 더 명확히 읽게 하는 시스템"이 우선입니다.

---

## Architectural Principles

### 1. Component boundary first

React Flowmap이 설명해야 하는 기본 단위는 함수 호출이 아니라 **컴포넌트 경계**입니다.

- 사용자는 먼저 "이 UI는 어떤 컴포넌트인가"를 알고 싶다.
- 그 다음 "이 컴포넌트가 현재 화면에서 어디에 놓여 있나"를 본다.
- 넓은 graph는 그 질문을 둘러싼 문맥이어야 한다.

### 2. Runtime collection is a means, not the product

React Flowmap은 런타임을 관찰하지만, 제품을 런타임 용어로 설명하지 않습니다.

- 내부적으로는 runtime event와 mounted instance를 사용한다.
- 사용자-facing 개념은 component ownership, screen structure, route context에 맞춘다.
- 구현상 가능한 정보가 곧 제품에 기본 노출되어야 하는 정보는 아니다.

### 3. Symbol-first storage, screen-first projection

실제 관계의 저장 단위는 `symbolId` 중심입니다.
하지만 기본 투영은 repo 전체가 아니라 **현재 화면과 현재 route subtree**를 기준으로 합니다.

- 저장 단위: component symbol
- 기본 선택 단위: `symbolId`
- 기본 화면 범위: current route root에서 시작하는 현재 화면 구조

### 4. Same data, different surfaces

overlay, explorer, graph, inspector는 서로 다른 도구가 아니라 같은 구조 데이터를 다른 시점에서 읽는 UI입니다.

- overlay: 집기와 하이라이트
- explorer: 파일 / 폴더 관점의 구조
- graph: 시각적 구조 문맥
- inspector: 선택한 조각의 상세

### 5. Optional signals stay optional

request, hook, call 같은 신호는 내부 구현이나 실험 기능으로는 존재할 수 있습니다.
하지만 제품의 기본 계약은 component structure를 흐리지 않는 선에서 유지해야 합니다.

---

## System Overview

현재 시스템은 크게 다섯 층으로 나뉩니다.

### 1. Build-time instrumentation

번들러 단계에서 React 컴포넌트에 최소 계측을 주입합니다.

역할:

- component symbol identity 확보
- parent-child render 관계 추적 준비
- props type metadata 추출 준비

현재 통합 경로:

- Vite: `react-flowmap/vite`
- Next.js App Router: `react-flowmap/next`
- Babel transform core: `packages/babel-plugin`

### 2. Runtime collection

앱 실행 중 현재 화면 구조를 복원하는 데 필요한 신호를 수집합니다.

현재 핵심 관심사는 다음입니다.

- 어떤 컴포넌트가 mounted 되었는가
- 어떤 부모-자식 render 관계가 관찰되었는가
- 현재 route / layout context가 무엇인가
- 선택된 symbol의 live props를 읽을 수 있는가

추가 신호가 있더라도 현재 제품의 주 계약은 위 네 가지입니다.

### 3. Structure graph normalization

수집된 신호와 static metadata를 결합해 UI가 읽을 수 있는 구조 모델로 정규화합니다.

역할:

- component symbol 정규화
- render 관계 정규화
- route / layout context 연결
- props type metadata 연결
- explorer / graph / inspector가 공유할 selection 기준 유지

### 4. Workspace projection

정규화된 모델을 popup workspace가 읽기 좋은 형태로 투영합니다.

역할:

- current route subtree 기준 범위 결정
- explorer용 file / folder tree 구성
- graph용 structure view 구성
- inspector용 selection detail 구성

이 단계의 핵심은 "가능한 모든 관계를 다 보여주기"가 아니라, **현재 화면을 읽는 데 필요한 구조만 우선적으로 남기기**입니다.

### 5. Visualization surfaces

최종 투영 결과를 두 개의 사용자 surface로 렌더링합니다.

#### In-app overlay

- workspace button
- picker
- app window highlight
- popup과의 selection bridge

#### Popup workspace

- explorer
- graph
- inspector

popup은 오래 머무는 분석 공간이고, overlay는 빠른 진입점입니다.

---

## Core Data Concepts

### Component symbol

React Flowmap의 기본 identity는 component function 자체가 아니라, 파일 경로와 export 이름을 묶은 `symbolId` 입니다.

예:

- `symbol:src/widgets/product-detail.tsx#ProductDetail`

이 identity는 explorer, graph, inspector를 모두 연결하는 공통 키입니다.

### Live instance

같은 `symbolId`라도 현재 화면에는 여러 instance가 존재할 수 있습니다.

현재 버전에서 instance는 다음 용도로만 사용합니다.

- props lookup
- DOM highlight

즉, canonical selection은 `symbolId`이고 live instance는 보조 상태입니다.

### Route context

route와 layout은 제품의 주인공이 아니라 **현재 화면 구조의 시작점**을 알려주는 context입니다.

Next.js App Router 서버 라우트는 DOM instance가 없기 때문에 synthetic id를 사용합니다.

예:

- `ssr:src/app/products/page.tsx`

### Render relationship

현재 제품에서 가장 중요한 관계는 `render` 입니다.
이 관계가 현재 화면 구조를 구성하는 골격을 만듭니다.

다른 관계가 내부적으로 존재하더라도, 기본 UI가 설명해야 하는 첫 번째 구조는 render tree에 가깝습니다.

### Prop type metadata

React Flowmap은 구조만 보여주는 데서 멈추지 않고, 선택한 조각을 실제로 수정 가능한 상태로 연결해야 합니다.
그래서 props와 TypeScript type metadata는 핵심 데이터 개념으로 취급합니다.

---

## Selection Model

### Canonical selection

workspace 전체의 선택 기준은 `symbolId` 입니다.

- explorer는 `symbolId`를 선택한다.
- graph는 같은 `symbolId`를 focus한다.
- inspector는 같은 `symbolId`의 상세를 보여준다.

### Optional live lookup

picker나 props 조회는 실제 mounted instance를 함께 사용합니다.

즉 현재 selection은 두 층으로 구성됩니다.

- canonical state: `symbolId`
- auxiliary state: selected mounted instance

### Route selection

route / layout은 `ssr:<filePath>` synthetic id를 통해 같은 selection 체계 안에 들어옵니다.

이 덕분에 route context와 component graph를 한 workspace 안에서 함께 다룰 수 있습니다.

---

## Current Projection Model

### Graph scope

graph의 기본 범위는 repo 전체가 아니라 **현재 렌더된 route의 최상단부터 시작하는 화면 구조**입니다.

즉:

- 기본 뷰는 current route subtree
- 현재 화면과 무관한 구조는 후순위
- graph는 현재 화면을 이해시키는 문맥 장치

### Explorer scope

explorer는 graph와 다른 데이터를 보여주지 않습니다.
같은 현재 화면 구조를 파일 / 폴더 관점에서 다시 읽게 만듭니다.

즉:

- graph = 시각적 구조 읽기
- explorer = 코드 구조 읽기

### Inspector scope

inspector는 최소하고 강한 정보를 우선합니다.

- identity
- live props
- TypeScript props type
- source jump
- route / layout context

다음은 기본 inspector 범위에서 제외합니다.

- request 목록
- hook 수 / request 수 같은 숫자 요약
- 관계 목록의 중복 노출

### Ownership interpretation

React Flowmap은 raw markup을 별도 노드 타입으로 기본 노출하지 않습니다.

대신 사용자가 다음을 읽을 수 있어야 합니다.

- 선택한 컴포넌트가 차지하는 영역
- 이미 자식 컴포넌트로 분리된 영역
- 남는 부분은 부모가 직접 렌더한 UI일 가능성이 높다는 점

즉, 제품은 raw markup을 세밀하게 모델링하기보다 **component ownership을 읽게 만드는 해석 가능한 구조**를 지향합니다.

---

## Package Responsibilities

### `packages/babel-plugin`

- component instrumentation core
- symbol identity injection
- runtime relation tracking hooks 주입

### `src/vite-plugin`

- Vite 통합
- dev build에서 instrumentation 연결
- editor open middleware

### `src/next-plugin`

- Next.js App Router 통합
- dev build instrumentation 연결
- route context 보조 연결

### `src/runtime`

- collector
- runtime manager
- session / tracing context

### `src/core`

- graph types
- ids
- graph normalization / builder

### `src/ui/inspector`

- overlay
- picker
- app window highlight
- popup bridge

### `src/ui/graph-window`

- popup workspace shell
- explorer
- graph
- inspector detail surface

---

## Non-goals

현재 아키텍처가 기본적으로 지원하지 않거나 우선하지 않는 것은 다음입니다.

- Chrome DevTools 대체
- 네트워크 요청의 완전한 시각화
- 범용 함수 호출 그래프
- DOM 태그 단위 구조 시각화
- repo 전체를 모두 펼치는 소스코드 브라우저

이 비목표를 분명히 해야 제품이 과도한 범위 확장으로 흐려지지 않습니다.

---

## Open Questions

다음 항목들은 이후 설계와 프로토타이핑을 통해 확정합니다.

- raw markup ownership을 어떤 방식으로 가장 잘 추론하게 만들 것인가
- route / layout context를 inspector에 어느 정도까지 노출할 것인가
- instance switching이 필요해지는 시점을 언제로 볼 것인가
- request / hook 신호를 내부에만 둘지, 별도 advanced mode로 남길지

---

## Summary

React Flowmap의 현재 아키텍처는 다음 원칙 위에 서 있습니다.

- 제품의 중심은 component boundary와 screen structure다.
- 런타임 수집은 구현 수단이지 제품 정체성이 아니다.
- 원본 데이터는 symbol 중심으로 저장한다.
- projection은 current screen과 current route subtree를 우선한다.
- inspector는 props와 identity를 우선한다.
- renderer는 교체 가능해야 한다.

이 문서는 이후 구현, 프로토타입 설계, 데이터 스키마 구체화의 기준 문서로 사용합니다.
