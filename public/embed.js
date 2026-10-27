// Kaskia abiline: an animated birch whisk in the bottom-right corner that opens the chat.
// Add to every page of kaskia.ee:
// <script src="https://<this-app>.onrender.com/embed.js" defer></script>
// The whisk hides itself on /haldus and /loobu. Everything lives in a shadow root, so the page's CSS and ours never mix.
(function () {
  if (window.__kaskiaAbiline) return;
  window.__kaskiaAbiline = true;

  var script = document.currentScript;
  var origin = script ? new URL(script.src).origin : "";
  var TEASER_KEY = "kaskia-abiline:teaser-closed";
  var TEASER_TEXT = "Kas saan aidata?";
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Wake the free Render instance while the visitor reads the page, so the chat opens without a long wait.
  try {
    fetch(origin + "/api/ping", { mode: "no-cors", cache: "no-store" }).catch(function () {});
  } catch (e) {}

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  }

  var host = document.createElement("div");
  host.setAttribute("data-kaskia-abiline", "");
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;font-family:inherit;color:#23211F}",
    ".wrap{position:fixed;right:14px;bottom:8px;z-index:2147483000;display:flex;align-items:flex-end;transition:bottom .2s ease-out}",
    ".wrap.hidden{display:none}",
    ".bubble{margin:0 18px 112px 0;background:#fff;border:1px solid #DDD5CA;border-radius:16px 16px 4px 16px;padding:9px 8px 9px 14px;font-family:inherit;font-size:15px;line-height:1.3;white-space:nowrap;display:flex;align-items:center;gap:6px;box-shadow:0 6px 18px rgba(35,33,31,.10);opacity:0;transform-origin:100% 100%;animation:pop .5s cubic-bezier(.2,.9,.3,1.35) 1.4s forwards;cursor:pointer}",
    ".bubble[hidden]{display:none}",
    ".bubble .x{border:0;background:none;color:#6B655B;font-family:inherit;font-size:18px;line-height:1;width:28px;height:28px;border-radius:50%;cursor:pointer}",
    ".bubble .x:hover{background:#ECE6DE}",
    ".whisk{border:0;padding:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:16px}",
    ".whisk:focus-visible,.bubble .x:focus-visible,.close:focus-visible{outline:3px solid #A6543A;outline-offset:3px}",
    ".whisk svg{display:block;width:124px;height:170px;overflow:visible;filter:drop-shadow(0 6px 8px rgba(35,33,31,.22))}",
    ".sway{transform-box:view-box;transform-origin:80px 175px;transform:rotate(-9deg);animation:hello 1.1s ease-in-out 1.3s 1,sway 5.5s ease-in-out 2.4s infinite}",
    ".leaf{transform-box:fill-box;transform-origin:50% 100%;animation:flutter var(--d) ease-in-out var(--delay) infinite alternate}",
    ".whisk:hover .sway{animation:wave 1.2s ease-in-out infinite}",
    ".whisk:hover .leaf{animation-duration:calc(var(--d) * .35)}",
    "@keyframes sway{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(-6deg)}}",
    "@keyframes hello{0%{transform:rotate(-9deg)}20%{transform:rotate(-22deg)}45%{transform:rotate(2deg)}70%{transform:rotate(-15deg)}100%{transform:rotate(-13deg)}}",
    "@keyframes wave{0%,100%{transform:rotate(-18deg)}50%{transform:rotate(-2deg)}}",
    "@keyframes flutter{from{transform:rotate(calc(var(--amp) * -1))}to{transform:rotate(var(--amp))}}",
    "@keyframes pop{from{opacity:0;transform:scale(.6) translateY(10px)}to{opacity:1;transform:none}}",
    ".panel{position:fixed;right:16px;bottom:16px;z-index:2147483001;width:380px;height:600px;max-height:calc(100vh - 32px);border:1px solid #DDD5CA;border-radius:16px;overflow:hidden;background:#F6F2ED;box-shadow:0 12px 40px rgba(35,33,31,.25);display:none}",
    ".panel.open{display:block}",
    ".panel iframe{width:100%;height:100%;border:0;display:block}",
    ".close{position:absolute;top:8px;right:8px;width:40px;height:40px;border:0;border-radius:50%;background:transparent;color:#23211F;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".close:hover{background:#ECE6DE}",
    "@media (max-width:520px){.whisk svg{width:88px;height:121px}.bubble{margin-bottom:78px;font-size:14px}.panel{inset:0;width:auto;height:auto;max-height:none;border:0;border-radius:0}}",
    "@media (prefers-reduced-motion:reduce){.sway,.leaf,.whisk:hover .sway,.whisk:hover .leaf{animation:none}.bubble{animation:none;opacity:1}}",
  ].join("\n");
  root.appendChild(style);

  var wrap = document.createElement("div");
  wrap.className = "wrap";

  var bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.setAttribute("role", "button");
  bubble.setAttribute("tabindex", "0");
  bubble.appendChild(document.createTextNode(TEASER_TEXT));
  var bubbleClose = document.createElement("button");
  bubbleClose.type = "button";
  bubbleClose.className = "x";
  bubbleClose.setAttribute("aria-label", "Sulge");
  bubbleClose.textContent = "×";
  bubble.appendChild(bubbleClose);
  if (storageGet(TEASER_KEY) === "1") bubble.hidden = true;

  var whisk = document.createElement("button");
  whisk.type = "button";
  whisk.className = "whisk";
  whisk.setAttribute("aria-label", "Kaskia abiline");
  whisk.setAttribute("aria-expanded", "false");
  whisk.appendChild(drawWhisk());

  wrap.appendChild(bubble);
  wrap.appendChild(whisk);

  var panel = document.createElement("div");
  panel.className = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Kaskia abiline");
  var closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "close";
  closeButton.setAttribute("aria-label", "Sulge");
  closeButton.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  root.appendChild(wrap);
  root.appendChild(panel);

  function closeTeaser() {
    bubble.hidden = true;
    storageSet(TEASER_KEY, "1");
  }

  function openChat() {
    if (!panel.querySelector("iframe")) {
      var frame = document.createElement("iframe");
      frame.src = origin + "/widget";
      frame.title = "Kaskia abiline";
      panel.appendChild(frame);
      panel.appendChild(closeButton);
    }
    closeTeaser();
    panel.classList.add("open");
    wrap.classList.add("hidden");
    whisk.setAttribute("aria-expanded", "true");
    closeButton.focus();
  }

  function closeChat() {
    panel.classList.remove("open");
    wrap.classList.remove("hidden");
    whisk.setAttribute("aria-expanded", "false");
    whisk.focus();
  }

  whisk.addEventListener("click", openChat);
  bubble.addEventListener("click", openChat);
  bubble.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openChat(); }
  });
  bubbleClose.addEventListener("click", function (e) { e.stopPropagation(); closeTeaser(); });
  closeButton.addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) closeChat();
  });

  // The page can mark its own overlays: [data-abiline-avoid] (a bar fixed to the bottom, the whisk moves above it)
  // and [data-abiline-hide] (a full-screen menu, the whisk hides while it is open). Hidden on /haldus and /loobu.
  // The site is a single-page app, so this is re-checked a few times a second.
  function shown(el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    var cs = window.getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0.05;
  }
  function layout() {
    var hide = /^\/(haldus|loobu)(\/|$)/.test(window.location.pathname);
    var lift = 0;
    var hiders = document.querySelectorAll("[data-abiline-hide]");
    for (var i = 0; i < hiders.length; i++) if (shown(hiders[i])) hide = true;
    var avoid = document.querySelectorAll("[data-abiline-avoid]");
    for (var j = 0; j < avoid.length; j++) {
      var r = avoid[j].getBoundingClientRect();
      if (shown(avoid[j]) && r.bottom >= window.innerHeight - 4) lift = Math.max(lift, Math.round(window.innerHeight - r.top));
    }
    host.style.display = hide ? "none" : "";
    wrap.style.bottom = 8 + lift + "px";
  }
  layout();
  setInterval(layout, 400);
  window.addEventListener("resize", layout);

  function mount() { document.body.appendChild(host); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  // ---- The whisk: an SVG drawn in code, so it is ours and stays a few kilobytes. ----
  function drawWhisk() {
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }

    var svg = el("svg", { viewBox: "0 0 160 220", "aria-hidden": "true", focusable: "false" });
    var defs = el("defs", {}, svg);
    var twine = el("pattern", { id: "ka-twine", width: "4", height: "4", patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" }, defs);
    el("rect", { width: "4", height: "4", fill: "#D9C49B" }, twine);
    el("rect", { width: "1.6", height: "4", fill: "#B89C6B" }, twine);
    var core = el("radialGradient", { id: "ka-core", cx: ".45", cy: ".4", r: ".6" }, defs);
    el("stop", { offset: "0", "stop-color": "#2F5523" }, core);
    el("stop", { offset: "1", "stop-color": "#1B3313" }, core);
    var bark = el("linearGradient", { id: "ka-bark", x1: "0", y1: "0", x2: "1", y2: "0" }, defs);
    el("stop", { offset: "0", "stop-color": "#3A2216" }, bark);
    el("stop", { offset: ".45", "stop-color": "#6A432C" }, bark);
    el("stop", { offset: "1", "stop-color": "#2E1B11" }, bark);

    // Leaf colours [base, tip], dark to light. Back leaves are darker for depth; light comes from the top left.
    var backColours = [["#1C3414", "#335A23"], ["#22401A", "#3E6A2A"], ["#2A4C1E", "#4A7A30"]];
    var frontColours = [["#2F5A22", "#5E8E36"], ["#35622A", "#6A9A3C"], ["#3F7029", "#7EAB49"], ["#467A2D", "#8CB955"], ["#528536", "#A4CA69"]];
    function gradient(id, c) {
      var g = el("linearGradient", { id: id, x1: "0", y1: "1", x2: "0.3", y2: "0" }, defs);
      el("stop", { offset: "0", "stop-color": c[0] }, g);
      el("stop", { offset: "1", "stop-color": c[1] }, g);
    }
    backColours.forEach(function (c, i) { gradient("ka-lb" + i, c); });
    frontColours.forEach(function (c, i) { gradient("ka-lf" + i, c); });

    var sway = el("g", { class: reduceMotion ? "" : "sway" }, svg);
    if (reduceMotion) sway.setAttribute("transform", "rotate(-9 80 175)");
    var twigs = el("g", {}, sway);
    el("ellipse", { cx: "80", cy: "74", rx: "47", ry: "58", fill: "url(#ka-core)" }, sway);
    var back = el("g", {}, sway);
    var middle = el("g", {}, sway);
    var front = el("g", {}, sway);
    var handle = el("g", {}, sway);

    // Birch leaf: rhombic-ovate with a long pointed tip and a double-toothed edge.
    function halfWidth(t) { return t < 0.32 ? Math.sin((t / 0.32) * Math.PI / 2) : Math.pow((1 - t) / 0.68, 1.25); }
    function leafPath(L, W, skew) {
      var n = 16, right = [], left = [];
      for (var i = 1; i < n; i++) {
        var t = i / n, w = W * halfWidth(t), tooth = (i % 2 ? 0.55 : 0.2) * (t > 0.12 && t < 0.9 ? 1 : 0);
        right.push([(w + tooth) * (1 + skew), -t * L]);
        left.push([-(w + tooth) * (1 - skew), -t * L]);
      }
      var d = "M0 0";
      right.forEach(function (p) { d += " L" + p[0].toFixed(2) + " " + p[1].toFixed(2); });
      d += " L0 " + (-L).toFixed(2);
      left.reverse().forEach(function (p) { d += " L" + p[0].toFixed(2) + " " + p[1].toFixed(2); });
      return d + " Z";
    }

    // animateShare: only some leaves rustle, which looks the same and costs far less on phones.
    function addLeaf(parent, x, y, angle, scale, fill, veinColour, animateShare) {
      var outer = el("g", { transform: "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + angle.toFixed(1) + ") scale(" + scale.toFixed(2) + ")" }, parent);
      var leaf = el("g", {}, outer);
      if (!reduceMotion && rnd() < animateShare) {
        leaf.setAttribute("class", "leaf");
        leaf.style.setProperty("--d", (2.2 + rnd() * 2.2).toFixed(2) + "s");
        leaf.style.setProperty("--delay", (-rnd() * 4).toFixed(2) + "s");
        leaf.style.setProperty("--amp", (2 + rnd() * 5).toFixed(1) + "deg");
      }
      var L = 15 + rnd() * 4, W = 7.4 + rnd() * 1.8;
      el("path", { d: "M0 2.6 L0 0", stroke: "#4B3A22", "stroke-width": "0.7", "stroke-linecap": "round" }, leaf);
      el("path", { d: leafPath(L, W, (rnd() - 0.5) * 0.12), fill: fill, stroke: "rgba(20,40,12,.35)", "stroke-width": "0.35", "stroke-linejoin": "round" }, leaf);
      el("path", { d: "M0 -0.4 L0 " + (-L * 0.9).toFixed(1), stroke: veinColour, "stroke-width": "0.5", "stroke-linecap": "round" }, leaf);
      for (var k = 1; k <= 5; k++) {
        var t = 0.1 + k * 0.13, w = W * halfWidth(Math.min(t + 0.1, 0.95)) * 0.8;
        el("path", { d: "M0 " + (-t * L).toFixed(1) + " L" + w.toFixed(1) + " " + (-(t + 0.12) * L).toFixed(1) + " M0 " + (-t * L).toFixed(1) + " L" + (-w).toFixed(1) + " " + (-(t + 0.12) * L).toFixed(1), stroke: veinColour, "stroke-width": "0.3", opacity: "0.8" }, leaf);
      }
    }

    // Leaf mass: a broad teardrop above the grip, narrowing towards the handle.
    var cx = 80, cy = 70, grip = { x: 80, y: 150 };
    function inside(x, y) {
      if (y < 2 || y > 138) return false;
      var half = 58 * Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / 70, 2)));
      if (y > 92) half *= 1 - (y - 92) / 56;
      return Math.abs(x - cx) < half;
    }
    function shade(x, y, colours) {
      var light = ((cx - x) / 60 + (cy - y) / 70) * 0.5 + 0.5;
      return Math.max(0, Math.min(colours.length - 1, Math.round(light * (colours.length - 1) + (rnd() - 0.5) * 2)));
    }
    function scatter(count, parent, colours, prefix, scaleBase, vein, animateShare) {
      var placed = 0, guard = 0;
      while (placed < count && guard++ < 5000) {
        var x = cx + (rnd() - 0.5) * 130, y = 2 + rnd() * 138;
        if (!inside(x, y)) continue;
        var angle = Math.atan2(y - (cy + 18), x - cx) * 180 / Math.PI + 90 + (rnd() - 0.5) * 120;
        addLeaf(parent, x, y, angle, scaleBase + rnd() * 0.45, "url(#" + prefix + shade(x, y, colours) + ")", vein, animateShare);
        placed++;
      }
    }

    for (var i = 0; i < 16; i++) {
      var a = -0.85 + i * 0.113 + (rnd() - 0.5) * 0.08, len = 45 + rnd() * 50;
      var ex = grip.x + Math.sin(a) * len, ey = grip.y - Math.cos(a) * len * 1.08;
      var mx = grip.x + Math.sin(a) * len * 0.45 + (rnd() - 0.5) * 8, my = grip.y - Math.cos(a) * len * 0.55;
      el("path", { d: "M" + (grip.x + (rnd() - 0.5) * 6).toFixed(1) + " " + (grip.y - 8) + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + ex.toFixed(1) + " " + ey.toFixed(1), stroke: i % 3 ? "#4A2C1C" : "#5E3A25", "stroke-width": (0.9 + rnd() * 0.9).toFixed(2), fill: "none", "stroke-linecap": "round" }, twigs);
    }

    scatter(120, back, backColours, "ka-lb", 1.0, "rgba(160,190,120,.35)", 0.25);
    // Fill the middle, where leaves pointing outwards would otherwise leave a gap.
    function gauss() { return (rnd() + rnd() + rnd() - 1.5) / 1.5; }
    for (var m = 0; m < 70; m++) {
      var x2 = cx + gauss() * 30, y2 = cy + 8 + gauss() * 34;
      if (!inside(x2, y2)) continue;
      addLeaf(middle, x2, y2, rnd() * 360, 1.0 + rnd() * 0.4, "url(#ka-lf" + shade(x2, y2, frontColours) + ")", "rgba(235,245,200,.45)", 0.3);
    }
    scatter(150, front, frontColours, "ka-lf", 0.95, "rgba(235,245,200,.45)", 0.6);

    // Handle: a bundle of birch twigs with cut ends, tied with twine.
    var stems = [-8, -5.5, -3, -0.8, 1.4, 3.6, 6, 8.2];
    el("path", { d: "M70 136 C71 160 73 186 74 206 L86 206 C87 186 89 160 90 136 Z", fill: "url(#ka-bark)" }, handle);
    stems.forEach(function (o, idx) {
      var bottom = 202 + (idx % 3) * 2.5;
      el("path", { d: "M" + (80 + o) + " 136 C" + (80 + o * 0.9) + " 160 " + (80 + o * 0.75) + " 185 " + (80 + o * 0.7) + " " + bottom, stroke: idx % 2 ? "#4E301F" : "#6B4430", "stroke-width": "2.6", fill: "none", "stroke-linecap": "round" }, handle);
      el("path", { d: "M" + (80 + o - 0.6) + " 140 C" + (80 + o * 0.9 - 0.6) + " 162 " + (80 + o * 0.75 - 0.6) + " 184 " + (80 + o * 0.7 - 0.6) + " " + (bottom - 4), stroke: "rgba(255,225,190,.18)", "stroke-width": "0.6", fill: "none" }, handle);
      el("ellipse", { cx: (80 + o * 0.7).toFixed(1), cy: bottom + 0.8, rx: "1.4", ry: "0.9", fill: "#C9A27A", stroke: "#7A5236", "stroke-width": "0.4" }, handle);
    });
    [150, 163, 176].forEach(function (y, idx) {
      var w = 21 - idx * 1.2;
      el("rect", { x: (80 - w / 2).toFixed(1), y: y, width: w.toFixed(1), height: "5.2", rx: "2.4", fill: "url(#ka-twine)", stroke: "#9C8257", "stroke-width": "0.5" }, handle);
    });
    el("path", { d: "M90 167 C96 170 97 176 93 181", stroke: "#C7AE7E", "stroke-width": "1.1", fill: "none", "stroke-linecap": "round" }, handle);
    return svg;
  }
})();
