
# Beneath the City of Lanterns — Prototype v0.1

A browser-first, installable (PWA) dungeon crawler with step/turn movement and lightweight combat.
This build contains the **Sewers** slice: basic exploration, two encounter types, a merchant, a shrine, and the **Wisp** event.

## Play Locally (Desktop)
- Open `index.html` in a modern desktop browser (Chrome, Edge, Firefox, Safari).
  - Note: Some browsers restrict Service Workers for `file://` URLs. For the full PWA/offline experience, host it (see below).

## Host Online (Recommended for iPhone)
1. Create a new public repo on GitHub named e.g. `city-of-lanterns`.
2. Upload the contents of this folder to the repo root.
3. In GitHub settings, enable **Pages** (Source: `main`, Root `/`).
4. Wait for the Pages URL to appear (e.g., `https://yourname.github.io/city-of-lanterns/`).
5. Open that URL on your iPhone.
6. Tap **Share** → **Add to Home Screen** to install. It will then run full-screen and **offline**.

*(Alternatives: Netlify, Vercel, Cloudflare Pages — just drag-and-drop.)*

## Controls
- **Desktop:** W/A/D to step forward / turn left / turn right, S to step back, **L** for Lantern, **M** menu, **X** save.  
- **Mobile:** Use the on-screen **D‑pad** and buttons (Lantern, Menu, Save).

## Save/Load
- Auto/manual saves use `localStorage`. Your state persists in the browser/app.  
- To reset: clear the browser storage for this site.

## Content Notes
- **Lantern puzzle (P):** Stand on the marked alcove and use **Lantern**; it unlocks a **secret gate (T)** and triggers **Wisp** (first meeting).
- **Merchant (M):** The **Ragpicker King** buys/sells basics (prototype economy).
- **Shrine (S):** Restores the party.
- **Battles (B):** Triggers simple fights (Scavenger, Pipe Larva). Skills are minimal in this slice.

## Roadmap
- Expand to Catacombs, Archives, Fungal Warrens, etc.
- Add rhythm puzzles, refraction, and cartomancy hand system.
- Implement class‑change talismans (Veilglass Chrysalis, Black Quill, etc.).
- Add audio, richer UI, auto-map, and accessibility options.

Enjoy exploring!
