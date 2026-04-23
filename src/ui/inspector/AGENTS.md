# AGENTS.md

## 역할
- 앱 위에 겹쳐지는 overlay inspector UI의 실제 구현 폴더다.

## 작업 규칙
- shadow host, overlay selector, popup 흐름은 e2e 계약으로 본다.
- 소스 CSS는 `inspector.css`이고 `inspector.compiled.css`는 `node scripts/build-inspector-css.mjs` 산출물이다.
- 전역 이벤트, fetch 인터셉터, localStorage 상태는 정리 경로를 반드시 유지한다.
- 그래프 해석 규칙을 컴포넌트 내부에 중복 구현하지 않는다.

## 확인
- 구조나 selector가 바뀌면 `tests/e2e`를 같이 갱신한다.
