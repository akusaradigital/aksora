// Holds the recording state (service workers can be stopped, so state lives in chrome.storage.session).

async function getState() {
  const { recording } = await chrome.storage.session.get("recording");
  return recording || null;
}
async function setState(recording) {
  await chrome.storage.session.set({ recording });
}

async function addEvent(event, tabId) {
  const rec = await getState();
  if (!rec || rec.tabId !== tabId) return;
  const last = rec.events[rec.events.length - 1];
  // Drop exact repeats (double clicks, duplicate change events).
  if (last && last.type === event.type && last.target === event.target && last.value === event.value) return;
  rec.events.push(event);
  await setState(rec);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.kind === "aksora-event" && sender.tab) {
      await addEvent(msg.event, sender.tab.id);
      return sendResponse({ ok: true });
    }
    if (msg.kind === "start") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !/^https?:/.test(tab.url || "")) return sendResponse({ error: "Open a web page first." });
      await setState({ tabId: tab.id, title: msg.title || tab.title || "Recording", startUrl: tab.url, events: [], startedAt: Date.now() });
      return sendResponse({ ok: true });
    }
    if (msg.kind === "status") {
      const rec = await getState();
      return sendResponse({ recording: Boolean(rec), steps: rec?.events.length || 0, title: rec?.title || "" });
    }
    if (msg.kind === "stop") {
      const rec = await getState();
      if (!rec) return sendResponse({ error: "Not recording." });
      await setState(null);
      if (!rec.events.length) return sendResponse({ error: "Nothing was recorded." });
      const { aksoraUrl, apiKey } = await chrome.storage.sync.get(["aksoraUrl", "apiKey"]);
      if (!aksoraUrl || !apiKey) return sendResponse({ error: "Set the Aksora URL and API key in Settings." });
      try {
        const res = await fetch(`${aksoraUrl.replace(/\/$/, "")}/api/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ title: rec.title, startUrl: rec.startUrl, events: rec.events }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return sendResponse({ error: json.error || `Upload failed (${res.status})` });
        return sendResponse({ ok: true, id: json.data?.id, steps: rec.events.length, link: `${aksoraUrl.replace(/\/$/, "")}/recordings` });
      } catch (e) {
        return sendResponse({ error: `Could not reach Aksora: ${e.message}` });
      }
    }
    sendResponse({ error: "Unknown message" });
  })();
  return true; // async sendResponse
});

// Top-frame page loads in the recorded tab become navigation steps.
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!["typed", "link", "form_submit", "reload", "auto_bookmark"].includes(details.transitionType) && !details.transitionQualifiers?.includes("from_address_bar")) return;
  await addEvent({ type: "navigation", target: "", url: details.url, ts: Date.now() }, details.tabId);
});
