# EclipseJournal - React/Vite

Deploy Netlify:
- Build command: `npm run build`
- Publish directory: `dist`
- Node: 20 (`.nvmrc` already included)

Before first push/deploy, run locally:

```bash
npm install
npm run build
```

This repository intentionally does not include `package-lock.json`; generate it locally with `npm install` so it uses your public npm registry.
