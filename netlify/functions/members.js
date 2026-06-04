const https = require("https");

const BASE_ID = "appts3pknGCDwe6bk";
const TABLE_ID = "tblvbEMVk7zr24B2c";
const VIEW_ID  = "viwu7lk33kGWPFYYs";

function fetchPage(token, offset) {
  return new Promise((resolve, reject) => {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?view=${VIEW_ID}&pageSize=100`;
    if (offset) url += `&offset=${encodeURIComponent(offset)}`;
    https.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 300))); }
      });
    }).on("error", reject);
  });
}

exports.handler = async function(event, context) {
  const token = process.env.AIRTABLE_PAT;

  if (!token) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "AIRTABLE_PAT env var not found" })
    };
  }

  try {
    const allRecords = [];
    let offset = null;
    do {
      const result = await fetchPage(token, offset);
      if (result.status !== 200) {
        return {
          statusCode: result.status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Airtable error", detail: result.body })
        };
      }
      allRecords.push(...(result.body.records || []));
      offset = result.body.offset || null;
    } while (offset);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=300"
      },
      body: JSON.stringify({ records: allRecords, count: allRecords.length })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
