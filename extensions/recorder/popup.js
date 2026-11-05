const $ = (id) => document.getElementById(id);

function show(text, tone = "") {
  $("status").textContent = text;
  $("status").className = tone;
}

async function refresh() {
  const s = await chrome.runtime.sendMessage({ kind: "status" });
  $("start").hidden = s.recording;
  $("stop").hidden = !s.recording;
  $("title").disabled = s.recording;
  if (s.recording) show(`Recording "${s.title}": ${s.steps} step(s) so far.`);
}

$("start").addEventListener("click", async () => {
  const r = await chrome.runtime.sendMessage({ kind: "start", title: $("title").value.trim() });
  if (r.error) return show(r.error, "error");
  show("Recording. Use the page as normal, then come back and press Stop.");
  refresh();
});

$("stop").addEventListener("click", async () => {
  show("Sending...");
  const r = await chrome.runtime.sendMessage({ kind: "stop" });
  refresh();
  if (r.error) return show(r.error, "error");
  show(`Sent ${r.steps} step(s). Open Recordings in Aksora to turn it into a test case.`, "ok");
});

$("save").addEventListener("click", async () => {
  const aksoraUrl = $("url").value.trim();
  const apiKey = $("key").value.trim();
  if (!/^https?:\/\//.test(aksoraUrl)) return show("Enter the full Aksora URL, starting with https://", "error");
  await chrome.storage.sync.set({ aksoraUrl, apiKey });
  show("Settings saved.", "ok");
});

chrome.storage.sync.get(["aksoraUrl", "apiKey"]).then(({ aksoraUrl, apiKey }) => {
  $("url").value = aksoraUrl || "";
  $("key").value = apiKey || "";
  if (!aksoraUrl || !apiKey) $("settings").open = true;
});
refresh();
