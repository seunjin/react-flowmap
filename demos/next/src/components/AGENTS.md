# AGENTS.md

## 역할
- Next 데모의 client component와 wrapper를 둔다.

## 작업 규칙
- `<ReactFlowMap />`를 감싸는 `FlowmapProvider`는 이 폴더의 안정된 진입점으로 유지한다.
- client boundary가 필요한 컴포넌트만 `'use client'`를 붙인다.
