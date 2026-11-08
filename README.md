# amalchandran.xyz

Personal site, built with [Hugo](https://gohugo.io) (v0.146+) and a small in-repo theme, **Batcave**.
The built site is published from the `amalchandru.github.io` repo (GitHub Pages, custom domain via `static/CNAME`).

## Everyday tasks

| Task | How |
|---|---|
| Preview locally | `hugo server` → http://localhost:1313 |
| New journal | `hugo new content journals/my-post-slug` (creates `content/journals/my-post-slug/index.md`; remove `draft: true` to publish) |
| New talk | `hugo new content talks/my-talk-slug` |
| Add an image to a post | Drop the file next to the post's `index.md`, then `{{< figure src="photo.jpg" alt="What it shows" caption="Optional" >}}` or plain `![alt](photo.jpg)`. Images are resized to WebP automatically. |
| Update "Lately" | Edit `content/lately/index.md` (BUILD / READ / PLAY / RUN). The "Updated" date follows the last commit to that file (or its modification time if uncommitted). It hides itself after `params.latelyStaleDays` (90) days without an update. |
| Callouts in posts | `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]` |
| Code block title | ```` ```bash {title="setup.sh"} ```` |
| Build for production | `hugo --gc --minify` → output in `public/` |

## Deploy

```sh
hugo --gc --minify
rsync -a --delete --exclude .git ../amalchandran-site/public/ ../amalchandru.github.io/
cd ../amalchandru.github.io && git add -A && git commit -m "Deploy" && git push
```

## Layout

```
content/
  _index.md            homepage: headline, intro (body), buttons, "Send a signal" band
  lately/index.md      the Lately strip (headless: never rendered as its own page)
  journals/<slug>/     one folder per post: index.md + its images
  talks/<slug>/
  self/index.md        uses the "simple" layout (no date, no contents rail)
layouts/_shortcodes/   site-specific shortcodes (wes-palette)
assets/                site-specific CSS/JS (wes-palette)
themes/batcave/        the design
  assets/css/          tokens.css (colours, type, spacing) → base → layout → components → home → post → drawing
  assets/js/main.js    light/dark switch, copy buttons, active contents link
  layouts/             baseof, home, page, section, simple, taxonomy, term, 404
    _partials/         head, header, footer, lately, journal rows, posts-by-year, picture, clock-module (hero SVG)
    _markup/           render hooks: headings (anchors), code blocks, tables, images, blockquote callouts
    _shortcodes/       figure
hugo.toml              site settings: menus, social links, contact link, footer line
```

To change colours or type, edit `themes/batcave/assets/css/tokens.css`. Everything else reads from those tokens.
