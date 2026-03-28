---
title: YT Summarizer
emoji: 📺
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# Toolkit

A personal productivity toolkit built with Next.js 16 and the OpenAI API. Three tools accessible from a single hub.

## Tools

### YouTube Summarizer

Paste a YouTube link and get a Vietnamese summary streamed in real time.

- **Transcript fallback chain**: `youtube-transcript` npm package (Vietnamese → auto-generated) → `yt-dlp` subtitles → `yt-dlp` audio download + Whisper transcription (with ffmpeg chunking for large files)
- **Streaming TTS**: audio chunks play as they generate via SSE — no waiting for the full file
- **Favorite Channels feed**: latest videos from configured channels, cached 15 minutes
- Playback controls: pause/resume, stop, speed (1x / 1.25x / 1.5x / 2x)

### Translator

English (Singaporean) ↔ Vietnamese translation with auto-translate on typing.

- Three temperature presets: Precise (0), Balanced (0.5), Creative (1)
- Streaming output, swap languages, TTS for both sides, copy

### Diff Checker

Client-side line diff between two text blocks or files.

- Side-by-side view with line numbers
- Added / removed / unchanged stats
- File upload support

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4, Geist font |
| AI | OpenAI SDK 6 (GPT-5.4, Whisper, TTS) |
| Markdown | react-markdown, remark-gfm |
| Transcripts | youtube-transcript, yt-dlp, ffmpeg |
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
| `OPENAI_API_KEY` | OpenAI API key (required for summarization, translation, and TTS) |
| `YOUTUBE_CHANNELS` | JSON array of favorite channels (see below) |

#### `YOUTUBE_CHANNELS` format

A JSON array where each entry has `name` and `url`:

```env
YOUTUBE_CHANNELS=[{"name":"Channel Name","url":"https://www.youtube.com/@handle/videos"}]
```

The `/api/channels` endpoint reads this variable and fetches the latest 5 videos from each channel using yt-dlp. If unset, the feed will be empty.

### Optional System Dependencies

These are only needed for the YouTube Summarizer's fallback transcript methods:

- **yt-dlp** — subtitle/audio extraction when the npm transcript package fails
- **ffmpeg** — splitting large audio files before Whisper transcription

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/summarize` | YouTube video summarization (SSE stream) |
| POST | `/api/translate` | Text translation (SSE stream) |
| POST | `/api/tts` | Text-to-speech — single response or `stream: true` for SSE audio chunks |
| GET | `/api/channels` | Favorite channels feed (cached, uses yt-dlp) |

## Project Structure

```
app/
├── page.tsx                        # Home hub
├── youtube-summarizer/page.tsx
├── translator/page.tsx
├── diff-checker/page.tsx
└── api/
    ├── summarize/route.ts
    ├── translate/route.ts
    ├── tts/route.ts
    └── channels/route.ts
lib/
├── youtube.ts                      # Transcript extraction pipeline
├── youtube-utils.ts                # Video ID parsing, SRT parsing
├── api-utils.ts                    # SSE stream helpers
├── diff.ts                         # LCS-based line diff
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
docker build -t toolkit .
docker run -p 7860:7860 -e OPENAI_API_KEY=sk-... toolkit
```

### Render

A `render.yaml` is included for one-click deploy on Render (Docker runtime, free plan).
