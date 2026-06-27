# Contributing

Thanks for helping improve Apri Video Translate.

## Good First Contributions

- Add or improve a site adapter.
- Improve subtitle placement on a specific player.
- Improve popup copy or README clarity.
- Fix build warnings or TypeScript issues.

## Development

```bash
npm install
npm start
```

Production build:

```bash
npm run build
```

## Adapter Guidelines

- Only read captions that already exist on the page.
- Avoid speech-to-text or backend services.
- Keep selectors focused and documented.
- Avoid duplicate rendering and repeated translation requests.
- Prefer small, site-specific adapters over broad fragile selectors.

## Pull Request Checklist

- Build passes with `npm run build`.
- The change keeps Manifest V3 compatibility.
- No paid API, login, backend, or API key requirement is introduced.
- README or supported-site docs are updated when behavior changes.
