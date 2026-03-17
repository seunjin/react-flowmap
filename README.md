# react-flowmap

React 앱의 런타임 컴포넌트 구조를 탐색하는 인앱 개발 도구입니다.

브라우저 DevTools를 열지 않고도 화면 위에서 직접 컴포넌트를 선택해 구조와 props를 확인할 수 있습니다.

## 주요 기능

- **Component Inspector** — 드래그 가능한 플로팅 패널. 폴더 트리 탐색 + 이름 검색
- **Pick mode** — DevTools 스타일 크로스헤어로 화면 요소 직접 선택
- **Props** — 런타임 prop 값 표시. TypeScript 타입 힌트 및 타입 정의 인라인 확장 지원
- **Relations** — 선택된 컴포넌트의 DOM 부모/자식 컴포넌트 표시
- **Vite 플러그인** — 빌드 타임에 `data-rfm-id` 속성, Context 훅, prop 타입 정보 자동 주입 (dev 전용)

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
import { flowmapInspect } from './src/vite-plugin';

export default defineConfig({
  plugins: [react(), flowmapInspect()],
});
```

플러그인은 `dev` 모드에서만 동작하며 프로덕션 빌드에는 코드를 추가하지 않습니다.

## Inspector 사용법

```tsx
import { ComponentOverlay } from 'react-flowmap';

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

- 우측 하단 `⬡` 버튼으로 Inspector 패널 열기
- 패널 헤더 X 버튼 또는 `Esc`로 닫기
- 패널 헤더의 크로스헤어 버튼으로 pick mode 활성화 → 화면 요소 클릭으로 선택
- 트리에서 컴포넌트 이름 클릭으로 직접 선택
- 검색창에 컴포넌트 이름 입력으로 필터링 (검색 시 폴더 자동 확장)
- 패널 헤더를 드래그해 위치 이동 (float 모드)

## config 옵션

```tsx
<ComponentOverlay
  graph={graph}
  active={inspectMode}
  onDeactivate={() => setInspectMode(false)}
  onToggle={() => setInspectMode(p => !p)}
  config={{
    defaultFloatPos: { x: 900, y: 80 },        // 패널 초기 위치 (px)
    buttonPosition: { bottom: 24, right: 24 }, // ⬡ 버튼 위치 (px)
  }}
/>
```

| 옵션 | 타입 | 설명 |
|------|------|------|
| `defaultFloatPos` | `{ x: number; y: number }` | 패널 초기 좌표. localStorage 저장값이 있으면 무시됨 |
| `buttonPosition` | `{ bottom?: number; right?: number; left?: number }` | ⬡ 버튼 위치. 기본값 `{ bottom: 20, right: 20 }` |

패널 위치는 드래그 이후 자동으로 localStorage에 저장됩니다.

## Inspector 패널 상세

### Props

| 값 종류 | 표시 방식 |
|--------|---------|
| `string`, `number`, `boolean`, `null` | 인라인 색상 값 |
| `function` | `functionName ƒ` (`bound dispatchSetState` → `setState ƒ` 자동 정규화) |
| `object`, `array` | JSON 포맷 블록 |

prop 헤더에 TypeScript 타입 힌트 표시 (`propName: TypeName`).
프로젝트 내에서 정의된 타입(interface, type alias)은 `▸` 버튼으로 인라인 확장 가능:

- **object 타입** (`Product`, `CartItem` 등) → 필드 트리로 2뎁스 전개
- **union 타입** (`'primary' | 'secondary'` 등) → 멤버 목록으로 전개
- **외부 라이브러리 타입** (`React.ReactNode` 등) → 타입 이름만 표시

타입 정보는 `ts-morph`로 빌드 타임에 추출되어 `globalThis.__rfmPropTypes`에 등록됩니다.

### 패널 위치 (dock)

패널 우상단 아이콘으로 변경 가능. 선택한 위치는 localStorage에 저장됩니다.

| 모드 | 설명 |
|------|------|
| `float` | 드래그 가능한 플로팅 패널 (기본값) |
| `right` | 화면 우측 고정 |
| `left` | 화면 좌측 고정 |
| `bottom` | 화면 하단 고정 |

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
    types/        # 공유 타입 (FlowmapGraph, RuntimeEvent, …)
  runtime/
    collector/    # 이벤트 수집
    events/       # 이벤트 타입 정의
    tracing/      # 렌더 컨텍스트 추적
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
React Flowmap 기능을 실제 앱 수준의 컴포넌트 구조에서 검증하기 위해 구성되었습니다.
