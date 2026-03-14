export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  const token = process.env.GH_PAT;
  const apiUrl = "https://api.github.com/repos/seehaojun/parl-tracker/contents/data.json";

  try {
    const ghRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!ghRes.ok) return res.status(ghRes.status).json({});
    const meta = await ghRes.json();
    const data = JSON.parse(Buffer.from(meta.content, "base64").toString("utf8"));
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({});
  }
}
