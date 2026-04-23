# AGENTS.md

## 역할
- 이 폴더는 실제 Babel transform 구현 파일을 둔다.

## 작업 규칙
- 출력 코드는 결정적이어야 하고 source map/line 정보가 크게 흔들리지 않게 유지한다.
- `virtual:rfm/context` 같은 통합 지점은 상위 플러그인과 계약으로 본다.
- AST walk 중 중첩 함수, 조건부 JSX, import 추적이 깨지지 않도록 회귀 테스트를 같이 본다.
