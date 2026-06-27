# Supported Sites

Apri Video Translate works by reading captions that are already available in the page or video player.

## Supported

| Site / player | Support level | Notes |
| --- | --- | --- |
| YouTube | Good | Enable CC/captions first. |
| YouTube embeds | Good | Works in iframes when the embedded player exposes captions. |
| Udemy | Good | Requires course captions. |
| Generic HTML5 video | Best effort | Reads active `video.textTracks` where available. |
| Video.js, Plyr, JW Player, MediaElement | Best effort | Uses common caption container selectors. |

## Not Supported

- Videos without captions.
- Captions rendered directly into the video pixels.
- Captions drawn into canvas without readable DOM or text tracks.
- Audio-only subtitle generation.

## Adding A Site Adapter

Add new adapters in:

```text
src/pages/content/index.ts
```

Each adapter should:

- Match the site hostname.
- Return only the currently visible caption text.
- Provide a player element when possible so the overlay can be positioned correctly.
- Avoid returning duplicate caption text.
