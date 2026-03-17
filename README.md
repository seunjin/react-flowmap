# react-flowmap

An in-app runtime component inspector and visual graph explorer for React + Vite.

- **Pick mode** — click any element on screen to inspect it (DevTools-style crosshair)
- **Component tree** — browse all mounted components with search and folder grouping
- **Props** — live prop values with TypeScript type hints and jump-to-source
- **Relations** — visual parent / child / hook relationship graph per component
- **Graph window** — full component map in a dedicated window, top-down flow layout

> Dev-only. The Vite plugin runs only in `dev` mode — zero code injected in production builds.

## Install

```bash
npm install -D react-flowmap
# or
pnpm add -D react-flowmap
```

## Setup

**1. Add the Vite plugin** (`vite.config.ts`):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flowmapInspect } from 'react-flowmap/vite';

export default defineConfig({
  plugins: [react(), flowmapInspect()],
});
```

**2. Add `<ReactFlowMap />` anywhere in your app root**:

```tsx
import { ReactFlowMap } from 'react-flowmap';

function App() {
  return (
    <>
      {/* your app */}
      <ReactFlowMap />
    </>
  );
}
```

Done. Click the `⬡` button in the bottom-right corner to open the inspector.

## Editor integration

Set `VITE_EDITOR` in `.env.local` to jump directly to source from the inspector:

```bash
VITE_EDITOR=cursor      # Cursor
VITE_EDITOR=code        # VS Code
VITE_EDITOR=windsurf    # Windsurf
VITE_EDITOR=zed         # Zed
```

## Options

**Plugin:**

```ts
flowmapInspect({
  editor: 'cursor',         // override VITE_EDITOR env var
  exclude: [/my-pattern/],  // skip files matching these patterns
})
```

**Component:**

```tsx
<ReactFlowMap
  config={{
    defaultFloatPos: { x: 900, y: 80 },        // initial panel position (px)
    buttonPosition: { bottom: 24, right: 24 }, // ⬡ button position (px)
  }}
/>
```

## Props display

| Value type | Display |
|---|---|
| `string`, `number`, `boolean`, `null` | inline with color |
| `function` | `name()` — `bound dispatchSetState` normalized to `setState()` |
| `object`, `array` | formatted JSON block |

TypeScript type names are shown next to each prop. Click the `↗` icon in the Props section header to jump to the type definition in your editor.

## Panel positions

The inspector panel can be docked or floated. Click the dock icon in the panel header:

| Mode | Description |
|---|---|
| `float` | draggable floating panel (default) |
| `right` | pinned to the right edge |
| `left` | pinned to the left edge |
| `bottom` | pinned to the bottom edge |

Position is saved to `localStorage` automatically.

## How it works

The Vite plugin instruments your React components at dev-time with a lightweight Babel AST transform:

- Injects `useContext` + `useEffect` hooks to track render parent–child relationships at runtime
- Sets static `__rfm_symbolId` properties on component functions for DOM-to-fiber lookups
- Extracts TypeScript prop types via `ts-morph` at transform time for inline display
- Performs static JSX analysis so the component graph is accurate even for conditionally-rendered components (e.g. auth-gated layouts)

All instrumentation is removed in production — `flowmapInspect()` is a no-op when `command !== 'serve'`.
