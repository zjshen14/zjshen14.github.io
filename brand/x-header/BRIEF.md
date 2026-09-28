# Brief: X (Twitter) profile header — AI only, abstract, gallery quality

Owner: an engineer building a public profile in the AI community.

## Hard requirements
- 1500x500 canvas, delivered as PNG rendered at 2x (3000x1000). File size < 2 MB.
- **No text, no logos, no letters or numbers** anywhere.
- **AI only.** Abstract and conceptual — no robots, brains, circuit boards, stock "neural network" node diagrams, or crypto/finance motifs.
- The profile avatar covers roughly the **bottom-left 0–330px x 300–500px**; keep that region quiet (no focal point there).
- X crops the header on some devices (top/bottom ~60px, and more on mobile) — keep the focal point in the vertical middle band, horizontally in the centre or right third.
- Must look good small (mobile) and large (desktop). Dark theme friendly.

## Taste bar
The user rejected previous attempts as ugly and cluttered (mixing AI + crypto + chart motifs). The current best attempt is `reference-current.png`
(a loss-landscape contour map with a gradient-descent trail). Beat it clearly. Aim for the restraint and craft of
generative-art prints (think Tyler Hobbs / Anders Hoff / Refik Anadol stills): one strong idea, considered palette,
real depth, careful density and negative space, no clip-art feel.

Ideas you may explore (or better ones): attention patterns between tokens rendered as light; latent-space flow fields;
high-dimensional embeddings projected into a luminous point-cloud manifold; diffusion (noise resolving into structure);
emergence from simple rules. Pick concepts that are genuinely about how modern AI works.

## Deliverables (in this directory)
- Two **distinct** concepts: `concept-a.html` + `concept-a.png`, `concept-b.html` + `concept-b.png`.
- Each HTML is self-contained (inline JS/Canvas or SVG, no network), deterministic (seeded RNG), sized 1500x500 CSS px.
- Render PNGs with headless Chrome at 2x, e.g.:
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
    --user-data-dir="$PWD/.chrome" --force-device-scale-factor=2 --window-size=1500,500 \
    --screenshot="$PWD/concept-a.png" "file://$PWD/concept-a.html"
- Look at your own renders and iterate until they meet the taste bar (check the avatar zone, crop safety, balance).
- Finish with `NOTES.md`: for each concept, the idea in one or two sentences and why it reads as AI.
