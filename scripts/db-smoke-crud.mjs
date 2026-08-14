const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const email = process.env.SMOKE_EMAIL || "superadmin@akusaradigital.com";
const password = process.env.SMOKE_PASSWORD || "admin123";

function parseSetCookie(headers) {
  const setCookie = headers.getSetCookie ? headers.getSetCookie() : headers.get("set-cookie");
  if (!setCookie) return "";
  if (Array.isArray(setCookie)) return setCookie.map((item) => item.split(";")[0]).join("; ");
  return String(setCookie).split(",").map((item) => item.split(";")[0]).join("; ");
}

const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!loginRes.ok) {
  throw new Error(`Login failed: ${loginRes.status}`);
}
const cookie = parseSetCookie(loginRes.headers);
if (!cookie) throw new Error("No session cookie from login");

const unique = Date.now();
const createPayload = {
  title: `Smoke Task ${unique}`,
  project: "Smoke",
  relatedFeature: "Smoke",
  category: "General",
  status: "todo",
  priority: "low",
  description: "Smoke",
};

const createRes = await fetch(`${baseUrl}/api/items/tasks`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify(createPayload),
});
if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
const created = await createRes.json();
const createdId = created?.data?.id;
if (!createdId) throw new Error("Create response missing id");

const updateRes = await fetch(`${baseUrl}/api/items/tasks`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({ id: createdId, ...createPayload, status: "done" }),
});
if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}`);

const deleteRes = await fetch(`${baseUrl}/api/items/tasks?id=${createdId}`, {
  method: "DELETE",
  headers: { Cookie: cookie },
});
if (!deleteRes.ok) throw new Error(`Delete failed: ${deleteRes.status}`);

console.log(JSON.stringify({ ok: true, module: "tasks", id: createdId }, null, 2));
