import { describe, it, expect } from "vitest";
import { echo, add } from "../example.js";

describe("echo", () => {
  it("returns the original message", () => {
    expect(echo("hello").message).toBe("hello");
  });

  it("reverses the message", () => {
    expect(echo("hello").reversed).toBe("olleh");
  });

  it("returns the character count", () => {
    expect(echo("hello").length).toBe(5);
  });
});

describe("add", () => {
  it("sums two numbers", () => {
    expect(add(2, 3).sum).toBe(5);
  });

  it("echoes both operands", () => {
    const result = add(4, 5);
    expect(result.a).toBe(4);
    expect(result.b).toBe(5);
  });

  it("handles negative numbers", () => {
    expect(add(-1, 1).sum).toBe(0);
  });
});
