<p align="center">
  <img src="public/icon-128.png" width="96" height="96" alt="Apri Video Translate logo" />
</p>

<h1 align="center">Apri Video Translate</h1>

<p align="center">
  A lightweight Chromium extension that translates existing video captions into Indonesian with a clean bilingual overlay.
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-1f8fba" />
  <img alt="Chromium" src="https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-0f766e" />
  <img alt="No API key" src="https://img.shields.io/badge/API%20key-not%20required-facc15" />
  <img alt="Default language" src="https://img.shields.io/badge/Default-Indonesian-e11d48" />
</p>

## Why This Exists

Apri Video Translate is for learners who watch technical videos, courses, talks, and tutorials in another language but want quick Indonesian subtitle help without API keys or paid services.

It keeps the experience intentionally simple:

- Turn it on.
- Enable captions on the video.
- Read Indonesian translation first, original subtitle second.

## Features

- Indonesian (`id`) as the default target language.
- Bilingual subtitle overlay inspired by streaming platforms.
- YouTube, YouTube embeds, Udemy, and generic HTML5 video support.
- Works inside supported iframe embeds with `all_frames`.
- Local translation cache using source language, target language, and original caption text.
- Debounced caption detection to avoid excessive translation calls.
- Simple popup controls for enable/disable, target language, bilingual mode, subtitle position, and cache clearing.
- No login, no backend server, no API key, and no paid API integration.

## Important Limitation

This extension only translates subtitles/captions that already exist on the page.

It does not generate subtitles from audio and does not include speech-to-text. If a video has no captions, there is nothing for the extension to translate.

## Supported Sites

| Site / player | Status | Notes |
| --- | --- | --- |
| YouTube | Supported | Requires captions/CC to be available and enabled. |
| YouTube embeds | Supported | Includes course pages that embed YouTube players. |
| Udemy | Supported | Requires course captions to be available. |
| HTML5 video | Best effort | Reads `video.textTracks` and common caption containers. |

More details: [Supported Sites](docs/SUPPORTED_SITES.md).

## How Translation Works

Apri Video Translate uses the unofficial free Google Translate endpoint:

```text
https://translate.googleapis.com/translate_a/single
```

Requests include only the subtitle text and selected language codes. If the request fails or times out, the extension falls back gracefully and keeps the original subtitle visible.

Privacy details: [Privacy](PRIVACY.md).

## Install From Source

```bash
npm install
npm run build
```

Then load the unpacked extension:

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Microsoft Edge.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the `build/` folder.
5. Open a video page, enable captions, and turn on Apri Video Translate from the toolbar popup.

## Development

```bash
npm start
```

Create a production build and zip:

```bash
npm run build
```

The unpacked extension is generated in `build/`, and the zip package is generated in `release/`.

## Roadmap

- More site adapters for Coursera, edX, LinkedIn Learning, Vimeo, and other course platforms.
- Optional import/export for settings and cache.
- Better caption diagnostics when a site cannot be detected.
- More polished release screenshots and demo GIFs.

## Contributing

Small, focused improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests.

## License

This project was adapted from an existing public extension repository. Before distributing a public fork widely, confirm the upstream licensing situation and choose the appropriate license for your publication.
