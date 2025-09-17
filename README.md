# RPG_assistant
Discord app to record and summarize RPG sessions

## Prereqs
- Node 20+
- ffmpeg in PATH (Dockerfile installs it)
- Discord Bot token
- OpenAI API key


## Setup
1. Copy `.env.example` → `.env` and fill values.
2. `npm i`
3. `npm run build`
4. Run locally with `node dist/index.js` or `npm run dev` for hot reload.
5. Invite bot with permissions: Connect, Speak (optional), Use Voice Activity, Send Messages.
6. Create a `#recap` text channel (or set `RECAP_CHANNEL_NAME`).


## Usage
- `/privacy` → shows consent text
- Join a voice channel
- `/start-rec` → starts recording
- Play 2–3h session
- `/stop-rec` → merges, transcribes, posts recap


## Notes
- All participants must consent to recording. Update `src/privacy.ts` accordingly.
- Raw audio is temporary; adjust `AUTO_DELETE_AUDIO_DAYS` and add a cron if hosting long-term.
- For finer diarization, store per-user chunks and annotate names in the summary prompt.