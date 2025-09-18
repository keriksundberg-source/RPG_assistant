import { joinVoiceChannel, EndBehaviorType, VoiceReceiver, getVoiceConnection, DiscordGatewayAdapterCreator } from '@discordjs/voice';
import { ChannelType, Guild, VoiceBasedChannel } from 'discord.js';
import { createWriteStream, mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';
import { cfg } from './config.js';
import prism from 'prism-media';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Wav = require('wav');

export type ActiveRecording = { files: string[]; receiver: VoiceReceiver; startedAt: number };


const ensureDir = (dir: string) => { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); };

export async function startRecording(guild: Guild, channelId: string): Promise<ActiveRecording> {
    ensureDir(cfg.recordDir);
    const conn = joinVoiceChannel({
        channelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
        selfDeaf: false,
        selfMute: true
    });

    const receiver = conn.receiver;
    const files: string[] = [];

    receiver.speaking.on('start', (userId) => {
        // Decode via opusscript → PCM (s16le) → WAV wrapper
        const opus = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 }
        });
        const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });
        const wav = new (Wav as any).Writer({ sampleRate: 48000, channels: 1, bitDepth: 16 });
        const out = join(cfg.recordDir, `${Date.now()}-${userId}.wav`);
        const ws = createWriteStream(out);
        opus.pipe(decoder).pipe(wav).pipe(ws);
        ws.on('close', () => { files.push(out); logger.debug({ out }, 'chunk closed'); });
    });

    return { files, receiver, startedAt: Date.now() };
}

export function stopRecording(guildId: string) {
    const conn = getVoiceConnection(guildId);
    conn?.destroy();
}

export function getUserVoiceChannelId(guild: Guild, userId: string): string | null {
    const ch = guild.channels.cache.find(
        c => c.type === ChannelType.GuildVoice && c.members.has(userId)
    ) as VoiceBasedChannel | undefined;
    return ch?.id || null;
}