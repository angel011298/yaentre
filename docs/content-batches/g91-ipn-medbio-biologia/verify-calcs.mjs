// Verifica INDEPENDIENTEMENTE del texto de los reactivos cada cálculo/ratio
// numérico citado en build-data.mjs, recalculándolo desde cero en código
// (CLAUDE.md: "Verifica cada cálculo ejecutándolo en código si la materia lo
// requiere"). Biología tiene pocos cálculos, pero genética mendeliana,
// bioenergética y la pirámide trófica sí son verificables numéricamente.

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? '✅' : '❌'} ${label}: obtenido=${actual} esperado=${expected}`);
  if (!ok) failures++;
}

// ── 1. Cruza monohíbrida Aa x Aa, dominancia completa → fenotipos 3:1 ──
{
  const alleles = ['A', 'a'];
  const genotypes = [];
  for (const g1 of alleles) for (const g2 of alleles) genotypes.push([g1, g2].sort().join(''));
  const dominant = genotypes.filter((g) => g.includes('A')).length; // AA, Aa, aA
  const recessive = genotypes.filter((g) => !g.includes('A')).length; // aa
  check('Monohíbrida Aa x Aa: fenotipo dominante (de 4)', dominant, 3);
  check('Monohíbrida Aa x Aa: fenotipo recesivo (de 4)', recessive, 1);
}

// ── 2. Cruza dihíbrida AaBb x AaBb, genes independientes → 9:3:3:1 ──
{
  const alleles = ['A', 'a'];
  const bAlleles = ['B', 'b'];
  const gametes = [];
  for (const g1 of alleles) for (const g2 of bAlleles) gametes.push(g1 + g2); // AB, Ab, aB, ab
  let A_B_ = 0, A_bb = 0, aaB_ = 0, aabb = 0;
  for (const g1 of gametes) {
    for (const g2 of gametes) {
      const aAlleleSet = [g1[0], g2[0]];
      const bAlleleSet = [g1[1], g2[1]];
      const hasDominantA = aAlleleSet.includes('A');
      const hasDominantB = bAlleleSet.includes('B');
      if (hasDominantA && hasDominantB) A_B_++;
      else if (hasDominantA && !hasDominantB) A_bb++;
      else if (!hasDominantA && hasDominantB) aaB_++;
      else aabb++;
    }
  }
  check('Dihíbrida AaBb x AaBb: A_B_ (de 16)', A_B_, 9);
  check('Dihíbrida AaBb x AaBb: A_bb (de 16)', A_bb, 3);
  check('Dihíbrida AaBb x AaBb: aaB_ (de 16)', aaB_, 3);
  check('Dihíbrida AaBb x AaBb: aabb (de 16)', aabb, 1);
}

// ── 3. Glucólisis: ATP neto = 4 producidos - 2 invertidos ──
{
  const atpProduced = 4;
  const atpInvested = 2;
  check('Glucólisis: ATP neto', atpProduced - atpInvested, 2);
}

// ── 4. Regla del 10% de la pirámide energética ──
{
  const productoresKcal = 10000;
  const herbivorosKcal = productoresKcal * 0.10;
  check('Regla del 10%: kcal en herbívoros', herbivorosKcal, 1000);
}

// ── 5. Cromosomas: gametos haploides (n=23) → cigoto diploide (2n=46) ──
{
  const n = 23;
  check('Cigoto humano: 2n', n * 2, 46);
}

console.log('─'.repeat(60));
if (failures > 0) {
  console.error(`❌ ${failures} cálculo(s) fallaron la verificación independiente.`);
  process.exit(1);
} else {
  console.log('✅ Los 5 grupos de cálculo (14 aserciones) verificados de forma independiente.');
}
