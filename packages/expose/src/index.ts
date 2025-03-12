import { Hono } from "hono"
// import { HTTPException } from "hono/http-exception"
import { Tool } from "./tool.js"
import { createMcp } from "./mcp.js"

export interface ExposeOptions {
  token?: string
}

export function create(input: { tools: Tool[]; key?: string }) {
  const mcp = createMcp({ tools: input.tools })

  return (
    new Hono()
      // .use((c, next) => {
      //   if (input?.key) {
      //     const authorization = c.req.header("Authorization")
      //     if (authorization !== `Bearer ${input?.key}`) {
      //       throw new HTTPException(401)
      //     }
      //   }
      //   return next()
      // })
      .post("/", async (c) => {
        const body = await c.req.json()
        console.log("mcp request", body)
        const result = await mcp.process(body)
        console.log("mcp response", result)
        return c.json(result)
      })
  )
}
