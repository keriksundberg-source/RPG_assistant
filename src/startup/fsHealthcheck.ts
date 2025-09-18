import fs from 'node:fs';
import path from 'node:path';

export function ensureRecordingDir() {
  const dir = process.env.RECORDING_DIR || '/app/recordings';
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `healthcheck-${Date.now()}.txt`);
  fs.writeFileSync(p, new Date().toISOString());
  console.log(`[fs] RECORDING_DIR=${dir}, wrote: ${p}`);
  return dir;
}