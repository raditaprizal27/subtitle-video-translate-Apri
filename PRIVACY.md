# Privacy

Apri Video Translate is designed to be simple and local-first.

## What The Extension Reads

- Visible subtitle/caption text on supported video pages.
- Extension settings such as target language, bilingual mode, subtitle position, and enabled state.
- Cached translations stored locally in `chrome.storage.local`.

## What Is Sent To Google Translate

When a caption line needs translation, the extension sends the caption text, source language code, and target language code to:

```text
https://translate.googleapis.com/translate_a/single
```

The extension does not send video audio, account credentials, cookies, passwords, or browsing history.

## What Is Stored

The extension stores:

- Settings in `chrome.storage.local`.
- Translation cache entries keyed by source language, target language, and original subtitle text.

You can clear the translation cache from the popup.

## No Accounts Or Backend

Apri Video Translate does not require login, API keys, paid accounts, or a backend server.
