# gori

React 앱의 런타임 컴포넌트 구조를 시각적으로 탐색하는 개발 도구입니다.

화면 위에서 컴포넌트를 직접 호버하거나 클릭해 해당 파일을 에디터에서 바로 열 수 있습니다.

## 주요 기능

- **Component Inspector** — 앱 화면 위에서 컴포넌트를 호버/클릭하면 폴더 트리와 함께 구조 표시
- **Editor 연동** — 선택한 컴포넌트의 소스 파일을 에디터에서 정확한 줄 번호로 오픈
- **Vite 플러그인** — 빌드 타임에 `data-gori-id` 속성과 Context 훅을 자동 주입 (프로덕션 빌드에서는 제거됨)
- **Runtime Graph** — 실제 렌더링된 컴포넌트 간 관계를 캔버스로 시각화

## 시작하기

의존성 설치:

```bash
pnpm install
```

데모 앱 실행:

```bash
pnpm demo:dev
```

## 에디터 설정

`.env.local` 파일을 생성해 사용할 에디터를 지정합니다:

```bash
# .env.local
VITE_EDITOR=cursor        # Cursor
VITE_EDITOR=code          # VS Code
VITE_EDITOR=antigravity   # Antigravity
VITE_EDITOR=windsurf      # Windsurf
VITE_EDITOR=zed           # Zed
```

## Vite 플러그인 사용법

```ts
// vite.config.ts
import { goriInspect } from './src/vite-plugin';

export default defineConfig({
  plugins: [react(), goriInspect()],
});
```

플러그인은 `dev` 모드에서만 동작하며 프로덕션 빌드에는 어떠한 코드도 추가하지 않습니다.

## Component Inspector 사용법

```tsx
import { ComponentOverlay, InspectButton } from './component-overlay';

function App() {
  const [inspect, setInspect] = useState(false);

  return (
    <>
      {/* 앱 내용 */}
      <ComponentOverlay graph={graph} active={inspect} onDeactivate={() => setInspect(false)} />
      <InspectButton active={inspect} onClick={() => setInspect(p => !p)} />
    </>
  );
}
```

- `⬡` 버튼 클릭 또는 단축키로 Inspector 활성화
- 활성화 후 컴포넌트 위에 마우스를 올리면 amber 점선, 클릭하면 blue 실선으로 선택
- 우측 사이드바에서 폴더 트리로 컴포넌트 위치 확인
- `Open` 버튼 또는 트리 항목 클릭으로 에디터에서 해당 파일 오픈
- `Esc`로 Inspector 종료

## 데모 앱

`demo/` 디렉터리에 FSD(Feature-Sliced Design) 구조의 e-커머스 앱이 포함되어 있습니다.
Gori 기능을 실제 앱 수준의 컴포넌트 구조에서 검증하기 위해 구성되었습니다.

```
demo/src/
  entities/      — product, cart, user 도메인 엔티티
  features/      — category-filter, add-to-cart, quantity-control
  widgets/       — product-catalog, product-detail, cart-summary
  pages/         — home-page, product-page, cart-page
  shared/        — types, api
```
