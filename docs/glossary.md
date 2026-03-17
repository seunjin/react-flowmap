# React Flowmap Glossary

## 목적

이 문서는 React Flowmap에서 사용하는 핵심 용어를 정의합니다.  
프로젝트 소개 문서, UI 문서, 아키텍처 문서, 코드 구현에서 동일한 개념을 같은 이름으로 사용하기 위한 기준 문서입니다.

React Flowmap는 파일, 심볼, export, API, 런타임 이벤트, 그래프 뷰가 서로 얽히는 구조를 가지므로, 용어가 흔들리면 설계와 구현이 빠르게 불안정해집니다.  
이 문서는 그 기준점을 제공합니다.

---

## 용어 원칙

- 문서와 코드에서 `Node`는 그래프의 개체를 의미한다.
- `File Node`, `Symbol Node`, `API Node`처럼 구체 타입을 붙여서 표현한다.
- `Export`는 독립된 노드 타입이 아니라 `Symbol`의 상태 또는 속성으로 다룬다.
- UI에서는 이해하기 쉬운 표현을 우선하되, 설계 문서에서는 기준 용어를 유지한다.
- 하나의 개념에 여러 이름을 섞어 쓰지 않는다.

예:

- `function`, `symbol`, `export`를 같은 뜻으로 혼용하지 않는다.
- `line`, `edge`, `relation`을 상황에 따라 섞어 쓰지 않는다.

---

## Core Terms

### File

코드베이스의 실제 파일 단위입니다.  
React Flowmap에서 초기 캔버스의 기본 노드는 `File`입니다.

예:

- `src/pages/user-page.tsx`
- `src/hooks/use-user.ts`

의미:

- 사용자가 처음 탐색하는 기본 단위
- export 목록을 담는 컨테이너
- 시각적으로 보이는 기본 노드

권장 표기:

- 문서: `File`
- 구현: `file`
- UI: 파일

---

### Symbol

파일 내부의 의미 단위입니다.  
함수, 컴포넌트, 훅, 상수 등을 포함하는 상위 개념입니다.

예:

- `UserPage`
- `useUser`
- `fetchUserInfo`
- `API_BASE_URL`

의미:

- 실제 연결 관계의 기본 단위
- export 여부와 관계없이 존재할 수 있음
- React Flowmap 내부 그래프 모델의 핵심 엔티티

권장 표기:

- 문서: `Symbol`
- 구현: `symbol`
- UI: 심볼 또는 항목

---

### Export

파일 외부로 공개된 `Symbol`입니다.  
모든 `Export`는 `Symbol`이지만, 모든 `Symbol`이 `Export`는 아닙니다.

예:

- `export function useUser() {}`
- `export const fetchUserInfo = ...`

의미:

- 사용자가 파일 노드 내부에서 선택하는 주요 대상
- 파일 외부와의 관계를 만드는 진입점
- UI에서 가장 자주 노출되는 symbol 집합

권장 표기:

- 문서: `Export`
- 구현: `exported: true` 또는 `exports`
- UI: export

주의:

- `Export`를 독립적인 node type으로 부르지 않는다.
- `Exported Symbol`이라는 표현은 허용한다.

---

### API Node

네트워크 요청의 대상이 되는 endpoint 단위입니다.  
일반 파일과는 다른 성격을 가지므로 별도 노드 타입으로 취급합니다.

예:

- `GET /api/user`
- `POST /api/user`

의미:

- `request` 관계의 종착점
- 영향도 분석에서 중요한 외부 연결 대상

권장 표기:

- 문서: `API Node`
- 구현: `api`
- UI: API

---

## Symbol Subtypes

### Component

React 컴포넌트인 `Symbol`입니다.

예:

- `UserPage`
- `UserForm`

의미:

- `render` 관계의 주체 또는 대상

---

### Hook

커스텀 훅 또는 추적 대상 훅인 `Symbol`입니다.

예:

- `useUser`
- `useAuth`

의미:

- `use` 관계의 주요 대상

---

### Function

일반 함수인 `Symbol`입니다.

예:

- `fetchUserInfo`
- `updateUser`

의미:

- `call` 관계의 주요 대상

---

### Constant

상수, 설정값, 정적 객체 등으로 취급되는 `Symbol`입니다.

예:

- `API_BASE_URL`
- `userQueryKey`

의미:

- v1에서는 표시 대상일 수 있지만, 연결 그래프에서의 역할은 제한적일 수 있음

---

## Graph Terms

### Node

그래프를 구성하는 개체입니다.

React Flowmap v1 기준 주요 node 타입:

- `File Node`
- `Symbol Node`
- `API Node`

주의:

- 문맥 없이 `노드`라고만 말하면 file node인지 symbol node인지 모호해질 수 있다.
- 가능하면 타입을 함께 명시한다.

---

### Edge

노드 간의 관계를 표현하는 연결입니다.

예:

- `render`
- `use`
- `call`
- `request`
- `contains`

권장 표기:

- 문서: `Edge`
- 구현: `edge`
- UI: 연결 또는 연결선

---

### Relation

두 개체 사이의 의미적 관계를 가리키는 일반 용어입니다.  
문서 설명에서는 사용할 수 있지만, 구현 단위 이름으로는 `Edge`를 우선 사용합니다.

예:

- “이 relation은 symbol 간 call을 뜻한다”

주의:

- 데이터 구조 이름은 `Relation`보다 `Edge`를 우선한다.

---

## Edge Types

### Contains

파일이 특정 심볼을 포함하는 관계입니다.

형태:

- `File -> Symbol`

예:

- `user-page.tsx -> UserPage`

의미:

- 파일 내부 구조를 표현
- 캔버스에 항상 직접 표시될 필요는 없음

---

### Render

컴포넌트가 다른 컴포넌트를 렌더링하는 관계입니다.

형태:

- `Symbol -> Symbol`

예:

- `UserPage -> UserForm`

의미:

- 컴포넌트 계층 또는 화면 구조 연결을 표현

---

### Use

컴포넌트 또는 훅이 훅을 사용하는 관계입니다.

형태:

- `Symbol -> Symbol`

예:

- `UserPage -> useUser`
- `useUser -> useQuery`

의미:

- 훅 의존 관계 표현

---

### Call

함수, 훅, 컴포넌트가 다른 함수를 호출하는 관계입니다.

형태:

- `Symbol -> Symbol`

예:

- `useUser -> fetchUserInfo`

의미:

- 실행 흐름과 로직 의존 관계 표현

---

### Request

심볼이 API endpoint를 요청하는 관계입니다.

형태:

- `Symbol -> API Node`

예:

- `fetchUserInfo -> GET /api/user`

의미:

- 외부 네트워크 의존성 표현

---

## Runtime Terms

### Runtime Event

애플리케이션 실행 중 수집되는 원시 이벤트입니다.

예:

- 컴포넌트 렌더링
- 훅 사용
- 함수 호출
- fetch 요청

의미:

- 아직 그래프로 정규화되기 전의 관측 데이터

---

### Trace

특정 실행 흐름 또는 이벤트 연쇄를 가리키는 표현입니다.

예:

- `UserPage -> useUser -> fetchUserInfo -> GET /api/user`

의미:

- 시간 또는 호출 순서를 가진 관계 흐름

주의:

- `Trace`는 전체 그래프와 다르다.
- trace는 그래프의 일부 실행 경로다.

---

### Graph

정규화된 `Node`와 `Edge`의 집합입니다.

의미:

- React Flowmap가 내부적으로 관리하는 구조화된 관계 데이터
- 시각화와 분석의 공통 기반

---

## View Terms

### Canvas

파일 노드와 연결선이 표시되는 메인 시각화 영역입니다.

의미:

- 사용자가 구조를 탐색하는 핵심 화면

---

### Inspector

선택한 파일, export, symbol, API의 상세 정보를 보여주는 패널입니다.  
초기 버전에서는 주로 사이드바 형태를 가정합니다.

의미:

- 선택 대상의 메타데이터와 연결 근거 제공

---

### Selection

사용자가 현재 선택한 대상 또는 상태입니다.

예:

- 선택된 file
- 선택된 export 목록
- 선택된 edge

---

### Highlight

선택 또는 hover에 따라 시각적으로 강조된 상태입니다.

예:

- 선택된 export 때문에 활성화된 연결선
- 관련 파일 강조

---

### Filter

표시 범위를 좁히기 위한 조건입니다.

예:

- edge type 필터
- API만 보기
- 특정 파일 검색

---

### Isolate

특정 파일 또는 심볼만 중심으로 보이도록 시각 범위를 제한하는 상태입니다.

의미:

- 복잡한 그래프에서 특정 흐름에 집중하기 위한 탐색 방식

---

## View Model Terms

### File-level View

symbol 관계를 file 단위로 축약하여 보여주는 시각화 방식입니다.

예:

- 내부적으로는 `UserPage -> useUser`
- 화면에서는 `user-page.tsx -> use-user.ts`

의미:

- 초기 React Flowmap 메인 뷰의 기준

---

### Symbol-level Relation

실제로 저장되고 해석되는 세부 관계입니다.

예:

- `UserPage -> useUser`
- `useUser -> fetchUserInfo`

의미:

- file-level view의 근거 데이터

---

### File Edge

여러 symbol-level relation을 파일 단위로 축약해 보여주는 연결입니다.

예:

- `user-page.tsx -> use-user.ts`

의미:

- 화면에 보이는 연결선
- 내부적으로는 여러 symbol edge를 대표할 수 있음

주의:

- `File Edge`는 표시 모델이다.
- 실제 저장 모델은 symbol edge를 기본으로 한다.

---

## 요약

React Flowmap의 핵심 용어 구조는 다음과 같습니다.

- 기본 캔버스 노드 = `File Node`
- 실제 의미 단위 = `Symbol`
- 사용자가 선택하는 주 대상 = `Exported Symbol`
- 외부 요청 대상 = `API Node`
- 실제 관계 저장 단위 = `Symbol Edge`
- 화면에서 보이는 축약 연결 = `File Edge`

이 용어집은 이후 `intro`, `ui-concept`, `architecture`, 구현 코드 전반에서 공통 기준으로 사용합니다.
