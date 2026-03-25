# react-flowmap

An in-app runtime component inspector and visual graph explorer for React. Works with Vite and Next.js App Router.

- **Pick mode** — click any element on screen to inspect it (DevTools-style crosshair)
- **Component tree** — browse all mounted components with search and folder grouping
- **Props** — live prop values with TypeScript type hints and jump-to-source
- **Relations** — visual parent / child / hook relationship graph per component
- **Graph window** — full component map in a dedicated window, top-down flow layout
- **Fragment support** — components rendering multiple root elements are highlighted across their full area

> Dev-only. Instrumentation runs only in development mode — zero code injected in production builds.

## Install

```bash
npm install -D react-flowmap
# or
pnpm add -D react-flowmap
```

## Setup

### Vite

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

### Next.js App Router

**1. Wrap your Next.js config** (`next.config.ts`):

```ts
import { withFlowmap } from 'react-flowmap/next';

export default withFlowmap({
  // your existing Next.js config
});
```

**2. Add an API route** (`app/api/rfm-open/route.ts`):

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { openInEditor } from 'react-flowmap/next';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  const line = parseInt(searchParams.get('line') ?? '1', 10) || 1;
  const editor = process.env['NEXT_EDITOR'] ?? process.env['EDITOR'] ?? 'code';

  if (!file) return NextResponse.json({ ok: false, error: 'missing file' }, { status: 400 });

  const { resolve } = await import('node:path');
  openInEditor(resolve(process.cwd(), file), line, editor);
  return NextResponse.json({ ok: true });
}
```

**3. Add `<ReactFlowMap />` to your root layout** (`app/layout.tsx`):

Only works inside a `'use client'` component — create a wrapper:

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

> **Note**: `withFlowmap` only activates in dev mode (`next dev`). In production builds it's a pass-through. Run with `next dev --webpack` (Turbopack is not yet supported).

Done. Click the `⬡` button in the bottom-right corner to open the inspector.

## Editor integration

Set the `editor` option to jump directly to source from the inspector:

**Vite** (`vite.config.ts`):
```ts
flowmapInspect({
  editor: 'cursor',       // Cursor
  editor: 'code',         // VS Code
  editor: 'windsurf',     // Windsurf
  editor: 'zed',          // Zed
  editor: 'antigravity',  // Google Antigravity
  editor: 'codium',       // VSCodium (or 'vscodium')
})
```

Each value is fully autocompleted in TypeScript. You can also pass any custom binary name or path.

Override per-machine via `.env.local`:

```bash
# Vite
VITE_EDITOR=cursor

# Next.js
NEXT_EDITOR=cursor
```

**Next.js** — pass `editor` to `withFlowmap`:
```ts
withFlowmap({}, { editor: 'cursor' })
```

## Options

**Vite plugin:**

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

For **Vite**, the plugin runs only when `command === 'serve'`. For **Next.js**, it runs only in `dev` mode and only on files with `'use client'` directive (server components are never instrumented).

All instrumentation is removed in production builds.
