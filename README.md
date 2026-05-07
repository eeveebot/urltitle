# urltitle

> Automatically fetches and displays titles for URLs posted in chat.

## Overview

The urltitle module monitors chat messages across all connected platforms and extracts URLs from incoming text. For each URL detected, it fetches the page and extracts the HTML `<title>`, then posts the result back to the channel. This gives chatters an at-a-glance preview of linked content without needing to click through.

The module operates as a **broadcast listener** in the eevee ecosystem. It registers a broadcast filter with the router (matching only messages containing URLs), receives matching messages via NATS, and sends titled responses back through the same messaging pipeline. This design means urltitle requires no explicit command invocation — it activates automatically whenever someone posts a link.

YouTube URLs receive special treatment: when a `YOUTUBE_API_KEY` is configured, the module queries the YouTube Data API for rich metadata (title, publish date, view count, likes, duration) and formats it as an infographic-style line. Shorts and live streams are detected and labeled accordingly.

## Features

- **Automatic URL detection** — regex-based extraction of `http`/`https` URLs from any chat message
- **HTML title extraction** — fetches the `<title>` tag from the target page
- **YouTube integration** — rich metadata (title, date, views, likes, duration) for videos, Shorts, and live streams via the YouTube Data API
- **In-memory caching** — 10-minute TTL cache reduces duplicate fetches for repeated URLs
- **Platform-aware colorization** — IRC responses use mIRC color codes; other platforms receive plain text
- **Content-type filtering** — only processes `text/html` responses; skips images, PDFs, etc.
- **Configurable** — can be disabled or rate-limited via config
- **Help registration** — registers `!help urltitle` entry automatically

## Install

This module is part of the eevee ecosystem and is not published independently.

```bash
# From the eevee project root
cd packages/urltitle   # or wherever the module lives
npm install
```

### Requirements

- **Node.js** ≥ 24.0.0
- **NATS** server (provided by the eevee infrastructure)
- **YouTube Data API key** (optional, for YouTube metadata)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key. Enables rich metadata for YouTube URLs. Without it, YouTube links fall back to standard HTML title fetching. |

## Configuration

The module loads its configuration through `loadModuleConfig` from `@eeveebot/libeevee`, which reads from the shared `config.yaml`.

```yaml
urltitle:
  # Set to false to disable the module entirely (it will exit on startup)
  enabled: true

  # Rate limiting (via libeevee's RateLimitConfig)
  ratelimit:
    # See libeevee documentation for available rate limit options
```

### Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Module exits immediately if set to `false` |
| `ratelimit` | _(none)_ | Inherited from libeevee rate limit config |
| HTTP User-Agent | `Mozilla/5.0 (compatible; eevee.bot URL Title Fetcher; +https://eevee.bot)` | Hardcoded in fetch requests |
| HTTP timeout | 10 seconds | Via `AbortSignal.timeout(10000)` |
| Cache TTL | 10 minutes | In-memory, cleaned every 5 minutes |
| Title max length | 200 characters | Truncated with `...` if exceeded |
| Broadcast TTL | 120 seconds | Router broadcast registration TTL |

## Usage / Commands

No commands are needed. The module activates automatically when a URL is posted in any channel the bot monitors.

### Examples

**Standard URL:**

```
<User> Check this out: https://example.com/some-page
<Bot> Title: Example Domain
```

**YouTube video (with API key configured):**

```
<User> https://www.youtube.com/watch?v=dQw4w9WgXcQ
<Bot> Rick Astley - Never Gonna Give You Up | 📅 Oct 28, 2009 | 👁️ 1.5B | 👍 15.0M | ⏱️ 3:33
```

**YouTube Short:**

```
<User> https://youtube.com/shorts/abc12345678
<Bot> Some Short Title #[SHORT] | 📅 Jan 1, 2025 | 👁️ 50.0K | 👍 2.1K | ⏱️ 0:15
```

**YouTube Live stream:**

```
<User> https://youtube.com/live/xyz12345678
<Bot> Live Stream Title #[LIVE] | 📅 Mar 15, 2026 | 👁️ 12.0K | 👍 800 | ⏱️ 1:45:00
```

Only the first URL title per message is posted, to avoid spam in messages containing multiple links.

## Architecture

```
┌─────────────┐    broadcast.register    ┌────────┐
│   urltitle   │ ──────────────────────►  │ router │
│   module     │ ◄──────────────────────  │        │
│              │    broadcast.message.*    │        │
└──────┬───────┘                          └────────┘
       │
       ├── URL detection (regex)
       │
       ├── Cache lookup (Map, 10-min TTL)
       │
       ├── YouTube path (if YOUTUBE_API_KEY set)
       │   ├── getYouTubeVideoId() → parse video/short/live ID
       │   ├── YouTube Data API → fetch metadata
       │   └── formatDuration() + formatNumber() + formatDate()
       │
       └── General URL path
           ├── fetch() via undici (10s timeout)
           ├── Content-type check (text/html only)
           ├── <title> regex extraction + HTML entity decode
           └── 200-char truncation
       │
       ▼
   colorizeUrlTitle() / colorizeYouTubeTitle()
       │
       ▼
   sendChatMessage() → NATS → connector → channel
```

### Key Components

- **Broadcast registration** — On startup, registers a broadcast filter (`messageFilterRegex: 'https?://'`) with the router. Re-registers on `control.registerBroadcasts` messages (per-module and global).
- **URL extraction** — `extractUrls()` uses a regex to find `http`/`https` URLs in message text.
- **Cache** — In-memory `Map<string, CacheEntry>` with 10-minute TTL. A `setInterval` cleanup runs every 5 minutes.
- **YouTube handling** — `getYouTubeVideoId()` matches standard videos (`watch?v=`), Shorts (`/shorts/`), and Live (`/live/`) URLs. Fetches via `youtube-node` library.
- **General fetch** — Uses `undici` `fetch()` with a 10-second abort timeout. Only processes `text/html` responses. Extracts `<title>` via regex with HTML entity decoding.
- **Colorization** — `colorizeForPlatform()` from libeevee applies mIRC color codes on IRC; other platforms get plain text. YouTube titles use per-element coloring (title=cyan, date=yellow, views=green, likes=red, duration=purple) on IRC.
- **Help & stats** — Registers help entries and stats handlers (uptime, message counts) via libeevee utilities.

### NATS Topics

| Direction | Subject | Purpose |
|-----------|---------|---------|
| Out | `broadcast.register` | Register URL-filtered broadcast |
| In | `broadcast.message.<UUID>` | Receive messages containing URLs |
| In | `control.registerBroadcasts` | Re-register broadcasts (global) |
| In | `control.registerBroadcasts.urltitle` | Re-register broadcasts (module-specific) |
| Out | `chat.message.outgoing.*` | Send titled responses |

## Development

```bash
# Install dependencies
npm install

# Lint
npm test

# Build (lints then compiles TypeScript)
npm run build

# Watch mode (compile + run)
npm run dev
```

The module is written in TypeScript with ESM output (`"type": "module"`). Source files use the `.mts` extension and compile to `dist/` as `.mjs` files.

### Dependencies

| Package | Purpose |
|---------|---------|
| `@eeveevee/libeevee` | NATS client, config, logging, chat messaging, help registration, stats |
| `undici` | HTTP fetch for general URL title retrieval |
| `youtube-node` | YouTube Data API client for rich video metadata |

## Contributing

Contributions are welcome! Bug reports and pull requests can be filed at the module's repository.

## License

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — see [LICENSE](./LICENSE) for the full text.
