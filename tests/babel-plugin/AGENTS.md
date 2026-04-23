# AGENTS.md

## 역할
- Babel transform 결과를 직접 검증한다.

## 작업 규칙
- injected import, symbol id, provider wrapping, exclude 패턴을 명시적으로 검증한다.
- 문자열 전체 스냅샷보다 핵심 변환 결과를 읽기 쉬운 방식으로 확인한다.
