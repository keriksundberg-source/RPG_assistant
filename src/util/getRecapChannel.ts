import { TextChannel, Channel, ChannelType } from 'discord.js';

export async function getRecapChannel(client: any): Promise<TextChannel | null> {
  const key = process.env.RECAP_CHANNEL_ID || 'recap';

  // 1) Försök som ID
  try {
    const ch = await client.channels.fetch(key);
    if (ch && ch.type === ChannelType.GuildText) return ch as TextChannel;
  } catch {}

  // 2) Leta på alla guilds efter kanal med detta **namn**
  for (const [, guild] of client.guilds.cache) {
    const ch = guild.channels.cache.find((c: Channel) => c.type === ChannelType.GuildText && c.name === key);
    if (ch) return ch as TextChannel;
  }
  return null;
}