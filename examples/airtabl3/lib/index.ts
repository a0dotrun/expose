import Airtable from "airtable"

const base = new Airtable({
  apiKey: `...`,
}).base("...")

interface NewRecord {
  Email: string
  Company: string
  Stage: string
  Contact: string
  Notes: string
}

interface UpdateRecord {
  Email?: string
  Company?: string
  Stage?: string
  Contact?: string
  Notes?: string
}

export async function fetchRecords() {
  try {
    const records = await base("Default").select({ view: "Grid view" }).all()
    const results = records.map((record) => ({
      id: record.id,
      company: record.fields.Company,
      stage: record.fields.Stage,
      contact: record.fields.Contact,
      notes: record.fields.Notes,
      email: record.fields.Email,
    }))
    return {
      data: results,
      error: null,
    }
  } catch (err) {
    console.error(err)
    return {
      data: null,
      error: err,
    }
  }
}

export async function createRecord(args: NewRecord) {
  try {
    const record = await base("Default").create({
      Email: args.Email,
      Company: args.Company,
      Stage: args.Stage,
      Contact: args.Contact,
      Notes: args.Notes,
    })
    return {
      data: record.id,
      error: null,
    }
  } catch (err) {
    console.error(err)
    return {
      data: null,
      error: err,
    }
  }
}

export async function updateRecord(id: string, args: UpdateRecord) {
  try {
    const record = await base("Default").update(id, {
      Email: args.Email || undefined,
      Company: args.Company || undefined,
      Stage: args.Stage || undefined,
      Contact: args.Contact || undefined,
      Notes: args.Notes || undefined,
    })
    return {
      data: record.id,
      error: null,
    }
  } catch (err) {
    console.error(err)
    return {
      data: null,
      error: err,
    }
  }
}

// createRecord({
//   Email: "aravind@perplexity.com",
//   Company: "Aravind Srinivasan",
//   Stage: "Prospect",
//   Contact: "Aravind Srinivasan",
//   Notes: "AI search engine",
// })

// ;(async () => {
//   const results = await fetchRecords()
//   console.log(results)
// })()

// updateRecord("rec9FCaEJEcis2fub", { Contact: "Amit Singh" })
