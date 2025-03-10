import { create } from "expose"
import { tool } from "expose/tool"
import { serverInfo } from "./lib/info"

const systemInfo = tool({
  name: "systemInfo",
  description:
    "Get sytem information about the server like uptime, memory, cpu, etc.",
  run: async () => {
    return serverInfo()
  },
})

const app = create({
  tools: [systemInfo],
})

export default {
  port: 3000,
  fetch: app.fetch,
}
