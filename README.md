# Family Tree Builder

An offline-first family tree app that runs in your browser. Add couples, parents, children and siblings, then explore the tree with pan, zoom, search, collapsible branches, focus mode and a compact view. Export the whole tree as PNG or PDF.

**Live app: https://engr2pm.github.io/family-tree-builder/**

Your data is stored locally in your browser (IndexedDB) and is never uploaded anywhere.

## Features

- Couple cards with a name and optional photo per person
- Independent ancestry per spouse (each person has their own parents)
- Add parent, child, sibling; update or delete a node (deleting removes everything beneath it)
- Pan, pinch-zoom, minimap, and search-to-jump
- Collapse/expand branches, focus mode (limit to N generations around a person), compact cards
- Export to PNG or PDF
- Installable PWA that works offline

## Run it locally

Requires [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

To build a production bundle:

```bash
npm run build
npm run preview
```

## Notes

- Data lives in one browser on one device. Clearing site data erases the tree.
- Built with React, TypeScript, Vite, [React Flow](https://reactflow.dev), Dexie (IndexedDB), Zustand, html-to-image and jsPDF.
