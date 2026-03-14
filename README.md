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

The current demo wires the request-only runtime path end-to-end:

- `fetch interceptor`
- `RuntimeCollector`
- `buildGraph(...)`
- `projectToFileLevelView(...)`

It is not yet the full Gori runtime. `render`, `use`, and `call` are still modeled in core types and tests, but only `request` is collected live in the demo.
