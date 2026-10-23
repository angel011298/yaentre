/**
 * scripts/g102/app-shots.ts — Marca v1.0 (G102). Capturas de las pantallas
 * CON sesión (alumno en oscuro, tutor en claro) para revisar el logo y a
 * Chilo donde de verdad aparecen. Solo lee; mismo acceso que `verify:routes`.
 *
 *   G100_PROBE_PASSWORD=… G102_BASE=https://yaentre.com G102_OUT=<carpeta> pnpm verify:brand
 *
 * Además de capturar, MIDE en el navegador el color del logo, de la hoodie de
 * Chilo y de la barra según el `data-theme` de cada pantalla, y falla si no
 * coinciden: así se detectó (tarde) el CSS viejo del primer despliegue de G102.
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
        // Colores MEDIDOS, no supuestos: el primer despliegue de G102 sirvió un
        // CSS sin los tokens (caché de build) y todo «funcionaba» —sin errores,
        // 62/62 en verify:routes— con el logo negro y la hoodie equivocada.
        // Sin funciones con nombre dentro de evaluate: tsx (esbuild con keepNames)
        // las envuelve en un `__name` que no existe en la página.
        const colors = await page.evaluate(() =>
          (
            [
              ['logo', 'svg path[mask]', 'fill'],
              ['hoodie', 'svg.chilo path[d^="M31 84"]', 'fill'],
              ['barra', '[style*="--logo-bar"]', 'backgroundColor'],
            ] as const
          ).flatMap(([what, selector, prop]) => {
            const el = document.querySelector(selector);
            if (!el) return [];
            const theme = el.closest('[data-theme]')?.getAttribute('data-theme') ?? 'dark';
            return [{ what, theme, fill: getComputedStyle(el)[prop] }];
          })
        );
        const EXPECTED: Record<string, Record<string, string>> = {
          logo: { dark: 'rgb(167, 139, 250)', light: 'rgb(124, 58, 237)' },
          hoodie: { dark: 'rgb(241, 232, 208)', light: 'rgb(30, 29, 36)' },
          barra: { dark: 'rgb(252, 151, 18)', light: 'rgb(252, 151, 18)' },
        };
        for (const c of colors) {
          const want = EXPECTED[c.what][c.theme];
          if (c.fill !== want) problems.push(`${path} ${label}: ${c.what} en ${c.theme} = ${c.fill}, se esperaba ${want}`);
        }
        if (colors.length === 0) problems.push(`${path} ${label}: ni logo ni Chilo que medir`);
        await page.screenshot({ path: `${OUT}/app${path.replaceAll('/', '_')}-${label}.png`, fullPage: true });
        await page.close();
      }
      await ctx.close();
    }
  }
  await browser.close();
  if (problems.length) {
    console.error(problems);
    process.exit(1);
  }
  console.log('sin errores, sin desbordes y con los colores de marca esperados');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
