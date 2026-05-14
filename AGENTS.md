# Repository Guidelines

## Project Structure & Module Organization

Bun + TypeScript backend built with Elysia, Drizzle ORM, PostgreSQL, Better Auth, and OpenAPI support. The entry point is `src/index.ts`, which wires middleware, auth, OpenAPI, and feature controllers.

Feature code is grouped by domain under `src/<domain>/`, using `*.controller.ts`, `*.service.ts`, and `*.model.ts`; see `src/anime/anime.controller.ts`. Shared helpers live in `src/utils/`. Database access is in `src/db.ts`, schema definitions are in `src/db/schema.ts`, and migrations are in `drizzle/`.

Tests are colocated with source files using `*.test.ts`, such as `src/utils/pagination.test.ts`.

## Build, Test, and Development Commands

- `bun install`: install dependencies from `bun.lock`.
- `bun run dev`: run the Elysia server in watch mode from `src/index.ts`.
- `bun test`: run Bun tests. Use this directly; `package.json` still has a placeholder `test` script.
- `bun run migrate`: generate and apply Drizzle migrations using `drizzle.config.ts`.
- `docker build -t diplom-back-v2 .`: build the production container image.

Local runtime configuration comes from environment variables. Copy `.env.example` and set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.

## Coding Style & Naming Conventions

Use strict TypeScript and ESM imports. Prefer the `@/*` path alias for cross-module imports, and relative imports within one feature folder. Follow existing domain naming: `AnimeService`, `animeController`, `AnimeModel`, and `episode-video.service.ts`.

Keep controllers thin: validate request shape with Elysia/typebox models and delegate business logic to services. Make table and relation changes in `src/db/schema.ts`, then generate migrations instead of editing snapshots by hand.

There is no formatter or linter config in this repo. Match nearby style, keep indentation consistent in touched files, and avoid broad formatting-only diffs.

## Testing Guidelines

Use `bun:test` with `describe`, `test`, and `expect`. Add tests beside covered code with the `*.test.ts` suffix. Prioritize pure helpers, pagination/sorting behavior, and service logic that can regress without a database fixture. Run `bun test` before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses concise conventional prefixes such as `feat:` and `fix:`. Keep commits focused and describe behavior, for example `feat: add pagination for episode videos`.

Pull requests should include a short summary, linked issue when available, migration notes for schema changes, and the commands run for verification. For API changes, mention affected routes and request/response shape changes.

## Security & Configuration Tips

Do not commit real `.env` values. Treat Better Auth schema sections in `src/db/schema.ts` carefully and update them only with reference to Better Auth documentation. Ensure migrations and schema stay in sync before deployment.
