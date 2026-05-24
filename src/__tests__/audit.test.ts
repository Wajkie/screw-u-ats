import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuditStore } from "../audit.js";

const mockQuery = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(function () {
    return { query: mockQuery };
  }),
}));

describe("createAuditStore", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  it("returns a no-op when databaseUrl is undefined", async () => {
    const { log, dashboard } = await createAuditStore("postgres", undefined);
    await log({ tool: "my_tool", inputs: {}, outcome: "success", actor: "bot" });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(await dashboard(10)).toEqual([]);
  });

  it("returns a no-op for non-postgres dbType", async () => {
    const { log, dashboard } = await createAuditStore("neo4j", "bolt://localhost:7687");
    await log({ tool: "my_tool", inputs: {}, outcome: "success", actor: "bot" });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(await dashboard(10)).toEqual([]);
  });

  it("creates the audit_log table on init", async () => {
    await createAuditStore("postgres", "postgresql://test");
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS audit_log"));
  });

  it("inserts a success record", async () => {
    const { log } = await createAuditStore("postgres", "postgresql://test");
    mockQuery.mockClear();
    await log({ tool: "my_tool", inputs: { input: "hello" }, outcome: "success", actor: "alice" });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_log"),
      ["my_tool", expect.any(String), "success", null, "alice"],
    );
  });

  it("inserts an error record with error message", async () => {
    const { log } = await createAuditStore("postgres", "postgresql://test");
    mockQuery.mockClear();
    await log({ tool: "my_tool", inputs: { input: "bad" }, outcome: "error", error: "Not found", actor: "alice" });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_log"),
      ["my_tool", expect.any(String), "error", "Not found", "alice"],
    );
  });

  it("queries audit_log for dashboard entries", async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "1", tool_name: "my_tool", inputs: {}, outcome: "success", error_msg: null, actor: "alice", created_at: "2026-01-01T00:00:00Z" }] });
    const { dashboard } = await createAuditStore("postgres", "postgresql://test");
    const rows = await dashboard(50);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [50]);
    expect(rows).toHaveLength(1);
  });
});
