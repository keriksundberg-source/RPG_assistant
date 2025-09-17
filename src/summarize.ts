import OpenAI from 'openai';
import { createReadStream } from 'node:fs';
import { cfg } from './config.js';


const client = new OpenAI({ apiKey: cfg.openai.apiKey });


export async function transcribe(wavPath: string, language = cfg.languageHint): Promise<string> {
// Whisper works well for Swedish. You can omit language to auto-detect.
const res = await client.audio.transcriptions.create({
model: cfg.openai.transcriptionModel,
file: createReadStream(wavPath),
language
});
return (res as any).text ?? '';
}


export async function summarizeForWFRP(transcript: string): Promise<string> {
const prompt = `Du är en spelmötessekreterare för Warhammer Fantasy Roleplay.
Skapa en recap på svenska med rubriker:
- Kort sammanfattning (5–8 meningar)
- Viktiga händelser (punktlista)
- NPC:er & platser (med korta notiser)
- Olösta trådar & cliffhangers
- Förslag till nästa session (3–5 punkter)
Var tydlig, korrekt och spelklar. Använd namn och platser konsekvent.
Här är transkriptet:\n"""${transcript}"""`;


const res = await client.responses.create({
model: cfg.openai.textModel,
input: prompt
});
// SDK v4 convenience:
// @ts-ignore
return res.output_text as string;
}