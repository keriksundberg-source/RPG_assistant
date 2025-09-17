import ffmpeg from 'fluent-ffmpeg';
import { writeFileSync } from 'node:fs';
import { unlink, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';


export async function concatPcmToWav(chunks: string[], outWav: string) {
// Create a concat list for ffmpeg
const listPath = join(dirname(outWav), `concat-${Date.now()}.txt`);
writeFileSync(listPath, chunks.map(f => `file '${f}'`).join('\n'));
await new Promise<void>((resolve, reject) => {
ffmpeg()
.input(listPath)
.inputOptions(['-f concat', '-safe 0'])
.outputOptions(['-ar 16000', '-ac 1'])
.on('end', resolve)
.on('error', reject)
.save(outWav);
});
// Clean temp list; caller may clean raw chunks later
await unlink(listPath).catch(() => {});
}


export async function cleanup(files: string[]) {
await Promise.all(files.map(f => rm(f).catch(() => {})));
}