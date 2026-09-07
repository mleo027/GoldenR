# Golden API Agent Guide

This repository is the standalone Golden API debugging application. It contains the
`api-debug` module and the Electron/shared runtime required for KCBP and KGBP API calls.
Do not restore unrelated modules from the original GoldenAPI repository.

Detailed repository rules are split under `agents/rules/`:

- `agents/rules/development.md` — development and testing conventions.
- `agents/rules/architecture.md` — module, SQLite, migration, and lifecycle boundaries.
- `agents/rules/commit.md` — staging, verification, commit message, and hook requirements.

## Scope and safety

- Keep all changes inside `D:\KSPB\own_tool\new_golden`.
- Treat `D:\KSPB\own_tool\GoldenAPI` as read-only.
- Treat `D:\KSPB\adapter\adapter` as a read-only native-adapter backup. Change adapter
  sources only under `electron/adapter/native` and generated/runtime artifacts only under
  `electron/adapter` when the build requires them.
- Preserve the `api-debug` boundaries: workspace UI, stores, KCBP services, SQL parameter
  suggestions, import/export, history, and script automation.
- Do not use `git reset --hard`, broad recursive deletion, or `git checkout --` to discard
  user work. Before any cleanup, resolve and verify the exact absolute target and keep a
  backup outside the repository when the operation is material.
- Never bypass repository hooks with `--no-verify`. Fix hook failures and commit normally.
- Never commit local runtime data such as `golden.db`, `golden.db-*`, or
  `legacy-config-backup/`.

## Runtime architecture

### Renderer

- Entry points: `src/main.tsx`, `src/App.tsx`.
- Module registry: `src/platform/registry/app-modules.tsx`.
- API debugger: `src/modules/api-debug`.
- Shared browser/Electron contract: `src/types/electron.d.ts` and
  `src/shared/electron/api.ts`.
- Workspace data supports projects, nested case folders, cases, case parameters, common
  parameter sets, tabs, and request history. Folder relationships use `parentId` on folders
  and `folderId` on cases.

### Electron

- Main entry: `electron/main.ts`.
- Startup orchestration: `electron/app/bootstrap.ts` and `electron/app/context.ts`.
- Minimal preload bridge: `electron/preload.ts`.
- IPC registration: `electron/ipc/register.ts` and domain-specific files under
  `electron/ipc`.
- KCBP/KGBP runtime: `electron/services/kcbp`; response normalization is in
  `electron/services/kcbp/response.ts`.
- Parameter suggestions: `electron/services/suggest`.
- Native adapter artifacts: `electron/adapter`; native sources: `electron/adapter/native`.

### SQLite persistence

`golden.db` is the only runtime configuration and project-data backend. The database is
created in the existing environment-specific configuration directory: project directory in
development, executable directory for portable builds, and Electron `userData` for installed
builds.

- Connection lifecycle: `electron/database/connection.ts`.
- Startup initialization: `electron/database/initializeDatabase.ts`.
- Canonical SQL schema: `electron/database/schema/schema.sql`.
- Schema migrations: `electron/database/schema/migrations.ts`; update the schema version for
  every structural change.
- Domain repository: `electron/database/repositories/configRepository.ts`.
- One-time legacy import: `electron/database/legacy-import`; it may read old JSON only when
  the database data-migration marker is absent. Successful import moves files to
  `legacy-config-backup`.

Runtime code must not read or write legacy JSON files. JSON/INI remains valid only for
explicit user import/export flows. Structured or dynamic values stored in SQLite TEXT columns
must be serialized and validated by the application layer.

When changing persistence:

1. Update `schema.sql`.
2. Add an idempotent migration in `migrations.ts`.
3. Update repository read/write behavior in one transaction where consistency matters.
4. Add database tests for creation, upgrade, rollback/retry, and relevant CRUD behavior.
5. Do not hand-edit user `golden.db` files as part of a code change.

## Coding and UI conventions

- Keep IPC handlers narrow, validate renderer input, and use the established error wrappers.
- Keep preload APIs minimal and update both the shared type and preload implementation when
  changing a channel.
- Prefer small domain modules over growing monolithic stores/services. Preserve public exports
  when extracting implementation files unless a breaking change is intentional.
- Keep case-tree UI compact and file-tree-like: clear hierarchy guides, restrained indentation,
  and no duplicate rendering of folder cases at project root.
- Use Prettier for TypeScript, TSX, CSS, JSON, SQL, Markdown, and `AGENTS.md`. Do not add
  generated build output to commits.

## Verification commands

Run the narrowest relevant checks while developing, then the full required checks before
handoff:

```bash
npm run typecheck
npm run test:api
npx vite build
npm run lint
npm run ipc:check
```

Useful targeted suites:

```bash
npm run test:database
npm run test:kcbp
npm run test:import
npm run test:suggest
npm run test:persist
npm run test:core
npm run test:component
```

For formatting, use `npm run format` or a targeted `npx prettier --write ...`; use
`npx prettier --check ...` to verify changed files. A full repository format check may include
pre-existing violations, so report those separately rather than rewriting unrelated files.

Before committing, inspect `git diff --check`, review the staged diff, run the relevant tests,
and commit with a descriptive message through the normal hooks.
