// Writes the Cookie header on the clipboard (macOS pbpaste) into KUMPARAN_COOKIE in .env, without printing it.
// Usage: copy the `cookie` request header value in DevTools, then `npm run auth:cookie && npm run auth:import`.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const value = execSync('pbpaste').toString().trim().replace(/^cookie:\s*/i, '').replace(/[\r\n]+/g, '');
if (!/^[^=;\s]+=/.test(value) || value.includes("'")) {
  console.error('Clipboard does not look like a Cookie header (name=value; name2=value2). Nothing written.');
  process.exit(1);
}
const lines = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8').split('\n').filter((l) => l && !l.startsWith('KUMPARAN_COOKIE=')) : [];
lines.push(`KUMPARAN_COOKIE='${value}'`);
fs.writeFileSync('.env', `${lines.join('\n')}\n`);
console.log(`KUMPARAN_COOKIE updated in .env (${value.split(';').length} cookies).`);
