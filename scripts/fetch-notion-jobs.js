// Fetches the Job Outreach Tracker Notion database and writes it to
// /jobs/data.json — committed by the GitHub Action so the static
// dashboard page picks up fresh data on the next render.
//
// Runs in GitHub Actions (Node 20+). Reads NOTION_TOKEN from env.
//
// Notion data source ID for the tracker:
//   f62dd590-721c-4907-b40d-c11b15878dec
//
// To run locally:
//   NOTION_TOKEN=secret_xxx node scripts/fetch-notion-jobs.js

const fs = require("fs");
const path = require("path");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATA_SOURCE_ID = "f62dd590-721c-4907-b40d-c11b15878dec";
const OUTPUT_PATH = path.join(__dirname, "..", "jobs", "data.json");

if (!NOTION_TOKEN) {
  console.error("Missing NOTION_TOKEN env var");
  process.exit(1);
}

// Notion's API uses the DATABASE id (which is what we have as data_source_id
// for single-source DBs). Endpoint: /v1/databases/{id}/query
const DB_ID = "82d05994b82f4ad69228a1081c9be8c3"; // the database itself

async function queryDatabase() {
  const allRows = [];
  let cursor = undefined;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion API ${res.status}: ${text}`);
    }
    const data = await res.json();
    allRows.push(...data.results);
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return allRows;
}

// Extract a flat schema-friendly object from a Notion page's properties.
function flatten(page) {
  const p = page.properties || {};
  const get = (name, type) => {
    const v = p[name];
    if (!v) return null;
    if (type === "title") return (v.title || []).map(t => t.plain_text).join("");
    if (type === "rich_text") return (v.rich_text || []).map(t => t.plain_text).join("");
    if (type === "select") return v.select?.name || null;
    if (type === "multi_select") return (v.multi_select || []).map(s => s.name);
    if (type === "url") return v.url || null;
    if (type === "date") return v.date?.start || null;
    if (type === "auto_increment_id") return v.unique_id?.number ?? null;
    return null;
  };

  // Parse "Role: ..." prefix from Notes if present, to surface it.
  const notes = get("Notes", "rich_text") || "";
  let role = null;
  const m = notes.match(/^Role:\s*([^·\n]+)/);
  if (m) role = m[1].trim();

  return {
    id: page.id,
    company: get("Company", "title"),
    status: get("Status", "select"),
    priority: get("Priority", "select"),
    role,
    person: get("Person", "rich_text"),
    mode: get("Mode", "multi_select"),
    date_sent: get("Date Sent", "date"),
    brand_page: get("Brand Page", "url"),
    job_posting: get("Job Posting", "url"),
    last_contact: get("Last Contact", "rich_text"),
    notes_preview: notes.slice(0, 280),
    notion_url: page.url || null,
  };
}

// Hide rows from the public dashboard that Tanya hasn't actually
// engaged with — stub "To apply" rows with no person + no brand page +
// no real outreach. The Notion source-of-truth keeps them; the dashboard
// shows the cleaner pipeline view.
function isStub(r) {
  return (
    r.status === "To apply" &&
    !r.person &&
    !r.brand_page &&
    (!r.last_contact || r.last_contact.trim() === "")
  );
}

(async () => {
  try {
    console.log("Fetching Notion DB…");
    const pages = await queryDatabase();
    let rows = pages.map(flatten).filter(r => r.company);

    const beforeStubFilter = rows.length;
    rows = rows.filter(r => !isStub(r));
    if (rows.length < beforeStubFilter) {
      console.log(`Filtered ${beforeStubFilter - rows.length} stub row(s) from dashboard.`);
    }

    const out = {
      generated_at: new Date().toISOString(),
      source: `Notion DB ${DB_ID}`,
      total: rows.length,
      rows,
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
    console.log(`Wrote ${rows.length} rows → ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
})();
