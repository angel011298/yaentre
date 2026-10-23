/**
 * scripts/g102/app-shots.ts — Marca v1.0 (G102). Capturas de las pantallas
 * CON sesión (alumno en oscuro, tutor en claro) para revisar el logo y a
 * Chilo donde de verdad aparecen. Solo lee; mismo acceso que `verify:routes`.
 *
 *   G100_PROBE_PASSWORD=… G102_BASE=http://localhost:3000 G102_OUT=<carpeta> \
 *     pnpm exec tsx --tsconfig scripts/tsconfig.perf.json scripts/g102/app-shots.ts
 */
import '../g71/env';
import { chromium } from '@playwright/test';
import { freshSession, injectSession } from '../g100/lib';

const BASE = (process.env.G102_BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const OUT = process.env.G102_OUT ?? '.';

const SHOTS: { email: string; paths: string[] }[] = [
  { email: 'rlsprobe.alumnoa@acierta-test.mx', paths: ['/app', '/practicar', '/simulador', '/app/perfil', '/paywall'] },
  { email: 'rlsprobe.tutor@acierta-test.mx', paths: ['/tutor'] },
];

async function main() {
  const browser = await chromium.launch();
  const problems: string[] = [];
  for (const { email, paths } of SHOTS) {
    const session = await freshSession(email);
    for (const [label, viewport] of [
      ['m', { width: 390, height: 844 }],
      ['d', { width: 1280, height: 800 }],
    ] as const) {
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, timezoneId: 'America/Mexico_City' });
      await ctx.addInitScript(() => localStorage.setItem('yaentre-cookies-consent', 'false'));
      await injectSession(ctx, session, BASE);
      for (const path of paths) {
        const page = await ctx.newPage();
        page.on('pageerror', (e) => problems.push(`${path} ${label}: ${e.message}`));
        page.on('console', (m) => {
          if (m.type() === 'error' && !/posthog/i.test(m.text())) problems.push(`${path} ${label}: ${m.text()}`);
        });
        await page.goto(BASE + path, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) problems.push(`${path} ${label}: desborde horizontal de ${overflow}px`);
        await page.screenshot({ path: `${OUT}/app${path.replaceAll('/', '_')}-${label}.png`, fullPage: true });
        await page.close();
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(problems.length ? problems : 'sin errores ni desbordes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
