const dns = require("dns").promises;

async function getMXRecords(domain) {
  try {
    const records = await dns.resolveMx(domain);

    records.sort((a, b) => a.priority - b.priority);

    return records.map((r) => r.exchange);
  } catch (error) {
    throw new Error("MX_LOOKUP_FAILED");
  }
}

module.exports = { getMXRecords };
