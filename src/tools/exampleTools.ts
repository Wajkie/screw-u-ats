import { z } from "zod";
import { echo, add } from "./example.js";
import type { ToolRuntime } from "../toolRuntime.js";

export function registerExampleTools(runtime: ToolRuntime): void {
  runtime.register({
    name: "echo",
    description:
      "Echo a message back with its reversed form and character count. Starter tool — replace with your domain logic.",
    sideEffect: "none",
    example: true,
    inputSchema: { message: z.string().describe("The message to echo") },
    handler: async ({ message }) => echo(message),
  });

  runtime.register({
    name: "add",
    description: "Add two numbers. Example tool showing numeric inputs.",
    sideEffect: "none",
    example: true,
    inputSchema: {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
    handler: async ({ a, b }) => add(a, b),
  });
}
