# Brand assets

Source files for images used outside the site's own pages. This folder is not part of the Astro build.

## `x-header/`: X (Twitter) profile header

- **In use:** `concept-b.png` ("From noise"), a cloud of particles resolving into one clean wave, the way a diffusion model turns noise into structure. Set as the @z_j_s header on 2026-09-28.
- **Alternative:** `concept-a.png` ("Latent silk").
- Each `.html` file is self-contained and deterministic (seeded), so the PNG can be regenerated or tweaked at any time:

  ```bash
  python3 brand/x-header/render.py      # both concepts
  python3 brand/x-header/render.py b    # just one
  ```

- Output is 3000×1000 (1500×500 at 2×). X's header limit is about 2 MB. Keep the bottom-left corner quiet, because the avatar covers it.
- `BRIEF.md` is the design brief; `NOTES.md` has the design notes. Both concepts were generated with Codex at xhigh reasoning effort.

## `og-images/`: link preview images (Open Graph)

1200×630 cards shown when a post is shared on X, LinkedIn, WeChat or Slack.

1. Add an entry to `PAGES` in `og-images/og_templates.py`.
2. Run `python3 brand/og-images/og_templates.py`. PNGs are written to `public/`.
3. Set `ogImage: "/og/<slug>-en.png"` in the post's frontmatter.

`chrome_shot.py` is the shared headless-Chrome screenshot helper (macOS, requires Google Chrome).
