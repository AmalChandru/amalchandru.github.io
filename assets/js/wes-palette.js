// Wes Anderson palette widget: pick a random film, show its colours and what they mean.
(() => {
  const root = document.querySelector("[data-wes]");
  const source = document.getElementById("wes-palettes");
  if (!root || !source) return;
  const palettes = JSON.parse(source.textContent);
  const strip = root.querySelector(".wes-strip");
  const movie = root.querySelector(".wes-movie");
  const meanings = root.querySelector(".wes-meanings");
  const el = (tag, props = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids);
    return node;
  };

  root.querySelector(".wes-generate").addEventListener("click", () => {
    const p = palettes[Math.floor(Math.random() * palettes.length)];
    strip.replaceChildren(...p.colors.map((c) => { const s = el("span"); s.style.background = c; return s; }));
    movie.replaceChildren(el("a", { href: p.imdb, target: "_blank", rel: "noopener", textContent: p.movie }), `: ${p.description}`);
    meanings.replaceChildren(...p.colorMeanings.map((m) => {
      const sw = el("span", { className: "swatch" }); sw.style.background = m.color;
      return el("p", {}, sw, el("code", { textContent: m.color }), `: ${m.meaning}`);
    }));
  });
})();
