import { joinVoiceChannel, EndBehaviorType, VoiceReceiver, getVoiceConnection, DiscordGatewayAdapterCreator } from '@discordjs/voice';
import { ChannelType, Guild, VoiceBasedChannel } from 'discord.js';
import { createWriteStream, mkdirSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';
import { cfg } from './config.js';
import * as Prism from 'prism-media';
// Namespace import så CJS-exporter nås korrekt
const OpusNS = (Prism as any).opus as any;

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
        // Pass-through: kapsla Opus → OGG (ingen decoding krävs)
        const opus = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: 1500 }
        });
            const ogg = new OpusNS.OggLogicalBitstream({
            opusHead: new OpusNS.OpusHead({ channelCount: 1, sampleRate: 48000 }),
            pageSizeControl: { maxPackets: 10 },
        });
        const out = join(cfg.recordDir, `${Date.now()}-${userId}.ogg`);
        const ws = createWriteStream(out);
        opus.pipe(ogg).pipe(ws);
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