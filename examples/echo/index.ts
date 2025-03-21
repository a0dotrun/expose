import { create } from "@a0dotrun/expose"
import { tool } from "@a0dotrun/expose/tool"
import { z } from "zod"

const echo = tool({
  name: "echo",
  description: "echoes the message back",
  args: z.object({
    message: z.string(),
  }),
  async run(args) {
    return "Echo from server: " + args.message
  },
})

const app = create({
  tools: [echo],
})

export default {
  port: 3000,
  fetch: app.fetch,
}
