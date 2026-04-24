# Foundation MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable engineering slice for the self-hosted couple life assistant: repository setup, TypeScript monorepo, Fastify API, SQLite persistence, single-couple bootstrap, Docker deployment, and CI.

**Architecture:** Use a pnpm monorepo with a WeChat Mini Program app reserved under `apps/miniprogram`, a Fastify API under `apps/api`, and shared TypeScript contracts under `packages/shared`. The API owns configuration, database migrations, health checks, and the single-couple setup flow; Docker Compose runs the API with a persisted data volume on Orange Pi.

**Tech Stack:** pnpm workspace, TypeScript, Node.js 22, Fastify, SQLite, better-sqlite3, Drizzle ORM schema definitions, Vitest, Docker, GitHub Actions.

---

## Scope

This plan implements the foundation only. It does not implement meal recommendations, AI Agent calls, MCP tools, WeChat pages, reminders, expense entry, parcel entry, or water tracking. Those are separate plans after this foundation is running and testable.

## File Structure

Create this structure:

```text
.
├── .editorconfig
├── .gitignore
├── .npmrc
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config/
│   │   │   │   └── env.ts
│   │   │   ├── db/
│   │   │   │   ├── client.ts
│   │   │   │   ├── migrations.ts
│   │   │   │   └── schema.ts
│   │   │   ├── features/
│   │   │   │   └── setup/
│   │   │   │       ├── setup-routes.ts
│   │   │   │       └── setup-service.ts
│   │   │   └── server/
│   │   │       ├── build-app.ts
│   │   │       └── health-routes.ts
│   │   └── tests/
│   │       ├── db.test.ts
│   │       ├── health.test.ts
│   │       └── setup.test.ts
│   └── miniprogram/
│       └── README.md
├── deploy/
│   ├── docker-compose.yml
│   ├── env.example
│   └── orange-pi.md
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── src/
        │   ├── index.ts
        │   └── setup.ts
        └── tests/
            └── setup.test.ts
```

---

### Task 1: Initialize Git And Workspace Metadata

**Files:**
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `README.md`
- Create: `apps/miniprogram/README.md`

- [ ] **Step 1: Initialize Git**

Run:

```powershell
git init
git branch -M main
git status --short
```

Expected: `git status --short` lists the existing `docs/` directory and no error about missing `.git`.

- [ ] **Step 2: Create root workspace files**

Create `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
pnpm-lock.yaml
data/
*.db
*.db-shm
*.db-wal
.DS_Store
Thumbs.db
```

Create `.npmrc`:

```ini
engine-strict=true
auto-install-peers=true
```

Create `package.json`:

```json
{
  "name": "couple-life-assistant",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "dev:api": "pnpm --filter @couple-life/api dev",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

Create `README.md`:

```markdown
# Couple Life Assistant

Open-source self-hosted WeChat Mini Program for one cohabiting couple. The first supported deployment target is Docker Compose on Orange Pi.

## Apps

- `apps/api`: Fastify API, SQLite database, setup flow, health checks.
- `apps/miniprogram`: WeChat Mini Program source.
- `packages/shared`: Shared TypeScript contracts.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm dev:api
```

## Deployment

Copy `deploy/env.example` to `deploy/.env`, edit the values, then run:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d
```
```

Create `apps/miniprogram/README.md`:

```markdown
# WeChat Mini Program

This directory is reserved for the WeChat Mini Program app. The API foundation is implemented first so the Mini Program can connect to stable endpoints.
```

- [ ] **Step 3: Install dependencies**

Run:

```powershell
pnpm install
```

Expected: install succeeds and creates `pnpm-lock.yaml`.

- [ ] **Step 4: Run root scripts before packages exist**

Run:

```powershell
pnpm test
pnpm typecheck
```

Expected: both commands exit successfully because no package-level tests exist yet.

- [ ] **Step 5: Commit**

Run:

```powershell
git add .editorconfig .gitignore .npmrc README.md package.json pnpm-workspace.yaml tsconfig.base.json apps/miniprogram/README.md pnpm-lock.yaml docs
git commit -m "chore: initialize workspace"
```

Expected: commit succeeds.

---

### Task 2: Add Shared Setup Contracts

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/setup.ts`
- Create: `packages/shared/tests/setup.test.ts`

- [ ] **Step 1: Write failing shared tests**

Create `packages/shared/tests/setup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseInitializeCoupleInput } from "../src/setup.js";

describe("parseInitializeCoupleInput", () => {
  it("normalizes valid setup input", () => {
    const result = parseInitializeCoupleInput({
      coupleName: "  Our Home  ",
      selfName: "  Wink  ",
      partnerName: "  Partner  "
    });

    expect(result).toEqual({
      coupleName: "Our Home",
      selfName: "Wink",
      partnerName: "Partner"
    });
  });

  it("rejects empty names", () => {
    expect(() =>
      parseInitializeCoupleInput({
        coupleName: " ",
        selfName: "Wink",
        partnerName: "Partner"
      })
    ).toThrow("coupleName is required");
  });

  it("rejects names longer than 40 characters", () => {
    expect(() =>
      parseInitializeCoupleInput({
        coupleName: "A".repeat(41),
        selfName: "Wink",
        partnerName: "Partner"
      })
    ).toThrow("coupleName must be 40 characters or fewer");
  });
});
```

- [ ] **Step 2: Add package metadata**

Create `packages/shared/package.json`:

```json
{
  "name": "@couple-life/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests"]
}
```

Create `packages/shared/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
pnpm --filter @couple-life/shared test
```

Expected: FAIL with an import error for `../src/setup.js`.

- [ ] **Step 4: Implement shared setup contracts**

Create `packages/shared/src/setup.ts`:

```ts
export type CoupleRole = "self" | "partner";

export interface InitializeCoupleInput {
  coupleName: string;
  selfName: string;
  partnerName: string;
}

export interface InitializeCoupleResult {
  coupleId: string;
  selfUserId: string;
  partnerUserId: string;
  inviteCode: string;
}

export interface SetupStatus {
  configured: boolean;
  coupleName: string | null;
  memberCount: number;
}

function normalizeName(value: unknown, fieldName: keyof InitializeCoupleInput): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (trimmed.length > 40) {
    throw new Error(`${fieldName} must be 40 characters or fewer`);
  }

  return trimmed;
}

export function parseInitializeCoupleInput(input: unknown): InitializeCoupleInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("setup input must be an object");
  }

  const record = input as Record<string, unknown>;

  return {
    coupleName: normalizeName(record.coupleName, "coupleName"),
    selfName: normalizeName(record.selfName, "selfName"),
    partnerName: normalizeName(record.partnerName, "partnerName")
  };
}
```

Create `packages/shared/src/index.ts`:

```ts
export type {
  CoupleRole,
  InitializeCoupleInput,
  InitializeCoupleResult,
  SetupStatus
} from "./setup.js";

export { parseInitializeCoupleInput } from "./setup.js";
```

- [ ] **Step 5: Run shared tests and typecheck**

Run:

```powershell
pnpm --filter @couple-life/shared test
pnpm --filter @couple-life/shared typecheck
pnpm --filter @couple-life/shared build
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/shared package.json pnpm-lock.yaml
git commit -m "feat: add shared setup contracts"
```

Expected: commit succeeds.

---

### Task 3: Add Fastify API Health Checks

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/server/build-app.ts`
- Create: `apps/api/src/server/health-routes.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/tests/health.test.ts`

- [ ] **Step 1: Write failing health test**

Create `apps/api/tests/health.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("health routes", () => {
  it("returns live status", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      runDatabaseMigrations: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/live"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "couple-life-api"
    });

    await app.close();
  });
});
```

- [ ] **Step 2: Add API package metadata**

Create `apps/api/package.json`:

```json
{
  "name": "@couple-life/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts",
    "lint": "tsc -p tsconfig.json --noEmit",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@couple-life/shared": "workspace:*",
    "@fastify/cors": "^10.0.2",
    "better-sqlite3": "^11.8.1",
    "drizzle-orm": "^0.38.4",
    "fastify": "^5.2.1",
    "nanoid": "^5.0.9",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests"]
}
```

Create `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

- [ ] **Step 3: Install API dependencies**

Run:

```powershell
pnpm install
```

Expected: install succeeds and updates `pnpm-lock.yaml`.

- [ ] **Step 4: Run test to verify it fails**

Run:

```powershell
pnpm --filter @couple-life/api test
```

Expected: FAIL with an import error for `../src/server/build-app.js`.

- [ ] **Step 5: Implement Fastify app and health route**

Create `apps/api/src/config/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default("file:./data/app.db")
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
```

Create `apps/api/src/server/health-routes.ts`:

```ts
import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "couple-life-api"
  }));
}
```

Create `apps/api/src/server/build-app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getEnv, type AppEnv } from "../config/env.js";
import { registerHealthRoutes } from "./health-routes.js";

export interface BuildAppOptions {
  env?: AppEnv;
  databaseUrl?: string;
  logger?: boolean;
  runDatabaseMigrations?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV === "production"
  });

  await app.register(cors, {
    origin: true
  });

  await registerHealthRoutes(app);

  return app;
}
```

Create `apps/api/src/index.ts`:

```ts
import { getEnv } from "./config/env.js";
import { buildApp } from "./server/build-app.js";

const env = getEnv();
const app = await buildApp({
  env,
  logger: true
});

try {
  await app.listen({
    host: env.HOST,
    port: env.PORT
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
```

- [ ] **Step 6: Run API tests and typecheck**

Run:

```powershell
pnpm --filter @couple-life/api test
pnpm --filter @couple-life/api typecheck
pnpm --filter @couple-life/api build
```

Expected: all commands pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat: add api health checks"
```

Expected: commit succeeds.

---

### Task 4: Add SQLite Schema And Migrations

**Files:**
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrations.ts`
- Modify: `apps/api/src/server/build-app.ts`
- Modify: `apps/api/src/server/health-routes.ts`
- Create: `apps/api/tests/db.test.ts`
- Modify: `apps/api/tests/health.test.ts`

- [ ] **Step 1: Write failing database test**

Create `apps/api/tests/db.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrations.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("database migrations", () => {
  it("creates foundation tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "couple-life-db-"));
    tempDirs.push(dir);

    const database = openDatabase(`file:${join(dir, "app.db")}`);
    runMigrations(database.sqlite);

    const tables = database.sqlite
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toContain("couples");
    expect(tables).toContain("users");
    expect(tables).toContain("couple_members");
    expect(tables).toContain("meal_records");
    expect(tables).toContain("memory_embeddings");

    database.sqlite.close();
  });
});
```

- [ ] **Step 2: Run database test to verify it fails**

Run:

```powershell
pnpm --filter @couple-life/api test -- tests/db.test.ts
```

Expected: FAIL with an import error for `../src/db/client.js`.

- [ ] **Step 3: Add schema definitions**

Create `apps/api/src/db/schema.ts`:

```ts
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const couples = sqliteTable("couples", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const coupleMembers = sqliteTable("couple_members", {
  id: text("id").primaryKey(),
  coupleId: text("couple_id").notNull().references(() => couples.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["self", "partner"] }).notNull(),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const mealRecords = sqliteTable("meal_records", {
  id: text("id").primaryKey(),
  occurredOn: text("occurred_on").notNull(),
  vendorName: text("vendor_name").notNull(),
  itemsJson: text("items_json").notNull(),
  amountCents: integer("amount_cents"),
  rating: integer("rating"),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const memoryEmbeddings = sqliteTable("memory_embeddings", {
  id: text("id").primaryKey(),
  memoryType: text("memory_type").notNull(),
  sourceTable: text("source_table").notNull(),
  sourceId: text("source_id").notNull(),
  content: text("content").notNull(),
  embeddingJson: text("embedding_json").notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const schema = {
  couples,
  users,
  coupleMembers,
  mealRecords,
  memoryEmbeddings
};
```

- [ ] **Step 4: Add database client and migrations**

Create `apps/api/src/db/client.ts`:

```ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { schema } from "./schema.js";

export interface AppDatabase {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
}

function resolveSqlitePath(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  const withoutScheme = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length)
    : databaseUrl;

  return isAbsolute(withoutScheme) ? withoutScheme : resolve(process.cwd(), withoutScheme);
}

export function openDatabase(databaseUrl: string): AppDatabase {
  const sqlitePath = resolveSqlitePath(databaseUrl);

  if (sqlitePath !== ":memory:") {
    mkdirSync(dirname(sqlitePath), { recursive: true });
  }

  const sqlite = new Database(sqlitePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}
```

Create `apps/api/src/db/migrations.ts`:

```ts
import type Database from "better-sqlite3";

export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    create table if not exists couples (
      id text primary key,
      name text not null,
      invite_code text not null unique,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists users (
      id text primary key,
      display_name text not null,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists couple_members (
      id text primary key,
      couple_id text not null references couples(id),
      user_id text not null references users(id),
      role text not null check (role in ('self', 'partner')),
      joined_at text not null default CURRENT_TIMESTAMP,
      unique (couple_id, user_id),
      unique (couple_id, role)
    );

    create table if not exists meal_records (
      id text primary key,
      occurred_on text not null,
      vendor_name text not null,
      items_json text not null,
      amount_cents integer,
      rating integer check (rating is null or (rating >= 1 and rating <= 5)),
      note text,
      created_at text not null default CURRENT_TIMESTAMP
    );

    create table if not exists memory_embeddings (
      id text primary key,
      memory_type text not null,
      source_table text not null,
      source_id text not null,
      content text not null,
      embedding_json text not null,
      metadata_json text not null,
      created_at text not null default CURRENT_TIMESTAMP,
      updated_at text not null default CURRENT_TIMESTAMP
    );

    create index if not exists idx_memory_embeddings_type
      on memory_embeddings(memory_type);

    create index if not exists idx_memory_embeddings_source
      on memory_embeddings(source_table, source_id);
  `);
}
```

- [ ] **Step 5: Add readiness health check**

Replace `apps/api/src/server/health-routes.ts` with:

```ts
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../db/client.js";

export interface HealthRouteOptions {
  database: AppDatabase;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions
): Promise<void> {
  app.get("/health/live", async () => ({
    status: "ok",
    service: "couple-life-api"
  }));

  app.get("/health/ready", async () => {
    options.database.sqlite.prepare("select 1 as ok").get();

    return {
      status: "ok",
      checks: {
        database: "ok"
      }
    };
  });
}
```

Replace `apps/api/src/server/build-app.ts` with:

```ts
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getEnv, type AppEnv } from "../config/env.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { runMigrations } from "../db/migrations.js";
import { registerHealthRoutes } from "./health-routes.js";

export interface BuildAppOptions {
  env?: AppEnv;
  database?: AppDatabase;
  databaseUrl?: string;
  logger?: boolean;
  runDatabaseMigrations?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  const database =
    options.database ?? openDatabase(options.databaseUrl ?? env.DATABASE_URL);

  if (options.runDatabaseMigrations !== false) {
    runMigrations(database.sqlite);
  }

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV === "production"
  });

  app.addHook("onClose", async () => {
    database.sqlite.close();
  });

  await app.register(cors, {
    origin: true
  });

  await registerHealthRoutes(app, { database });

  return app;
}
```

Replace `apps/api/tests/health.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("health routes", () => {
  it("returns live status", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:",
      runDatabaseMigrations: false
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/live"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "couple-life-api"
    });

    await app.close();
  });

  it("returns ready status after database migration", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    const response = await app.inject({
      method: "GET",
      url: "/health/ready"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      checks: {
        database: "ok"
      }
    });

    await app.close();
  });
});
```

- [ ] **Step 6: Run database and health tests**

Run:

```powershell
pnpm --filter @couple-life/api test -- tests/db.test.ts tests/health.test.ts
pnpm --filter @couple-life/api typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

Run:

```powershell
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat: add sqlite foundation"
```

Expected: commit succeeds.

---

### Task 5: Add Single-Couple Bootstrap API

**Files:**
- Create: `apps/api/src/features/setup/setup-service.ts`
- Create: `apps/api/src/features/setup/setup-routes.ts`
- Modify: `apps/api/src/server/build-app.ts`
- Create: `apps/api/tests/setup.test.ts`

- [ ] **Step 1: Write failing setup tests**

Create `apps/api/tests/setup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/build-app.js";

describe("setup API", () => {
  it("starts as unconfigured", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/setup/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      configured: false,
      coupleName: null,
      memberCount: 0
    });

    await app.close();
  });

  it("initializes exactly one couple", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/initialize",
      payload: {
        coupleName: "Our Home",
        selfName: "Wink",
        partnerName: "Partner"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      coupleId: expect.any(String),
      selfUserId: expect.any(String),
      partnerUserId: expect.any(String),
      inviteCode: expect.stringMatching(/^[A-Z0-9]{8}$/)
    });

    const statusResponse = await app.inject({
      method: "GET",
      url: "/api/setup/status"
    });

    expect(statusResponse.json()).toEqual({
      configured: true,
      coupleName: "Our Home",
      memberCount: 2
    });

    await app.close();
  });

  it("rejects a second initialization", async () => {
    const app = await buildApp({
      databaseUrl: ":memory:"
    });

    await app.inject({
      method: "POST",
      url: "/api/setup/initialize",
      payload: {
        coupleName: "Our Home",
        selfName: "Wink",
        partnerName: "Partner"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/setup/initialize",
      payload: {
        coupleName: "Another Home",
        selfName: "A",
        partnerName: "B"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "SETUP_ALREADY_COMPLETED",
      message: "This deployment is already bound to one couple"
    });

    await app.close();
  });
});
```

- [ ] **Step 2: Run setup tests to verify they fail**

Run:

```powershell
pnpm --filter @couple-life/api test -- tests/setup.test.ts
```

Expected: FAIL with `Route GET:/api/setup/status not found`.

- [ ] **Step 3: Implement setup service**

Create `apps/api/src/features/setup/setup-service.ts`:

```ts
import { parseInitializeCoupleInput, type InitializeCoupleResult, type SetupStatus } from "@couple-life/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../../db/client.js";

export class SetupAlreadyCompletedError extends Error {
  constructor() {
    super("This deployment is already bound to one couple");
    this.name = "SetupAlreadyCompletedError";
  }
}

export function createInviteCode(): string {
  return nanoid(8).toUpperCase().replace(/_/g, "0").replace(/-/g, "1");
}

export function getSetupStatus(database: AppDatabase): SetupStatus {
  const couple = database.sqlite
    .prepare("select id, name from couples order by created_at asc limit 1")
    .get() as { id: string; name: string } | undefined;

  if (!couple) {
    return {
      configured: false,
      coupleName: null,
      memberCount: 0
    };
  }

  const memberCount = database.sqlite
    .prepare("select count(*) as count from couple_members where couple_id = ?")
    .get(couple.id) as { count: number };

  return {
    configured: true,
    coupleName: couple.name,
    memberCount: memberCount.count
  };
}

export function initializeCouple(database: AppDatabase, input: unknown): InitializeCoupleResult {
  const status = getSetupStatus(database);
  if (status.configured) {
    throw new SetupAlreadyCompletedError();
  }

  const parsed = parseInitializeCoupleInput(input);
  const coupleId = nanoid();
  const selfUserId = nanoid();
  const partnerUserId = nanoid();
  const inviteCode = createInviteCode();

  const insert = database.sqlite.transaction(() => {
    database.sqlite
      .prepare("insert into couples (id, name, invite_code) values (?, ?, ?)")
      .run(coupleId, parsed.coupleName, inviteCode);

    database.sqlite
      .prepare("insert into users (id, display_name) values (?, ?)")
      .run(selfUserId, parsed.selfName);

    database.sqlite
      .prepare("insert into users (id, display_name) values (?, ?)")
      .run(partnerUserId, parsed.partnerName);

    database.sqlite
      .prepare("insert into couple_members (id, couple_id, user_id, role) values (?, ?, ?, ?)")
      .run(nanoid(), coupleId, selfUserId, "self");

    database.sqlite
      .prepare("insert into couple_members (id, couple_id, user_id, role) values (?, ?, ?, ?)")
      .run(nanoid(), coupleId, partnerUserId, "partner");
  });

  insert();

  return {
    coupleId,
    selfUserId,
    partnerUserId,
    inviteCode
  };
}
```

- [ ] **Step 4: Implement setup routes**

Create `apps/api/src/features/setup/setup-routes.ts`:

```ts
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../../db/client.js";
import {
  getSetupStatus,
  initializeCouple,
  SetupAlreadyCompletedError
} from "./setup-service.js";

export interface SetupRouteOptions {
  database: AppDatabase;
}

export async function registerSetupRoutes(
  app: FastifyInstance,
  options: SetupRouteOptions
): Promise<void> {
  app.get("/api/setup/status", async () => getSetupStatus(options.database));

  app.post("/api/setup/initialize", async (request, reply) => {
    try {
      const result = initializeCouple(options.database, request.body);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof SetupAlreadyCompletedError) {
        return reply.code(409).send({
          error: "SETUP_ALREADY_COMPLETED",
          message: error.message
        });
      }

      if (error instanceof Error) {
        return reply.code(400).send({
          error: "INVALID_SETUP_INPUT",
          message: error.message
        });
      }

      throw error;
    }
  });
}
```

Modify `apps/api/src/server/build-app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { getEnv, type AppEnv } from "../config/env.js";
import { openDatabase, type AppDatabase } from "../db/client.js";
import { runMigrations } from "../db/migrations.js";
import { registerSetupRoutes } from "../features/setup/setup-routes.js";
import { registerHealthRoutes } from "./health-routes.js";

export interface BuildAppOptions {
  env?: AppEnv;
  database?: AppDatabase;
  databaseUrl?: string;
  logger?: boolean;
  runDatabaseMigrations?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnv();
  const database =
    options.database ?? openDatabase(options.databaseUrl ?? env.DATABASE_URL);

  if (options.runDatabaseMigrations !== false) {
    runMigrations(database.sqlite);
  }

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV === "production"
  });

  app.addHook("onClose", async () => {
    database.sqlite.close();
  });

  await app.register(cors, {
    origin: true
  });

  await registerHealthRoutes(app, { database });
  await registerSetupRoutes(app, { database });

  return app;
}
```

- [ ] **Step 5: Run setup tests and full API tests**

Run:

```powershell
pnpm --filter @couple-life/api test -- tests/setup.test.ts
pnpm --filter @couple-life/api test
pnpm --filter @couple-life/api typecheck
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

Run:

```powershell
git add apps/api packages/shared package.json pnpm-lock.yaml
git commit -m "feat: add single couple setup api"
```

Expected: commit succeeds.

---

### Task 6: Add Docker Compose Deployment For Orange Pi

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `deploy/docker-compose.yml`
- Create: `deploy/env.example`
- Create: `deploy/orange-pi.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create Dockerfile**

Create `apps/api/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @couple-life/shared build
RUN pnpm --filter @couple-life/api build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="3000"
ENV DATABASE_URL="file:/data/app.db"
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
```

- [ ] **Step 2: Add deployment files**

Create `deploy/env.example`:

```dotenv
API_PORT=3000
DATABASE_URL=file:/data/app.db
```

Create `deploy/docker-compose.yml`:

```yaml
services:
  app-api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    image: couple-life-assistant-api:local
    container_name: couple-life-assistant-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL:-file:/data/app.db}
    ports:
      - "${API_PORT:-3000}:3000"
    volumes:
      - couple-life-data:/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  couple-life-data:
```

Create `deploy/orange-pi.md`:

```markdown
# Orange Pi Deployment

## Requirements

- 64-bit Linux on Orange Pi.
- Docker Engine with Compose plugin.
- Port `3000` reachable from the phone that runs the WeChat Mini Program during development.

## First Start

```bash
cp deploy/env.example deploy/.env
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
```

## Health Check

```bash
curl http://127.0.0.1:3000/health/live
curl http://127.0.0.1:3000/health/ready
```

Expected response:

```json
{"status":"ok","service":"couple-life-api"}
```

and:

```json
{"status":"ok","checks":{"database":"ok"}}
```

## Update

```bash
git pull
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

## Data

The SQLite database is stored in the `couple-life-data` Docker volume at `/data/app.db` inside the container.
```

- [ ] **Step 3: Build Docker image**

Run:

```powershell
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml build
```

Expected: build succeeds for `couple-life-assistant-api:local`.

- [ ] **Step 4: Start and verify Docker service**

Run:

```powershell
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml up -d
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml ps
```

Expected: `app-api` is running and health is `healthy` after the start period.

- [ ] **Step 5: Stop Docker service**

Run:

```powershell
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml down
```

Expected: service stops and the named data volume remains.

- [ ] **Step 6: Commit**

Run:

```powershell
git add apps/api/Dockerfile deploy .gitignore
git commit -m "chore: add docker compose deployment"
```

Expected: commit succeeds.

---

### Task 7: Add CI For Tests, Typecheck, Build, And Docker Build

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.15.4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

  docker:
    runs-on: ubuntu-24.04
    needs: test
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build API image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/api/Dockerfile
          platforms: linux/amd64
          push: false
          tags: couple-life-assistant-api:ci
```

- [ ] **Step 2: Run the same checks locally**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
docker build -f apps/api/Dockerfile -t couple-life-assistant-api:ci .
```

Expected: all commands pass.

- [ ] **Step 3: Commit**

Run:

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: add foundation checks"
```

Expected: commit succeeds.

---

### Task 8: Final Verification

**Files:**
- Read: `docs/superpowers/specs/2026-04-25-couple-life-assistant-design.md`
- Read: `docs/superpowers/plans/2026-04-25-foundation-mvp.md`

- [ ] **Step 1: Run all local verification**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
docker compose --env-file deploy/env.example -f deploy/docker-compose.yml build
```

Expected: every command exits successfully.

- [ ] **Step 2: Confirm Git state**

Run:

```powershell
git status --short
git log --oneline -5
```

Expected: `git status --short` prints no tracked-file changes. The log shows commits for workspace initialization, shared contracts, API health checks, SQLite foundation, setup API, Docker deployment, and CI.

- [ ] **Step 3: Record the foundation result in final response**

Report these items:

```text
Implemented:
- TypeScript pnpm monorepo
- Fastify API with health checks
- SQLite schema and migrations
- Single-couple setup API
- Docker Compose deployment for Orange Pi
- CI workflow

Verified:
- pnpm test
- pnpm typecheck
- pnpm build
- docker compose build
```

---

## Self-Review Notes

Spec coverage for this plan:

- Covered: engineering foundation, TypeScript stack, SQLite, Docker Compose, Orange Pi deployment docs, health checks, CI/CD baseline, single-instance couple bootstrap.
- Not covered by this plan: Mini Program UI, AI Agent, MCP tool execution, vector search behavior, meal recommendation, expense workflows, parcel workflows, water tracking, reminders. Each of those requires its own implementation plan after the foundation is complete.

Type consistency:

- Shared setup input uses `coupleName`, `selfName`, and `partnerName`.
- Setup API returns `coupleId`, `selfUserId`, `partnerUserId`, and `inviteCode`.
- Setup status returns `configured`, `coupleName`, and `memberCount`.
- Health readiness returns `status` and `checks.database`.
