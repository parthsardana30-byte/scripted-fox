import "server-only";

import { databasePool } from "@/lib/db/pool";

// The compatibility query builder intentionally preserves row shapes inferred at call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = { data: any; error: Error | null; count: number | null };
type Operation = "select" | "insert" | "update" | "upsert" | "delete";

const identifierPattern = /^[a-z_][a-z0-9_]*$/;

function identifier(value: string) {
  if (!identifierPattern.test(value)) throw new Error(`Invalid database identifier: ${value}`);
  return `"${value}"`;
}

function selectedColumns(value: string) {
  if (value === "*") return "*";
  return value.split(",").map((column) => identifier(column.trim())).join(", ");
}

class QueryBuilder implements PromiseLike<Result> {
  private operation: Operation = "select";
  private columns = "*";
  private values: unknown[] = [];
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private filters: string[] = [];
  private ordering: string[] = [];
  private rowLimit?: number;
  private singleRow = false;
  private allowMissing = false;
  private head = false;
  private countRequested = false;
  private conflictColumn?: string;

  constructor(private readonly table: string) {
    identifier(table);
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.columns = columns;
    this.countRequested = options?.count === "exact";
    this.head = options?.head === true;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: Record<string, unknown>, options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = payload;
    this.conflictColumn = options?.onConflict;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) { return this.filter(column, "=", value); }
  gte(column: string, value: unknown) { return this.filter(column, ">=", value); }
  lt(column: string, value: unknown) { return this.filter(column, "<", value); }
  like(column: string, value: unknown) { return this.filter(column, "LIKE", value); }

  private filter(column: string, operator: string, value: unknown) {
    this.values.push(value);
    this.filters.push(`${identifier(column)} ${operator} $${this.values.length}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.ordering.push(`${identifier(column)} ${options?.ascending === false ? "DESC" : "ASC"}`);
    return this;
  }

  limit(value: number) {
    this.rowLimit = Math.max(0, Math.floor(value));
    return this;
  }

  maybeSingle() {
    this.singleRow = true;
    this.allowMissing = true;
    this.rowLimit = 1;
    return this;
  }

  single() {
    this.singleRow = true;
    this.rowLimit = 1;
    return this;
  }

  private whereClause() {
    return this.filters.length ? ` WHERE ${this.filters.join(" AND ")}` : "";
  }

  private returningClause() {
    return this.columns ? ` RETURNING ${selectedColumns(this.columns)}` : "";
  }

  private async execute(): Promise<Result> {
    try {
      const table = identifier(this.table);
      let sql: string;

      if (this.operation === "select") {
        const projection = this.countRequested ? "COUNT(*)::int AS count" : selectedColumns(this.columns);
        sql = `SELECT ${projection} FROM ${table}${this.whereClause()}`;
        if (this.ordering.length) sql += ` ORDER BY ${this.ordering.join(", ")}`;
        if (this.rowLimit !== undefined) sql += ` LIMIT ${this.rowLimit}`;
      } else if (this.operation === "delete") {
        sql = `DELETE FROM ${table}${this.whereClause()}${this.returningClause()}`;
      } else if (this.operation === "update") {
        const payload = this.payload as Record<string, unknown>;
        const assignments = Object.entries(payload).map(([column, value]) => {
          this.values.push(value);
          return `${identifier(column)} = $${this.values.length}`;
        });
        sql = `UPDATE ${table} SET ${assignments.join(", ")}${this.whereClause()}${this.returningClause()}`;
      } else {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Record<string, unknown>];
        const columns = Object.keys(rows[0] ?? {});
        const tuples = rows.map((row) => `(${columns.map((column) => {
          this.values.push(row[column]);
          return `$${this.values.length}`;
        }).join(", ")})`);
        sql = `INSERT INTO ${table} (${columns.map(identifier).join(", ")}) VALUES ${tuples.join(", ")}`;
        if (this.operation === "upsert") {
          if (!this.conflictColumn) throw new Error("Upsert requires a conflict column.");
          const conflict = identifier(this.conflictColumn);
          const updates = columns.filter((column) => column !== this.conflictColumn)
            .map((column) => `${identifier(column)} = EXCLUDED.${identifier(column)}`);
          sql += ` ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(", ")}`;
        }
        sql += this.returningClause();
      }

      const result = await databasePool.query(sql, this.values);
      const count = this.countRequested ? Number(result.rows[0]?.count ?? 0) : result.rowCount;
      if (this.countRequested && this.head) return { data: null, error: null, count };
      if (this.singleRow) {
        if (!result.rows[0] && !this.allowMissing) throw new Error("Expected one database row.");
        return { data: result.rows[0] ?? null, error: null, count };
      }
      return { data: result.rows, error: null, count };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Database query failed"), count: null };
    }
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createDatabaseClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
    async rpc(name: "store_youtube_credentials" | "read_youtube_credentials", args: Record<string, string>) {
      try {
        if (name === "store_youtube_credentials") {
          await databasePool.query(
            `INSERT INTO youtube_credentials (connection_id, ciphertext_base64)
             VALUES ($1, $2)
             ON CONFLICT (connection_id) DO UPDATE SET ciphertext_base64 = EXCLUDED.ciphertext_base64, updated_at = now()`,
            [args.p_connection_id, args.p_ciphertext_base64],
          );
          return { data: null, error: null };
        }
        const result = await databasePool.query(
          "SELECT ciphertext_base64 FROM youtube_credentials WHERE connection_id = $1",
          [args.p_connection_id],
        );
        return { data: result.rows[0]?.ciphertext_base64 ?? null, error: null };
      } catch (error) {
        return { data: null, error: error instanceof Error ? error : new Error("Database operation failed") };
      }
    },
  };
}

export const createClient = createDatabaseClient;
export const createAdminClient = createDatabaseClient;
