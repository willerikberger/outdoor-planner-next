# CLAUDE.md

Outdoor Planner Next -- a canvas-based tool for designing garden and driveway layouts to scale. Built with Next.js 16 App Router, Fabric.js for the HTML5 canvas, and Zustand for state.

## Commands

```bash
npm run dev      # Next.js dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
npx vitest       # Run tests (vitest 4, happy-dom, fake-indexeddb)
npx tsc --noEmit # Type-check
```

## Tech Stack

- Next.js 16.1.6 (App Router), React 19, TypeScript 5
- Fabric.js 6.9.1 -- HTML5 canvas library
- Zustand 5 -- state management
- Tailwind CSS 4, Radix UI primitives, Lucide icons
- Vitest 4 + happy-dom + fake-indexeddb for tests

## Architecture

- **Client-only canvas**: `PlannerApp` is loaded via `ClientLoader` with `next/dynamic` (SSR disabled).
- **Zustand store** (`lib/store.ts`): serializable metadata (`Map<number, PlannerObject>`), mode, scale, colors, status.
- **FabricRefs pattern**: mutable Fabric objects live in a `Map<number, FabricRefs>` ref (`allFabricRefsRef`) inside `PlannerCanvas`, not in Zustand.
- **Mode system**: `PlannerMode = 'normal' | 'calibrating' | 'drawing-line' | 'drawing-mask' | 'cleanup'`. `useCanvasEvents` routes mouse events by mode.
- **Imperative handle**: `PlannerCanvas` exposes `PlannerCanvasHandle` via `forwardRef` + `useImperativeHandle`. Sidebar calls canvas methods through this ref.
- **Hooks compose in PlannerCanvas**: `useFabricCanvas`, `usePanZoom`, `useCalibration`, `useShapes`, `useLines`, `useImages`, `useCleanup`, `useCanvasEvents`, `useKeyboardShortcuts`. All share `allFabricRefsRef`.
- **Auto-save**: debounced (2s) writes to IndexedDB on object modification.
- **Serialization**: `SerializedProject` (version 2) combines store metadata + extracted Fabric state. Compatible with v2 vanilla app format.

## File Structure

```
src/
  app/                          # Next.js App Router entry
  components/
    PlannerApp.tsx              # Top-level layout (sidebar + canvas)
    ClientLoader.tsx            # Dynamic import wrapper (no SSR)
    canvas/
      PlannerCanvas.tsx         # Canvas + imperative handle
      hooks/                    # 9 hooks (useFabricCanvas, usePanZoom, etc.)
      utils/                    # serialization, geometry, fabricHelpers
    sidebar/                    # Sidebar panels (calibration, shapes, lines, etc.)
    ui/                         # Reusable UI (button, input, dialog, tabs, etc.)
  lib/
    types.ts                    # All TypeScript types
    store.ts                    # Zustand store
    constants.ts                # Colors, theme, defaults, DB config
    storage/                    # indexeddb.ts, json-export.ts
  __tests__/                    # Vitest tests
```

## Important Patterns

- Fabric objects carry custom props (`objectId`, `objectType`, `parentId`, `baseWidthPx`, etc.) accessed via `as unknown as Record<string, unknown>`.
- Factory functions in `fabricHelpers.ts` use `as any` for custom Fabric props -- this is intentional.
- All canvas hooks receive `fabricCanvasRef` and a typed cast of `allFabricRefsRef`.
- Selectors: `selectVisibleObjects` (shapes, lines, overlays), `selectObjectById`.
- Path alias: `@/*` maps to `./src/*`.

## Testing

- Vitest with `happy-dom` environment
- `fake-indexeddb` for IndexedDB tests
- Tests in `src/__tests__/` (store, serialization, geometry, indexeddb)
