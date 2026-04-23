# AGENTS.md

## 역할
- 이 저장소는 Vite React 앱과 Next.js App Router를 대상으로 런타임 컴포넌트 관계를 수집하고 그래프로 정규화해 inspector/UI로 보여주는 dev-only 라이브러리다.
- 배포 패키지는 루트 `react-flowmap`이며 `react-flowmap/vite`, `react-flowmap/next`, `react-flowmap/graph-window`, `react-flowmap/rfm-context` 서브패스를 함께 관리한다.

## 현재 구조
- `src/core`: 그래프 타입, ID, 정규화
- `src/runtime`: 이벤트 수집, fetch 인터셉트, trace/session
- `src/ui`: overlay inspector, graph window, doc index
- `src/vite-plugin`: Vite 통합
- `src/next-plugin`: Next.js 통합 소스
- `packages/babel-plugin`: JSX/Babel 변환 코어
- `demos/*`: 지원 프레임워크별 검증 앱
- `tests/*`: unit/jsdom/e2e
- `docs/*`: 설계와 운영 기준

## 작업 순서
- 스키마나 용어를 바꾸면 `docs` -> `src/core/types` -> 구현 -> 테스트 순서를 지킨다.
- public export를 바꾸면 `src/index.ts`, `package.json`, `vite.config.ts`, `README.md`를 같이 확인한다.
- 플러그인 변경은 관련 demo와 `tests/e2e`까지 같이 본다.

## 기본 명령
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm demo:react`
- `pnpm demo:tanstack`
- `pnpm demo:next`

## 워크스페이스 메모
- 루트는 `pnpm` 기준이다.
- `demos/react`, `demos/tanstack`만 workspace 패키지다.
- `demos/next`는 루트 workspace 밖의 standalone npm 앱이다.
- `demos/react`, `demos/tanstack`의 TanStack Router 사용은 Vite React 라우팅 검증용 데모 성격이다.
- 실제 Next 통합 코드는 현재 `packages/next-plugin`이 아니라 `src/next-plugin`에 있다.

## 직접 수정하지 말 것
- 생성 산출물: `dist/`, `test-results/`, `demos/**/node_modules/`, `demos/next/.next/`, `demos/tanstack/dist/`
- 문서와 코드가 어긋나면 코드 기준으로 확인하고 같은 변경에서 문서도 맞춘다.

## 협업 규칙
- 하위 폴더의 `AGENTS.md`가 있으면 그 지침을 우선한다.
- 커밋 메시지는 `docs/commit-convention.md`의 `type: 한국어 요약` 형식을 따른다.
