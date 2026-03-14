# Gori Commit Convention

## 목적

이 문서는 Gori 저장소에서 사용하는 커밋 메시지 규칙을 정의합니다.

목표는 두 가지입니다.

- 커밋 히스토리를 읽기 쉽게 유지한다
- 한국어로 작성하되, 이후 자동화와 분류가 가능하도록 최소한의 형식을 유지한다

---

## 기본 형식

Gori의 커밋 메시지는 아래 형식을 사용합니다.

```text
type: 한국어 요약
```

예:

```text
feat: 런타임 그래프 빌더 구현
fix: same-file projection 누락 수정
docs: 아키텍처와 데이터 스키마 문서 추가
test: fetch interceptor 테스트 보강
```

원칙:

- `type`은 짧고 고정된 토큰을 사용한다
- 요약은 한국어로 작성한다
- 한 커밋은 하나의 의도를 담는다

---

## 사용 가능한 Type

### `feat`

새 기능 추가

예:

- `feat: 요청 이벤트 수집기 추가`

### `fix`

버그 수정

예:

- `fix: request edge 중복 생성 문제 수정`

### `refactor`

동작 변화 없이 구조 개선

예:

- `refactor: graph store 조회 로직 분리`

### `test`

테스트 추가 또는 수정

예:

- `test: projection selection 케이스 추가`

### `docs`

문서 추가 또는 수정

예:

- `docs: 커밋 컨벤션 문서 추가`

### `chore`

빌드, 설정, 의존성, 스크립트 등 잡무성 변경

예:

- `chore: demo 실행 스크립트 정리`

---

## 작성 원칙

### 1. 제목은 한국어로 쓴다

설명 문구는 한국어로 통일합니다.

좋은 예:

- `feat: 파일 레벨 projection 구현`
- `fix: fetch interceptor 타입 오류 수정`

피해야 하는 예:

- `feat: implement runtime graph`
- `misc changes`

---

### 2. 제목은 결과 중심으로 쓴다

무엇을 했는지보다, 커밋 결과가 무엇인지 드러나야 합니다.

좋은 예:

- `feat: 요청 이벤트를 그래프로 정규화하는 빌더 구현`

아쉬운 예:

- `feat: 이것저것 작업`

---

### 3. 하나의 커밋에는 하나의 의도만 담는다

문서, 기능, 테스트, 리팩터링을 한 커밋에 과도하게 섞지 않습니다.

예외:

- 기능 추가와 그 기능을 검증하는 테스트
- 기능 추가와 최소 문서 업데이트

---

### 4. 필요하면 본문을 추가한다

복잡한 변경은 제목만으로 부족할 수 있습니다.

그럴 때는 아래 형식을 사용합니다.

```text
type: 한국어 요약

- 핵심 변경 1
- 핵심 변경 2
- 핵심 변경 3
```

예:

```text
feat: 요청 기반 런타임 수집기 PoC 추가

- fetch interceptor 구현
- RuntimeCollector와 request event 연결
- demo 앱에서 실시간 이벤트 표시
```

---

## 권장 예시

- `feat: 런타임 그래프 코어와 요청 데모 PoC 구현`
- `feat: symbol graph를 file view로 투영하는 로직 추가`
- `fix: optional 필드 타입 처리 오류 수정`
- `docs: 저장소 구조와 기술 스택 문서 추가`
- `test: graph builder 중복 이벤트 케이스 검증 추가`
- `chore: demo 실행 스크립트와 README 안내 정리`

---

## Summary

Gori의 커밋 메시지는 다음 규칙을 따릅니다.

- 형식: `type: 한국어 요약`
- type은 표준 토큰을 사용한다
- 설명은 한국어로 작성한다
- 한 커밋은 한 가지 의도를 담는다

이 규칙은 이후 이 저장소의 기본 커밋 컨벤션으로 사용합니다.
