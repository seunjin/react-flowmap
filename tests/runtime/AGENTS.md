# AGENTS.md

## 역할
- collector, tracing, interceptor 등 런타임 관측 로직을 검증한다.

## 작업 규칙
- 시간, ID 생성기, context 주입으로 테스트를 결정적으로 만든다.
- global patch가 항상 원복되는지 확인한다.
