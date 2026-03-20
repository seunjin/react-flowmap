# react-flowmap

## 0.1.2

### Patch Changes

- f439ea7: fix: dist에 타입 선언 파일(.d.ts) 누락 문제 수정

  vite-plugin-dts 설정에 `entryRoot: 'src'`와 `rollupTypes: true` 옵션을 추가하여
  `dist/index.d.ts`, `dist/vite-plugin.d.ts` 등이 올바른 경로에 생성되도록 수정.
