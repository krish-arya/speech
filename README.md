# Voice Search Assistant

Realtime voice-first AI search assistant. Speak naturally, get intelligent answers backed by web search.

## Stack

- **Frontend:** Next.js 15 + TypeScript + TailwindCSS v4 + Framer Motion
- **Backend:** FastAPI + Python 3.12
- **AI:** OpenRouter (Claude, GPT, Gemini, DeepSeek)
- **Search:** Tavily / SerpAPI
- **Scraping:** BeautifulSoup + Playwright
- **Audio:** Web Audio API + Whisper STT + OpenAI TTS (all via OpenRouter)

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
# Edit .env with your API keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Architecture

```
speech/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Pydantic settings
│   │   ├── routes/voice.py      # API endpoints + SSE streaming
│   │   ├── services/
│   │   │   ├── orchestrator.py  # Core pipeline coordinator
│   │   │   ├── search.py        # Tavily/SerpAPI integration
│   │   │   └── scraper.py       # BeautifulSoup + Playwright
│   │   ├── agents/
│   │   │   └── search_agent.py  # Search decision + execution
│   │   ├── providers/
│   │   │   ├── openrouter.py    # LLM provider (streaming)
│   │   │   ├── speech.py        # Whisper STT
│   │   │   └── tts.py           # OpenRouter TTS (OpenAI-compatible)
│   │   ├── models/schemas.py    # Pydantic models
│   │   └── utils/text.py        # Text utilities
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Single-page app
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── VoiceOrb.tsx         # Animated mic button
│   │   ├── Transcript.tsx       # Live transcript display
│   │   ├── ResponseStream.tsx   # Token-by-token text
│   │   ├── SourceList.tsx       # Source references
│   │   ├── StatusIndicator.tsx  # Search/thinking status
│   │   └── AudioVisualizer.tsx  # Waveform bars
│   ├── hooks/
│   │   ├── useAudioRecorder.ts  # MediaRecorder + amplitude
│   │   ├── useStreamingResponse.ts # SSE parser
│   │   └── useVoiceSession.ts   # Session orchestrator
│   └── lib/api.ts               # API client
└── README.md
```

## API Flow

1. User speaks → audio recorded in browser (WebM Opus)
2. Audio sent to `POST /api/query` as multipart form
3. Backend transcribes via Whisper (OpenRouter)
4. Search agent decides if web search needed
5. If yes: Tavily search → scrape top results → clean content
6. LLM generates response with grounded context
7. Response streamed as SSE (`text/event-stream`)
8. Frontend renders tokens in real-time
9. TTS audio fetched and played progressively

## Environment Variables

### Backend (.env)

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `TAVILY_API_KEY` | Yes* | Tavily search API key |
| `SERPAPI_API_KEY` | No | Alternative search provider |
| `SEARCH_PROVIDER` | No | `tavily` (default) or `serpapi` |
| `DEFAULT_LLM_MODEL` | No | Default: `anthropic/claude-3.5-sonnet` |
| `FAST_LLM_MODEL` | No | For search decisions: `google/gemini-flash-1.5` |
| `TTS_VOICE` | No | Voice for TTS (default: `alloy`) |

### Frontend (.env.local)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Backend URL (default: `http://localhost:8000`) |

## Deployment

### Backend → Render

1. Push to GitHub
2. Create a new **Web Service** on Render, point to your repo
3. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from `.env.example` (Render sets `PORT` automatically)
5. Deploy — note the URL (e.g., `https://voice-search-xxxx.onrender.com`)

### Frontend → Vercel

1. Push to GitHub
2. Import project in Vercel, set **Root Directory** to `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL
4. Deploy

## Design Principles

- Dark, minimal UI with strong typography
- Center-focused layout with animated voice orb
- Microphone reacts to audio amplitude
- Morphing states: idle → listening → thinking → responding
- Streaming text and progressive TTS playback
- Interrupt at any point
- No auth, no database, no bloat
