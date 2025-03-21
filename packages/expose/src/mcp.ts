import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  InitializeRequestSchema,
  InitializeResult,
  JSONRPCError,
  JSONRPCRequest,
  JSONRPCResponse,
  ListToolsRequestSchema,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import { Tool } from "./tool.js"

class MCPError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
  ) {
    super(message)
  }
}

const RequestSchema = z.union([
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
])

type RequestSchema = z.infer<typeof RequestSchema>

export function createMcp(input: { tools: Tool[] }) {
  return {
    async process(message: JSONRPCRequest) {
      try {
        const parsed = RequestSchema.parse(message)
        return await (async (): Promise<JSONRPCResponse> => {
          if (parsed.method === "initialize")
            return {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {},
                },
                serverInfo: {
                  name: "expose",
                  version: "0.0.1",
                },
              } as InitializeResult,
            }

          if (parsed.method === "tools/list") {
            return {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                tools: input.tools.map((tool) => ({
                  name: tool.name,
                  inputSchema: tool.args
                    ? (zodToJsonSchema(tool.args as any, "args").definitions![
                        "args"
                      ] as any)
                    : { type: "object" },
                  description: tool.description,
                })),
              } as ListToolsResult,
            } satisfies JSONRPCResponse
          }

          if (parsed.method === "tools/call") {
            const tool = input.tools.find(
              (tool) => tool.name === parsed.params.name,
            )
            if (!tool)
              throw new MCPError("Tool not found", ErrorCode.MethodNotFound)

            let args = parsed.params.arguments
            if (tool.args) {
              const validated = await tool.args["~standard"].validate(args)
              if (validated.issues)
                throw new MCPError("Invalid arguments", ErrorCode.InvalidParams)
              args = validated.value as any
            }

            return tool
              .run(args)
              .catch(
                (error) =>
                  ({
                    jsonrpc: "2.0",
                    id: message.id,
                    error: {
                      code: ErrorCode.InternalError,
                      message: error.message,
                    },
                  }) satisfies JSONRPCError,
              )
              .then(
                (result) =>
                  ({
                    jsonrpc: "2.0",
                    id: message.id,
                    result: {
                      content: [
                        {
                          type: "text",
                          text: JSON.stringify(result, null, 2),
                        },
                      ],
                    } as CallToolResult,
                  }) satisfies JSONRPCResponse,
              )
          }
          throw new MCPError("Method not found", ErrorCode.MethodNotFound)
        })()
      } catch (error) {
        if (error instanceof MCPError) {
          const code = error.code
          return {
            jsonrpc: "2.0",
            id: message.id,
            error: { code, message: error.message },
          } satisfies JSONRPCError
        }
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: ErrorCode.InternalError,
            message: "Internal error",
          },
        } satisfies JSONRPCError
      }
    },
  }
}
