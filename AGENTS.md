# Golden API Agent Guide

This repository is the standalone Golden API application. It contains only the `api-debug` module and the Electron/shared code required to run KCBP API debugging.

## Rules

- Do not re-add modules from the original GoldenAPI repository.
- Keep `D:\KSPB\own_tool\GoldenAPI` read-only.
- Keep changes inside `D:\KSPB\own_tool\new_golden.
- Preserve the existing `api-debug` module boundaries: UI, stores, KCBP services, SQL parameter suggestions, import/export, and script automation.
- Before recursive cleanup, verify absolute target paths and keep a backup outside the working tree.
- `D:\KSPB\adapter\adapter` is a read-only backup of the native adapter sources; all adapter changes happen in `electron/adapter/native`.

## Commands

```bash
npm run typecheck
npm run test:api
npx vite build
```

## Architecture

- Renderer entry: `src/main.tsx` and `src/App.tsx`.
- Module registry: `src/platform/registry/app-modules.tsx`.
- API debug module: `src/modules/api-debug`.
- Electron entry: `electron/main.ts`.
- Minimal preload API: `electron/preload.ts` and `src/types/electron.d.ts`.
- KCBP native adapter: artifacts in `electron/adapter`, sources in `electron/adapter/native` (build with `npm run build:native`). Original standalone copy at `D:\KSPB\adapter\adapter` is a read-only backup.
