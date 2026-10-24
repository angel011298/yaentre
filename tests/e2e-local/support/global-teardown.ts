import { existsSync, readFileSync } from 'node:fs';

/**
 * G103 — un error en el log del servidor es un rojo, aunque la pantalla se
 * haya visto bien. En Next, `⨯` marca lo que `onRequestError` (y Sentry, en
 * producción) recibe: una página que lanzó, una acción que reventó.
 */
export default function globalTeardown() {
  const problems: string[] = [];
  for (const port of ['3000', '3001']) {
    const file = `test-results/e2e-server-${port}.log`;
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/⨯|Unhandled Rejection|uncaughtException/.test(line)) problems.push(`:${port} ${line.trim()}\n    ${(lines[i + 1] ?? '').trim()}`);
    });
  }
  if (problems.length) {
    throw new Error(`El servidor registró ${problems.length} error(es) durante la suite:\n${problems.slice(0, 15).join('\n')}`);
  }
}
