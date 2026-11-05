// Captures user actions on the page and forwards them to the background worker while recording.
(() => {
  if (window.__aksoraRecorder) return;
  window.__aksoraRecorder = true;

  const clean = (s, max = 80) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
  const SENSITIVE = /pass|otp|token|secret|pin|cvv|card/i;

  function labelFor(el) {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return clean(l.innerText);
    }
    const wrap = el.closest("label");
    if (wrap) return clean(wrap.innerText);
    const by = el.getAttribute("aria-labelledby");
    if (by) return clean(by.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" "));
    return "";
  }

  function roleOf(el) {
    const explicit = el.getAttribute("role");
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button" || (tag === "input" && ["submit", "button", "reset"].includes(el.type))) return "button";
    if (tag === "select") return "dropdown";
    if (tag === "textarea") return "text area";
    if (tag === "input") return el.type === "checkbox" ? "checkbox" : el.type === "radio" ? "radio button" : "field";
    return "";
  }

  /** Human-readable description in the order a person would name the element. */
  function describe(el) {
    if (!el || el.nodeType !== 1) return "";
    const target = el.closest("button, a, [role], input, select, textarea, label, summary") || el;
    const role = roleOf(target);
    const name =
      clean(target.getAttribute("aria-label")) ||
      labelFor(target) ||
      clean(target.getAttribute("placeholder")) ||
      clean(target.innerText || target.value) ||
      clean(target.getAttribute("title")) ||
      clean(target.getAttribute("alt")) ||
      clean(target.getAttribute("name"));
    if (name && role) return `"${name}" ${role}`;
    if (name) return `"${name}"`;
    return role || target.tagName.toLowerCase();
  }

  function isSensitive(el) {
    return el.type === "password" || SENSITIVE.test(`${el.name || ""} ${el.id || ""} ${el.autocomplete || ""}`);
  }

  function send(event) {
    chrome.runtime.sendMessage({ kind: "aksora-event", event: { ...event, url: location.href, ts: Date.now() } }).catch?.(() => {});
  }

  document.addEventListener("click", (e) => {
    const el = e.target;
    if (el.closest && el.closest("input[type=text], input:not([type]), textarea")) return; // focusing a field is not a step
    send({ type: "click", target: describe(el) });
  }, true);

  // One "input" event per field edit: record when the field loses focus, not per keystroke.
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    if (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)) {
      send({ type: "change", target: describe(el), value: el.checked ? "checked" : "unchecked" });
      return;
    }
    const value = el instanceof HTMLSelectElement ? clean(el.options[el.selectedIndex]?.text, 200) : String(el.value || "");
    send({ type: el instanceof HTMLSelectElement ? "change" : "input", target: describe(el), value: isSensitive(el) ? "{{password}}" : value.slice(0, 500) });
  }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Escape" || e.key === "Tab") send({ type: "keydown", target: describe(e.target), value: e.key });
  }, true);

  document.addEventListener("submit", (e) => send({ type: "submit", target: describe(e.target) }), true);
})();
