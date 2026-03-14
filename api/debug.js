export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const token = process.env.GH_PAT;

  if (!token) return res.status(200).json({ error: "GH_PAT env var is not set" });

  // Check token works at all
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const user = await userRes.json();

  // Check repo access
  const repoRes = await fetch("https://api.github.com/repos/seehaojun/parl-tracker", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const repo = await repoRes.json();

  // Check file read
  const fileRes = await fetch("https://api.github.com/repos/seehaojun/parl-tracker/contents/data.json", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const file = await fileRes.json();

  return res.status(200).json({
    token_prefix: token.slice(0, 15) + "...",
    user: userRes.ok ? user.login : `FAIL: ${user.message}`,
    repo: repoRes.ok ? repo.full_name : `FAIL: ${repo.message}`,
    file_read: fileRes.ok ? "OK" : `FAIL: ${file.message}`,
  });
}
