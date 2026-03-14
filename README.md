# gori

Runtime graph explorer for React applications.

## Demo

Install dependencies:

```bash
pnpm install
```

Run the demo app:

```bash
pnpm demo:dev
```

Build the demo:

```bash
pnpm build:demo
```

Preview the built demo:

```bash
pnpm demo:preview
```

## Current Demo Scope

The current demo wires the minimal runtime path end-to-end:

- `render tracing`
- `use tracing`
- `call tracing`
- `fetch interceptor`
- `RuntimeCollector`
- `buildGraph(...)`
- `projectToFileLevelView(...)`

It is not yet the full Gori runtime. The demo currently records a curated live flow so the end-to-end pipeline can be inspected while broader automatic instrumentation is still being designed.
