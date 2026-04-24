---
'react-flowmap': minor
---

그래프 워크스페이스를 현재 화면의 컴포넌트 구조 중심으로 정리했습니다.

- react-router-dom과 TanStack Router route manifest를 현재 화면 scope 기준으로 반영합니다.
- 기본 graph canvas에서 route island를 제거하고 mounted component graph만 유지합니다.
- 상세 패널은 props 중심으로 단순화하고 screen context 섹션을 제거했습니다.
