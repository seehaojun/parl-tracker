export default async function handler(req, res) {
  const allowed = ["https://seehaojun.github.io", "https://parl-tracker.vercel.app"];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: "Missing key or value" });

  const token = process.env.GH_PAT;
  const owner = "seehaojun";
  const repo = "parl-tracker";
  const file = "data.json";
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  try {
    const metaRes = await fetch(apiUrl, { headers });
    let sha, currentData = {};
    if (metaRes.ok) {
      const meta = await metaRes.json();
      sha = meta.sha;
      currentData = JSON.parse(Buffer.from(meta.content, "base64").toString("utf8"));
    }

    const newData = { ...currentData, [key]: value };
    const encoded = Buffer.from(JSON.stringify(newData, null, 2)).toString("base64");

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `data: update ${key}`,
        content: encoded,
        ...(sha ? { sha } : {}),
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(putRes.status).json({ error: err.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
