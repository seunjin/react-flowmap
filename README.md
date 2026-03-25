# react-flowmap

An in-app runtime component inspector and visual graph explorer for React.

- **Pick mode** — click any element on screen to inspect it (DevTools-style crosshair)
- **Component tree** — browse all mounted components with search and folder grouping
- **Props** — live prop values with TypeScript type hints and jump-to-source
- **Relations** — visual parent / child / hook relationship graph per component
- **Graph window** — full component map in a dedicated window, top-down flow layout
- **Fragment support** — components rendering multiple root elements are highlighted across their full area

> Dev-only. Instrumentation runs only in development mode — zero code injected in production builds.

## Framework support

| Framework | Status | What's tracked |
|---|---|---|
| Vite + React | ✅ Full | All components |
| Vite + TanStack Router | ✅ Full | All components including route pages |
| Vite + React Router | ✅ Full | All components |
| TanStack Start | ✅ Full | All components including route pages |
| Next.js App Router | ⚠️ Partial | `'use client'` components only — server components are not tracked |

## Install

```bash
npm install -D react-flowmap
# or
pnpm add -D react-flowmap
```

## Setup

### Vite (React / TanStack Router / React Router)

**1. Add the Vite plugin** (`vite.config.ts`):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flowmapInspect } from 'react-flowmap/vite';

export default defineConfig({
  plugins: [react(), flowmapInspect()],
});
```

**2. Add `<ReactFlowMap />` to your app root**:

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

Works the same way with TanStack Router or React Router — just place `<ReactFlowMap />` in the root component that wraps your router.

### TanStack Start

**1. Add the Vite plugin** (`vite.config.ts`):

```ts
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { flowmapInspect } from 'react-flowmap/vite';

export default defineConfig({
  plugins: [tanstackStart(), viteReact(), flowmapInspect()],
});
```

**2. Add `<ReactFlowMap />` to your root route** (`app/routes/__root.tsx`):

```tsx
import { ReactFlowMap } from 'react-flowmap';

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head><HeadContent /></head>
      <body>
        {children}
        <ReactFlowMap />
        <Scripts />
      </body>
    </html>
  );
}
```

### Next.js App Router

> **Limitation**: Only `'use client'` components are tracked. Server components (`app/layout.tsx`, `app/page.tsx`, etc.) are not instrumented — they run on the server and have no runtime presence in the browser.

**1. Wrap your Next.js config** (`next.config.ts`):

```ts
import { withFlowmap } from 'react-flowmap/next';

export default withFlowmap({
  // your existing Next.js config
});
```

**2. Add `<ReactFlowMap />` to your root layout** (`app/layout.tsx`):

`<ReactFlowMap />` must be inside a `'use client'` component — create a wrapper:

```tsx
// components/FlowmapProvider.tsx
'use client';
import { ReactFlowMap } from 'react-flowmap';
export function FlowmapProvider() { return <ReactFlowMap />; }
```

```tsx
// app/layout.tsx
import { FlowmapProvider } from '@/components/FlowmapProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <FlowmapProvider />
      </body>
    </html>
  );
}
```

> **Note**: Run with `next dev --webpack`. Turbopack is not yet supported.

Done. Click the `⬡` button in the bottom-right corner to open the inspector.

## Editor integration

Set the `editor` option to jump directly to source from the inspector:

**Vite / TanStack Start** (`vite.config.ts`):
```ts
flowmapInspect({
  editor: 'cursor',       // Cursor
  // editor: 'code',      // VS Code
  // editor: 'windsurf',  // Windsurf
  // editor: 'zed',       // Zed
  // editor: 'antigravity', // Google Antigravity
  // editor: 'codium',    // VSCodium (or 'vscodium')
})
```

**Next.js** (`next.config.ts`):
```ts
withFlowmap({}, { editor: 'cursor' })
```

Override per-machine without touching config files (`.env.local`):

```bash
VITE_EDITOR=cursor   # Vite / TanStack Start
NEXT_EDITOR=cursor   # Next.js
```

Each editor name is fully autocompleted in TypeScript. You can also pass any custom binary name or absolute path.

## Options

**Vite / TanStack Start plugin:**

```ts
flowmapInspect({
  editor: 'cursor',         // editor to open source files
  exclude: [/my-pattern/],  // skip files matching these patterns
})
```

**Next.js plugin:**

```ts
withFlowmap(nextConfig, {
  editor: 'cursor',         // editor to open source files
  exclude: [/my-pattern/],  // skip files matching these patterns
})
```

**`<ReactFlowMap />` component:**

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
| `right` | pinned to the right edge (default) |
| `left` | pinned to the left edge |
| `bottom` | pinned to the bottom edge |
| `float` | draggable floating panel |

Position is saved to `localStorage` automatically.

## How it works

The plugin instruments your React components at dev-time with a lightweight Babel AST transform:

- Injects `useContext` + `useEffect` hooks to track render parent–child relationships at runtime
- Sets static `__rfm_symbolId` properties on component functions for DOM-to-fiber lookups
- Extracts TypeScript prop types via `ts-morph` at transform time for inline display
- Performs static JSX analysis so the component graph is accurate even for conditionally-rendered components (e.g. auth-gated layouts)
- The inspector UI renders inside a Shadow DOM to prevent any style conflicts with your app

For **Vite and TanStack Start**, all components are instrumented. For **Next.js**, only `'use client'` files are instrumented — server components are never touched.

All instrumentation is removed in production builds.
