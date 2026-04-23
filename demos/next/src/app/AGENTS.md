# AGENTS.md

## 역할
- Next App Router의 layout/page/global CSS를 둔다.

## 작업 규칙
- layout/page는 서버 컴포넌트 전제를 유지한다.
- `FlowmapProvider` 같은 client wrapper는 직접 구현하지 말고 `components`에서 가져온다.
