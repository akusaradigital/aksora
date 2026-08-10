import { describe, expect, it } from "vitest";
import {
  isSequentialIdConflict,
  parseInsertStatement,
  toPostgresQuery,
} from "@/lib/db-query-utils";

describe("db-query-utils", () => {
  it("converts sqlite-style DATE and params to postgres syntax", () => {
    const sql = `SELECT * FROM "Task" WHERE DATE('now', '-7 days') <= DATE("updatedAt") AND "company" = ?`;

    expect(toPostgresQuery(sql)).toBe(
      `SELECT * FROM "Task" WHERE CURRENT_DATE - INTERVAL '7 days' <= ("updatedAt")::date AND "company" = $1`,
    );
  });

  it("parses quoted insert statements", () => {
    expect(
      parseInsertStatement(
        'INSERT INTO "Task" ("company", "title", "status") VALUES (?, ?, ?) RETURNING "id"',
      ),
    ).toEqual({
      table: "Task",
      columns: ["company", "title", "status"],
      values: ["?", "?", "?"],
      suffix: ' RETURNING "id"',
    });
  });

  it("leaves inserts that already include an explicit id untouched", () => {
    const input = 'INSERT INTO "Task" ("id", "company", "title") VALUES (?, ?, ?)';
    expect(parseInsertStatement(input)).toBeNull();
  });

  it("skips bulk inserts with multiple VALUES groups", () => {
    const input = 'INSERT INTO "CaseVerdict" ("company", "executionRunId", "testCaseId", "verdict") VALUES (?, ?, ?, ?), (?, ?, ?, ?)';
    expect(parseInsertStatement(input)).toBeNull();
  });

  it("detects sequential id conflicts for sqlite and postgres errors", () => {
    expect(
      isSequentialIdConflict({ message: 'UNIQUE constraint failed: task.id' }, "Task"),
    ).toBe(true);
    expect(
      isSequentialIdConflict({ detail: "Key (id)=(5) already exists." }, "Task"),
    ).toBe(true);
    expect(
      isSequentialIdConflict({ message: "duplicate key on title" }, "Task"),
    ).toBe(false);
  });
});
