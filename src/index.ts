import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
// Type guard for TextChannel
function isTextChannel(ch: any): ch is TextChannel {
  return ch && ch.type === ChannelType.GuildText;
}
import type { TextBasedChannel } from 'discord.js';

function hasSend(ch: unknown): ch is { send: (content: any) => any } {
  return !!ch && typeof (ch as any).send === 'function';
}
import { cfg } from './config.js';
import { logger } from './logger.js';
import { registerCommands } from './commands.js';
import { getUserVoiceChannelId, startRecording, stopRecording, ActiveRecording } from './recorder.js';
import { concatPcmToWav, cleanup } from './ffmpeg.js';
import { summarizeForWFRP, transcribe } from './summarize.js';
import { PRIVACY_TEXT } from './privacy.js';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { postRecapSmart } from './util/postRecap.js';


const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildVoiceStates
  ] });
let active: ActiveRecording | null = null;

client.once('ready', async () => {
  await registerCommands(cfg.discordToken, client.user!.id);
  if (!existsSync(cfg.recordDir)) 
    mkdirSync(cfg.recordDir, { recursive: true });
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

      let target: TextChannel | null = null;
      if (i.guild) {
        const candidate = i.guild.channels.cache.find(
          c => c.type === ChannelType.GuildText && c.name === cfg.recapChannelName
        );
        target = isTextChannel(candidate)
          ? candidate
          : (isTextChannel(i.channel) ? i.channel : null);
      } else {
        target = isTextChannel(i.channel) ? i.channel : null;
      }

      if (target) {
        // 🔹 Använd helpern – den chunkar, använder embeds eller bifogar fil vid behov
        await postRecapSmart(target, '🎲 Session Recap', recap);
      } else {
        // 🔻 Sista utvägen: skicka som fil via followUp om vi inte hittar en textkanal
        const name = `recap-${new Date().toISOString().slice(0,19).replace(/[ :T]/g,'-')}.md`;
        await i.followUp({
          content: '**🎲 Session Recap** — full text attached.',
          files: [{ attachment: Buffer.from(`# 🎲 Session Recap\n\n${recap}`, 'utf8'), name }],
          allowedMentions: { parse: [] },
        });
      }

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