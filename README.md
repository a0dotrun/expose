---

Expose lets you build MCP tools that you can invoke with MCP client like Claude desktop app.

- **Self-hosted**: You can easily self-host tools and deploy them on your own server.
- **Unified gateway**: Generates a single HTTP endpoint that you can register with `expose-cli`
- **Flexible**: Easily configure and customize your tools to fit your needs.

## Getting started

1. **Setup expose CLI**

   ```bash
   curl -fsSL https://github.com/a0dotrun/expose/releases/download/stable/download_cli.sh | bash
   ```

2. **Install dependencies**

   ```bash
   npm i @a0dotrun/expose
   ```

3. **Create server**

   ```bash
   touch src/server.ts
   ```

   ```ts title=src/server.ts
   import { create } from "@a0dotrun/expose"

   const app = create({
     tools: [],
   })

   export default {
     port: 3000,
     fetch: app.fetch,
   }
   ```

4. **Define your tools**

```diff lang=ts title=src/server.ts
+ import { tool } from "@a0dotrun/expose/tool"
+ import { subscription } from "@acme/lib/subscription"
+ import { z } from "zod"

+ const getCustomerSubscription = tool({
+   name: "getCustomerSubscription",
+   description: "Get subscription information for a customer",
+   args: z.object({
+       customer: z.string().uuid()
+   }),
+   run: async (input) => {
+     // Your subscription logic here
+     return input;
+   },
+ });


+ const createCustomerSubscription = tool({
+   name: "createCustomerSubscription",
+   description: "Create a subscription for a customer",
+   args: z.object({
+       customer: z.string().uuid()
+   }),
+   run: async (input) => {
+     // Your subscription logic here
+     return input;
+   },
+ });

const app = create({
  tools: [
+    getCustomerSubscription,
+    createCustomerSubscription,
  ],
});
```

5. **Start server**

   ```bash
   npm run dev
   ```
You can also deploy the server and note down the public URL.

6. **Register in Claude desktop app**
MACOS Claude desktop MCP config path: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  ...
  "mcpServers": {
    "subscriptionManager": {
      "command": "/Users/acmeuser/.local/bin/expose-cli",
      "args": ["--url", "http://localhost:3000", "--timeout", "15"]
    }
  }
  ...
}
```
_replace localhost with your public URL_

---

expose is created by [@\_sanchitrk](https://x.com/_sanchitrk) at [a0](https://a0.run)

### Acknowledgements

I was inspired by [opencontrol](https://github.com/toolbeam/opencontrol)
