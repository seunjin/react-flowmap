# gori

React 앱의 런타임 컴포넌트 구조를 탐색하는 인앱 개발 도구입니다.

브라우저 DevTools를 열지 않고도 화면 위에서 직접 컴포넌트를 선택해 구조와 props를 확인할 수 있습니다.

## 주요 기능

- **Component Inspector** — 앱 화면 위 인라인 패널. 컴포넌트 트리 탐색 + 이름 검색
- **Pick mode** — DevTools 스타일 크로스헤어로 화면 요소 직접 선택
- **Props 탭** — 실제 런타임 prop 값 표시, TypeScript 타입 힌트 함께 제공
- **Relations 탭** — 선택된 컴포넌트의 DOM 부모/자식 컴포넌트 표시
- **Vite 플러그인** — 빌드 타임에 `data-gori-id` 속성, Context 훅, prop 타입 정보 자동 주입 (dev 전용)

## 시작하기

```bash
pnpm install
pnpm demo:dev
```

## 에디터 설정

`.env.local` 파일을 생성해 사용할 에디터를 지정합니다:

```bash
VITE_EDITOR=cursor      # Cursor
VITE_EDITOR=code        # VS Code
VITE_EDITOR=windsurf    # Windsurf
VITE_EDITOR=zed         # Zed
```

## Vite 플러그인 설정

```ts
// vite.config.ts
import { goriInspect } from './src/vite-plugin';

export default defineConfig({
  plugins: [react(), goriInspect()],
});
```

플러그인은 `dev` 모드에서만 동작하며 프로덕션 빌드에는 코드를 추가하지 않습니다.

## Inspector 사용법

```tsx
import { ComponentOverlay } from './component-overlay';

function App() {
  const [inspectMode, setInspectMode] = useState(false);

  return (
    <>
      {/* 앱 내용 */}
      <ComponentOverlay
        graph={graph}
        active={inspectMode}
        onDeactivate={() => setInspectMode(false)}
        onToggle={() => setInspectMode(p => !p)}
      />
    </>
  );
}
```

- 우측 하단 `⬡` 버튼으로 Inspector 패널 열기/닫기
- 패널 헤더의 크로스헤어 버튼으로 pick mode 활성화 → 화면 요소 클릭으로 선택
- 트리에서 컴포넌트 이름 클릭으로 직접 선택
- 검색창에 컴포넌트 이름 입력으로 필터링
- `Esc`로 Inspector 종료

## Inspector 패널 상세

### Props 탭

| 값 종류 | 표시 방식 |
|--------|---------|
| `string`, `number`, `boolean`, `null` | 인라인 색상 값 |
| `function` | `functionName ƒ` |
| `object`, `array` | JSON 포맷 블록 (`JSON.stringify` 2-space) |

헤더 행에 TypeScript 타입 힌트 표시 (`propName: TypeName`).
타입 정보는 `ts-morph`로 빌드 타임에 추출되어 `globalThis.__goriPropTypes`에 등록됩니다.

### React 버전 호환성

Pick mode와 props 추출은 React fiber를 워킹합니다. React 16–19 호환:

| React 버전 | Fiber 키 |
|-----------|---------|
| 16–18 | `__reactFiber$…` 또는 `__reactInternalInstance$…` |
| 19+ | `__reactFiber$…` |

## 프로젝트 구조

```
src/
  core/
    graph/        # buildGraph — 이벤트 → 노드/엣지 그래프
    ids/          # 컴포넌트 symbol ID 생성
    inspector/    # 컴포넌트 트리 / 선택 로직
    projection/   # 그래프 → 뷰 모델
    types/        # 공유 타입 (GoriGraph, RuntimeEvent, …)
  runtime/
    collector/    # 이벤트 수집 + fetch 인터셉터
    events/       # 이벤트 타입 정의
    tracing/      # 렌더 컨텍스트 추적
  ui/
    canvas/       # 캔버스 유틸리티
    react-flow/   # React Flow 기반 그래프 시각화
  vite-plugin/    # Vite transform 플러그인 (Babel AST + ts-morph)

demo/
  src/
    component-overlay.tsx   # Inspector 패널 UI
    pages/        # Home, Product, Cart 페이지
    entities/     # User 메뉴
    features/     # Notification toast
    widgets/      # 상품 카탈로그, 장바구니 등
```

## 데모 앱

`demo/` 디렉터리에 FSD(Feature-Sliced Design) 구조의 e-커머스 앱이 포함되어 있습니다.
Gori 기능을 실제 앱 수준의 컴포넌트 구조에서 검증하기 위해 구성되었습니다.
