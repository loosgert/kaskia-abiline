// Kaskia abiline chat bubble. Add to any page of kaskia.ee:
// <script src="https://<this-app>.onrender.com/embed.js" defer></script>
(function () {
  if (window.__kaskiaAbiline) return;
  window.__kaskiaAbiline = true;

  var script = document.currentScript;
  var origin = script ? new URL(script.src).origin : "";
  var EMBER = "#A6543A";

  var style = document.createElement("style");
  style.textContent =
    ".kaskia-abiline-btn{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:50%;background:" +
    EMBER +
    ";color:#fff;cursor:pointer;box-shadow:0 6px 20px rgba(35,33,31,.25);display:flex;align-items:center;justify-content:center}" +
    ".kaskia-abiline-btn:focus-visible{outline:3px solid #23211F;outline-offset:3px}" +
    ".kaskia-abiline-panel{position:fixed;right:16px;bottom:84px;z-index:2147483000;width:380px;height:600px;max-height:calc(100vh - 100px);border:1px solid #DDD5CA;border-radius:16px;overflow:hidden;background:#F6F2ED;box-shadow:0 12px 40px rgba(35,33,31,.25);display:none}" +
    ".kaskia-abiline-panel.open{display:block}" +
    ".kaskia-abiline-panel iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:480px){.kaskia-abiline-panel{inset:0;width:auto;height:auto;max-height:none;border-radius:0;border:0}.kaskia-abiline-panel.open+.kaskia-abiline-btn{top:10px;bottom:auto;right:10px;width:44px;height:44px}}";
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "kaskia-abiline-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Kaskia abiline");

  var button = document.createElement("button");
  button.type = "button";
  button.className = "kaskia-abiline-btn";
  button.setAttribute("aria-expanded", "false");

  var chatIcon =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var closeIcon =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function render(open) {
    button.innerHTML = open ? closeIcon : chatIcon;
    button.setAttribute("aria-label", open ? "Sulge" : "Kaskia abiline");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  button.addEventListener("click", function () {
    var open = !panel.classList.contains("open");
    if (open && !panel.firstChild) {
      var frame = document.createElement("iframe");
      frame.src = origin + "/widget";
      frame.title = "Kaskia abiline";
      panel.appendChild(frame);
    }
    panel.classList.toggle("open", open);
    render(open);
  });

  render(false);
  document.body.appendChild(panel);
  document.body.appendChild(button);
})();
