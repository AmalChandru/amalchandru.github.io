// Theme switch (Auto / Light / Dark), copy buttons on code blocks, active link in the contents rail.
(() => {
  const root = document.documentElement;
  const get = () => { try { return localStorage.getItem("theme") || "auto"; } catch { return "auto"; } };
  const set = (t) => {
    try { t === "auto" ? localStorage.removeItem("theme") : localStorage.setItem("theme", t); } catch {}
    apply(t);
  };
  const apply = (t) => {
    if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    document.querySelectorAll(".theme button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
  };
  document.querySelectorAll(".theme").forEach((g) => {
    g.innerHTML = ["auto", "light", "dark"]
      .map((t) => `<button type="button" data-t="${t}" aria-pressed="false">${t[0].toUpperCase() + t.slice(1)}</button>`)
      .join("");
    g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) set(b.dataset.t); });
  });
  apply(get());

  document.querySelectorAll(".code").forEach((block) => {
    const btn = document.createElement("button");
    btn.className = "copy"; btn.type = "button"; btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(block.querySelector("pre").innerText); btn.textContent = "Copied"; }
      catch { btn.textContent = "Failed"; }
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    });
    block.append(btn);
  });

  const links = [...document.querySelectorAll(".contents a")];
  if (links.length) {
    const heads = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const onScroll = () => {
      let cur = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top < 120) cur = h;
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + cur.id));
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }
})();
