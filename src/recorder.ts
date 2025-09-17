import { joinVoiceChannel, EndBehaviorType, VoiceReceiver, getVoiceConnection } from '@discordjs/voice';
import { ChannelType, Guild, VoiceBasedChannel } from 'discord.js';
import { createWriteStream, mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import prism from 'prism-media';
import { logger } from './logger.js';
import { cfg } from './config.js';


export type ActiveRecording = { files: string[]; receiver: VoiceReceiver; startedAt: number };


const ensureDir = (dir: string) => { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); };


export async function startRecording(guild: Guild, channelId: string): Promise<ActiveRecording> {
ensureDir(cfg.recordDir);
const conn = joinVoiceChannel({
channelId,
guildId: guild.id,
adapterCreator: guild.voiceAdapterCreator,
selfDeaf: false,
selfMute: true
});


const receiver = conn.receiver;
const files: string[] = [];


receiver.speaking.on('start', (userId) => {
// Subscribe to a user's Opus stream and decode to PCM 48kHz mono
const opus = receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 } });
const pcm = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });
const out = join(cfg.recordDir, `${Date.now()}-${userId}.pcm`);
const ws = createWriteStream(out);
opus.pipe(pcm).pipe(ws);
ws.on('close', () => { files.push(out); logger.debug({ out }, 'chunk closed'); });
});


return { files, receiver, startedAt: Date.now() };
}


export function stopRecording(guildId: string) {
const conn = getVoiceConnection(guildId);
conn?.destroy();
}


export function getUserVoiceChannelId(guild: Guild, userId: string): string | null {
const ch = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.members.has(userId)) as VoiceBasedChannel | undefined;
return ch?.id || null;
}