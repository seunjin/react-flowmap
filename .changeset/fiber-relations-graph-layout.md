---
"react-flowmap": patch
---

fix: graph window now correctly lays out component hierarchy using live fiber relationships

Previously, the full-graph layout relied on `staticJsx` (which only tracked relative-path imports like `./Foo`) and runtime render events. This caused nearly all nodes to appear in a single horizontal line in projects that use alias imports (`@components/Nav`) or Outlet-mediated routing (TanStack Router), because no edges were resolved and every node got depth 0.

Added `buildFiberRelationships()` which walks the live React fiber tree to extract direct parent→child relationships between RFM-instrumented components. This correctly captures alias-imported components and route components rendered through `<Outlet />`, since it traverses the actual fiber `.return` chain rather than relying on import path analysis.

The fiber relationship map is now broadcast to the graph window alongside `staticJsx` and used as an additional edge source in the Kahn's topological sort, so nodes are properly arranged top-to-bottom reflecting the real component hierarchy.
