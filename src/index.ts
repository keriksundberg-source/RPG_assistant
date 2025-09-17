import { Client, GatewayIntentBits, ChannelType, TextBasedChannel } from 'discord.js';
import { cfg } from './config.js';
import { logger } from './logger.js';
import { registerCommands } from './commands.js';
import { getUserVoiceChannelId, startRecording, stopRecording, ActiveRecording } from './recorder.js';
import { concatPcmToWav, cleanup } from './ffmpeg.js';
import { summarizeForWFRP, transcribe } from './summarize.js';
import { PRIVACY_TEXT } from './privacy.js';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
let active: ActiveRecording | null = null;


client.once('ready', async () => {
await registerCommands(cfg.discordToken, client.user!.id);
if (!existsSync(cfg.recordDir)) mkdirSync(cfg.recordDir, { recursive: true });
logger.info({ user: client.user?.tag }, 'Bot ready');
});


client.on('interactionCreate', async (i) => {
if (!i.isChatInputCommand()) return;
if (cfg.allowedGuildId && i.guildId !== cfg.allowedGuildId) {
return i.reply({ ephemeral: true, content: 'Den här servern är inte tillåten för boten.' });
}


if (i.commandName === 'privacy') {
return i.reply({ ephemeral: true, content: PRIVACY_TEXT });
}


if (i.commandName === 'start-rec') {
const vcId = i.guild ? getUserVoiceChannelId(i.guild, i.user.id) : null;
if (!vcId) return i.reply('Du måste vara i en röstkanal.');
if (active) return i.reply('Redan inspelning pågår.');


await i.reply('🎙️ **Inspelning påbörjad.** Genom att stanna kvar samtycker du till inspelning & transkribering för spelrecap.');
active = await startRecording(i.guild!, vcId);
}


if (i.commandName === 'stop-rec') {
if (!active) return i.reply('Ingen inspelning pågår.');
await i.reply('⏹️ Inspelning stoppad. Transkriberar och sammanfattar …');
stopRecording(i.guildId!);


try {
const out = join(cfg.recordDir, `${Date.now()}-merged.wav`);
await concatPcmToWav(active.files, out);


const text = await transcribe(out);
const recap = await summarizeForWFRP(text);


const channel = i.guild!.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === cfg.recapChannelName) as TextBasedChannel | undefined;
const target = (channel || i.channel!);
await target.send(`## 🎲 Session Recap\n${recap}`);


await cleanup([out, ...active.files]);
active = null;
} catch (err) {
active = null;
logger.error(err, 'Post-processing failed');
await i.followUp('Något gick fel vid transkribering/sammanfattning. Kolla loggarna.');
}
}
});


client.login(cfg.discordToken);