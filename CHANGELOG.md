# react-flowmap

## 0.1.4

### Patch Changes

- fix: Fragment를 사용하는 컴포넌트의 선택 영역이 첫 번째 자식만 표시되는 문제 수정

  `<>...</>` Fragment로 여러 요소를 렌더링하는 컴포넌트(App 등) 선택 시 Fragment fiber를 올바르게 순회하여 전체 영역이 하이라이트되도록 수정.

## 0.1.3

### Patch Changes

- fix: Fragment 컴포넌트 선택 영역 및 에디터 타입 자동완성 개선

  - Fragment로 여러 요소를 렌더링하는 컴포넌트(App 등) 선택 시 전체 영역이 하이라이트되도록 union rect 계산 방식 적용
  - 그래프 창을 열 때 localStorage의 active 상태를 초기화하여 새로고침 후 오버레이가 재생성되는 문제 수정
  - `flowmapInspect` 옵션의 `editor` 필드에 알려진 에디터 이름(`code`, `cursor`, `antigravity`, `windsurf`, `zed` 등) 자동완성 지원

## 0.1.2

### Patch Changes

- f439ea7: fix: dist에 타입 선언 파일(.d.ts) 누락 문제 수정

  vite-plugin-dts 설정에 `entryRoot: 'src'`와 `rollupTypes: true` 옵션을 추가하여
  `dist/index.d.ts`, `dist/vite-plugin.d.ts` 등이 올바른 경로에 생성되도록 수정.
