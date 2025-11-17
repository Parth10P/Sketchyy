# Sketchyy

A small drawing app built with React and Vite. This project includes two drawing approaches:

- A pixel-based fullscreen `DrawingCanvas` (HTML canvas).
- An Excalidraw-powered vector editor (`ExcalidrawCanvas`).

This README explains how to run the app, notes about the Excalidraw integration, and troubleshooting tips.

## Quick start

From the repository root:

```bash
cd Frontend
npm install
npm run dev
```

Open the app at http://localhost:5173 (Vite will print the actual port).

## Files of interest

- `Frontend/src/components/DrawingCanvas.jsx` — fullscreen pixel canvas drawing component (mouse-based drawing).
- `Frontend/src/components/ExcalidrawCanvas.jsx` — Excalidraw integration using the documented API (ref, `onChange`, `updateScene`). Provides Save/Load/Clear controls.
- `Frontend/src/App.jsx` — renders the drawing component (currently set to render Excalidraw).
- `Frontend/index.html` — includes the Excalidraw stylesheet from the unpkg CDN and sets a white background.

## Excalidraw notes

- The project depends on `@excalidraw/excalidraw`. The package was installed using `--legacy-peer-deps` because the repo's React version (19.x) is newer than Excalidraw's officially supported peer versions (17/18). This generally works for development but may have edge-case incompatibilities.

- The Excalidraw package in `node_modules` didn't include a prebuilt CSS file at `dist/excalidraw.min.css` for the version installed here. To ensure styling loads correctly the app uses the CDN stylesheet in `Frontend/index.html`:

```html
<link rel="stylesheet" href="https://unpkg.com/@excalidraw/excalidraw/dist/excalidraw.min.css" />
```

If you prefer a local copy, download the CSS from the Excalidraw release and place it inside `Frontend/src/styles` and import it from there.

## Troubleshooting

- If you see a blank or black screen, check the browser console for errors and ensure the CDN stylesheet is reachable (Network tab). If the stylesheet is blocked, Excalidraw may render unstyled or incorrectly.

- If `npm install` fails due to peer dependency conflicts, try:

```bash
npm install --legacy-peer-deps
```

- To revert to the simpler pixel canvas (no Excalidraw), change `App.jsx` to import and render `DrawingCanvas` instead of the Excalidraw component.

## Next steps / Improvements

- Add touch support for the pixel canvas.
- Add export (PNG/SVG) buttons for Excalidraw.
- Add an in-app toggle to switch between pixel canvas and Excalidraw.
- Optionally, pin React to a version supported by Excalidraw (18.x) for full compatibility.

If you'd like, I can implement any of the above next (export, touch support, toggle, or local copy of the CSS).