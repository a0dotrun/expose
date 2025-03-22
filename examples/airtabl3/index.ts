import { create } from "@a0dotrun/expose"
import { tool } from "@a0dotrun/expose/tool"
import { z } from "zod"
import { createRecord, fetchRecords, updateRecord } from "./lib/index"

const StageSchema = z.enum(["Prospect", "Qualified", "Closed"])

const createCRMRecord = tool({
  name: "create_sales_crm_record",
  description: "Creates a new record in Sales CRM and generates a unique ID",
  args: z.object({
    email: z.string().email(),
    company: z.string(),
    stage: StageSchema,
    contact: z.string(),
    notes: z.string(),
  }),
  async run(args) {
    const { data, error } = await createRecord({
      Email: args.email,
      Company: args.company,
      Stage: args.stage,
      Contact: args.contact,
      Notes: args.notes,
    })
    if (error) {
      throw new Error(error.message)
    }
    return data
  },
})

const listCRMRecords = tool({
  name: "list_sales_crm_records",
  description: "Lists all sales CRM records",
  async run() {
    const { data, error } = await fetchRecords()
    if (error) {
      throw new Error(error.message)
    }
    return data
  },
})

const updateCRMRecord = tool({
  name: "update_sales_crm_record",
  description: "Updates an existing record in Sales CRM",
  args: z.object({
    id: z.string(),
    email: z.string().email().optional(),
    company: z.string().optional(),
    stage: StageSchema.optional(),
    contact: z.string().optional(),
    notes: z.string().optional(),
  }),
  async run(args) {
    const { id, ...others } = args
    const { data, error } = await updateRecord(id, {
      Email: others.email,
      Company: others.company,
      Stage: others.stage,
      Contact: others.contact,
      Notes: others.notes,
    })
    if (error) {
      throw new Error(error.message)
    }
    return data
  },
})

const app = create({
  tools: [createCRMRecord, listCRMRecords, updateCRMRecord],
})

export default {
  port: 3000,
  fetch: app.fetch,
}
