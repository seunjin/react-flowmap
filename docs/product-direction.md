# React Flowmap Product Direction

## One Sentence

React Flowmap은 **현재 화면의 UI 조각이 어떤 컴포넌트에 의해 소유되고 어떤 구조로 조립되어 있는지 시각적으로 보여주는 React 컴포넌트 구조 검사기**입니다.

---

## Why This Product Exists

프론트엔드 개발자는 화면을 보면서 다음 질문을 반복합니다.

- 지금 보고 있는 이 영역은 어느 컴포넌트가 소유하고 있는가
- 이 UI는 어떤 부모/자식 컴포넌트 조합으로 만들어졌는가
- 어디까지가 이미 컴포넌트로 분리된 영역이고, 어디부터가 아직 부모 안의 직접 마크업인가
- 이 화면을 더 작고 재사용 가능한 컴포넌트로 나눌 수 있는 지점은 어디인가

코드만 읽어서는 이 답을 빠르게 얻기 어렵습니다.
React Flowmap은 **화면에서 시작해 구조를 거슬러 올라가는 방식**으로 이 문제를 풉니다.

---

## Core User Questions

React Flowmap이 우선적으로 답해야 하는 질문은 다음입니다.

1. 내가 지금 집은 UI 조각은 무엇인가
2. 이 조각은 어떤 컴포넌트 파일에 속하는가
3. 현재 화면은 어떤 컴포넌트 구조로 조립되어 있는가
4. 현재 라우트는 어느 layout / page에서 시작되고 있는가
5. 이 구조를 보고 어떤 부분을 더 컴포넌트화할 수 있는가

---

## Product Definition

React Flowmap은 다음처럼 포지셔닝합니다.

- dev-only React component inspector
- 현재 화면 기준의 component ownership explorer
- component boundary와 screen structure를 읽게 해주는 visual tool

React Flowmap은 다음으로 포지셔닝하지 않습니다.

- 범용 런타임 분석 플랫폼
- 함수 호출 그래프 도구
- 네트워크 요청 분석 도구
- Chrome DevTools 대체품

---

## Primary Experience

사용자 경험의 우선순위는 다음 순서입니다.

1. 화면에서 UI 조각을 선택한다.
2. 선택한 조각의 상세 정보와 props를 읽는다.
3. 그 조각이 현재 화면 구조 안에서 어디에 놓여 있는지 본다.
4. 전체 graph / file tree로 넓은 문맥을 확인한다.

즉, React Flowmap은 **숲보다 나무를 먼저 보여주고, 그 다음 숲으로 확장하는 도구**입니다.

---

## Structure Heuristics

React Flowmap은 raw markup을 별도 노드 타입으로 승격하지 않습니다.

대신 사용자가 다음을 읽을 수 있어야 합니다.

- 선택한 컴포넌트가 화면에서 차지하는 영역
- 그 안에서 이미 자식 컴포넌트로 분리된 영역
- 남는 부분은 부모가 직접 렌더한 UI일 가능성이 높다는 점

즉, "이 부분은 아직 부모 안의 직접 마크업 덩어리일 수 있다"는 해석 가능성을 제공하는 것이 목표입니다.
이 해석은 graph, highlight, 가이드 문구를 통해 지원합니다.

---

## Route And Layout Context

route와 layout은 제품의 주인공이 아닙니다.

하지만 현재 화면 구조의 시작점을 이해시키는 맥락으로는 중요합니다.

따라서 React Flowmap에서 route / layout은 다음 역할을 가집니다.

- 현재 화면의 시작점 표시
- 현재 subtree의 구조적 컨텍스트 제공
- component graph를 읽을 때의 상위 문맥 제공

즉, route / layout은 핵심 분석 대상이라기보다 **screen context** 입니다.

---

## Non-goals

현재 제품 방향에서 다음은 비핵심 또는 비목표입니다.

- request 목록을 기본 inspector 정보로 노출하기
- hook 수, request 수 같은 숫자 요약을 중심 UX로 삼기
- 모든 서드파티 / 네트워크 레이어를 완전하게 추적하기
- 함수 / 훅 / API까지 확장된 범용 dependency graph 제공
- DOM 태그 단위의 세밀한 시각화

이 정보는 내부 구현이나 실험 기능으로 남을 수는 있지만, 제품 정체성을 설명하는 주 기능이 되어서는 안 됩니다.

---

## V1 Scope

v1에서 React Flowmap이 잘해야 하는 것은 다음입니다.

- 화면에서 UI 조각 pick
- 선택한 UI 조각의 소유 컴포넌트 확인
- live props + TypeScript props 타입 확인
- source jump
- 현재 렌더된 route subtree 기준 graph 탐색
- 같은 subtree를 파일 / 폴더 관점으로 보는 explorer
- route / layout context 표시

---

## V1 Success Criteria

사용자가 React Flowmap을 켰을 때 다음이 가능하면 v1은 성공입니다.

- "이 화면 조각이 어느 컴포넌트인지 바로 알겠다"
- "현재 화면이 어떤 구조로 조립되어 있는지 감이 온다"
- "어디가 이미 컴포넌트화됐고 어디가 아직 큰 덩어리인지 판단할 수 있다"
- "바로 소스 코드로 이동해 수정할 수 있다"

이 기준이 충족되면 React Flowmap은 좋은 구조 검사기입니다.
