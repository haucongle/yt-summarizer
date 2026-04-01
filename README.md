---
title: YT Summarizer
emoji: 📺
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# YT Summarizer

A YouTube video summarizer that generates Vietnamese summaries with streaming TTS, powered by Next.js 16 and the OpenAI API.

## Features

- **Transcript fallback chain**: `youtube-transcript` (Vietnamese → auto-generated) → `youtubei.js` + Whisper → `yt-dlp` subtitles → `yt-dlp` audio + ffmpeg chunking + Whisper
- **Streaming summary**: SSE-streamed Vietnamese markdown summary via GPT-5.4
- **Streaming TTS**: audio chunks play as they generate — no waiting for the full file
- **Favorite Channels feed**: latest videos from configured channels, cached 15 minutes
- **Telegram integration**: daily digest of new videos + tap-to-summarize inline buttons
- Playback controls: pause/resume, stop, speed (1x / 1.25x / 1.5x / 2x)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript 6 |
| Styling | Tailwind CSS 4, Geist font |
| AI | OpenAI SDK 6 (GPT-5.4, Whisper, TTS) |
| Markdown | react-markdown, remark-gfm |
| Transcripts | youtube-transcript, youtubei.js, yt-dlp, ffmpeg |
| Testing | Bun test |
| Runtime | Node.js 22 (Docker) |

## Getting Started

```bash
cp .env.example .env    # add your OPENAI_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required for summarization and TTS) |
| `YOUTUBE_CHANNELS` | JSON array of favorite channels (see below) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (GitHub Actions + webhook) |
| `TELEGRAM_CHAT_ID` | Telegram chat ID to receive daily digest (GitHub Actions) |

#### `YOUTUBE_CHANNELS` format

A JSON array where each entry has `name`, `url`, and `channelId`:

```env
YOUTUBE_CHANNELS=[{"name":"Channel Name","url":"https://www.youtube.com/@handle/videos","channelId":"UCxxxxxxxx"}]
```

- `url` — used by the web app's `/api/channels` endpoint (fetches videos via yt-dlp)
- `channelId` — used by the GitHub Action daily digest (fetches videos via YouTube RSS feed)

You can find a channel's ID on [youtube.com/account_advanced](https://www.youtube.com/account_advanced) or from tools like [vidiq.com](https://vidiq.com).

### Optional System Dependencies

These are only needed for the fallback transcript methods:

- **yt-dlp** — subtitle/audio extraction when the npm transcript packages fail
- **ffmpeg** — splitting large audio files before Whisper transcription

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/summarize` | YouTube video summarization (SSE stream) |
| POST | `/api/tts` | Text-to-speech — single response or `stream: true` for SSE audio chunks |
| GET | `/api/channels` | Favorite channels feed (cached, uses yt-dlp) |
| POST | `/api/telegram` | Telegram bot webhook (handles button clicks, sends summaries) |

## Project Structure

```
app/
├── page.tsx                        # Redirects to /youtube-summarizer
├── youtube-summarizer/page.tsx     # Main UI
└── api/
    ├── summarize/route.ts
    ├── tts/route.ts
    ├── channels/route.ts
    └── telegram/route.ts           # Telegram bot webhook
lib/
├── youtube.ts                      # Transcript extraction pipeline
├── youtube-utils.ts                # Video ID parsing, SRT parsing
├── summarize.ts                    # Shared summarization logic
├── telegram.ts                     # Telegram API helpers
├── api-utils.ts                    # SSE stream helpers
├── tts-utils.ts                    # TTS chunking and streaming
├── constants.ts                    # Models, timeouts, limits
├── formatters.ts                   # Duration, views, dates
├── logger.ts                       # Structured logging
├── types.ts                        # Shared types
└── __tests__/
```

## Deployment

### Docker

The included multi-stage `Dockerfile` installs yt-dlp, ffmpeg, and produces a standalone Next.js build. Runs on port 7860.

```bash
docker build -t yt-summarizer .
docker run -p 7860:7860 -e OPENAI_API_KEY=sk-... yt-summarizer
```

### Render

A `render.yaml` is included for one-click deploy on Render (Docker runtime, free plan).

## Telegram Bot

A daily digest + click-to-summarize Telegram bot. Every day at 8 PM (GMT+7), a GitHub Action sends videos published in the last 24 hours per channel with inline buttons. Tap a button to get a Vietnamese summary sent back to you.

### Setup

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather) and copy the token.
2. Get your chat ID by messaging the bot, then calling `https://api.telegram.org/bot<TOKEN>/getUpdates`.
3. Add these as **GitHub repository secrets** (Settings → Secrets → Actions):
   - `YOUTUBE_CHANNELS` — same JSON array as in `.env`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Add `TELEGRAM_BOT_TOKEN` to the deployed app's environment variables as well.
5. Register the webhook (one-time, replace `<TOKEN>` and `<APP_URL>`):

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram"
```

The daily digest can also be triggered manually from the Actions tab via `workflow_dispatch`.
