import 'dotenv/config';


export const cfg = {
discordToken: process.env.DISCORD_TOKEN!,
recapChannelName: process.env.RECAP_CHANNEL_NAME || 'recap',
allowedGuildId: process.env.ALLOWED_GUILD_ID || undefined,
recordDir: process.env.RECORD_DIR || './recordings',
autoDeleteDays: Number(process.env.AUTO_DELETE_AUDIO_DAYS || 14),
languageHint: process.env.LANGUAGE_HINT || 'sv',
openai: {
apiKey: process.env.OPENAI_API_KEY!,
transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
textModel: process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini'
}
};


if (!cfg.discordToken) throw new Error('Missing DISCORD_TOKEN');
if (!cfg.openai.apiKey) throw new Error('Missing OPENAI_API_KEY');