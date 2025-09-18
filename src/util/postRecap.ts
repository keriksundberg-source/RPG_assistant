// utils/postRecap.ts
import { TextChannel, EmbedBuilder } from "discord.js";

const CONTENT_LIMIT = 2000;
const EMBED_DESC_LIMIT = 4096;
const EMBED_TOTAL_LIMIT = 6000; // across all embeds in one message
const EMBEDS_PER_MESSAGE = 10;

function splitSmart(text: string, max: number): string[] {
  const parts: string[] = [];
  let buf = "";
  const paras = text.split(/\n{2,}/); // try to break on paragraphs first
  for (const p of paras) {
    const add = (buf ? "\n\n" : "") + p;
    if ((buf + add).length > max) {
      if (buf) parts.push(buf);
      if (p.length > max) {
        // hard-split very long paragraphs
        for (let i = 0; i < p.length; i += max) {
          parts.push(p.slice(i, i + max));
        }
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf += add;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

export async function postRecapSmart(
  channel: TextChannel,
  title: string,
  body: string
) {
  if (body.length <= CONTENT_LIMIT) {
    await channel.send({ content: body });
    return;
  }

  // Try embeds (bigger per message, nicer formatting)
  const chunks = splitSmart(body, EMBED_DESC_LIMIT);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  if (chunks.length <= EMBEDS_PER_MESSAGE && total <= EMBED_TOTAL_LIMIT) {
    const embeds = chunks.map((c, i) => {
      const embed = new EmbedBuilder().setDescription(c);
      if (i === 0) embed.setTitle(title);
      return embed;
    });
    await channel.send({ embeds });
    return;
  }

  // Fallback: attach full text as a file
  const name = `recap-${new Date().toISOString().slice(0, 10)}.md`;
  await channel.send({
    content: `**${title}** — full text attached.`,
    files: [{ attachment: Buffer.from(`# ${title}\n\n${body}`, "utf8"), name }],
    allowedMentions: { parse: [] },
  });
}
