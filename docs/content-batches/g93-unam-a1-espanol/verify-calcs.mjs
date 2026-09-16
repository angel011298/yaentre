// Verificación INDEPENDIENTE de las pocas afirmaciones "computables" del lote
// G93 (Español no tiene aritmética, pero sí reglas formales verificables por
// código: clasificación de acentuación, tilde diacrítica y orden lógico de un
// procedimiento). No lee el texto de los reactivos como verdad: recalcula
// cada regla desde cero y compara contra lo declarado.
//
// Uso: node verify-calcs.mjs

let failures = 0;
function assertEq(label, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? '✅' : '❌'} ${label}: obtenido=${JSON.stringify(actual)} esperado=${JSON.stringify(expected)}`);
  if (!ok) failures++;
}

// ── 1) Clasificación de acentuación (RAE) ──
// classify(word, stressedSyllableFromEnd, lastLetterCategory) -> { type, tildeRequired }
// lastLetterCategory: 'vowel' | 'n' | 's' | 'otherConsonant'
function classifyStress(stressedFromEnd, lastLetterCategory) {
  let type;
  if (stressedFromEnd === 1) type = 'aguda';
  else if (stressedFromEnd === 2) type = 'grave';
  else if (stressedFromEnd === 3) type = 'esdrujula';
  else type = 'sobresdrujula';

  let tildeRequired;
  if (type === 'esdrujula' || type === 'sobresdrujula') {
    tildeRequired = true; // siempre
  } else if (type === 'aguda') {
    tildeRequired = lastLetterCategory === 'vowel' || lastLetterCategory === 'n' || lastLetterCategory === 's';
  } else {
    // grave/llana
    tildeRequired = !(lastLetterCategory === 'vowel' || lastLetterCategory === 'n' || lastLetterCategory === 's');
  }
  return { type, tildeRequired };
}

console.log('── 1) Clasificación de acentuación (reactivo Ortografía #5) ──');
// matemáticas: ma-te-má-ti-cas (5 sílabas), tónica "má" = 3ª desde el final, termina en 's'
assertEq('matemáticas: tipo', classifyStress(3, 's').type, 'esdrujula');
assertEq('matemáticas: requiere tilde', classifyStress(3, 's').tildeRequired, true);
// camisa: ca-mi-sa (3 sílabas), tónica "mi" = 2ª desde el final (penúltima), termina en vocal 'a'
assertEq('camisa: tipo', classifyStress(2, 'vowel').type, 'grave');
assertEq('camisa: requiere tilde', classifyStress(2, 'vowel').tildeRequired, false);
// camión: ca-mión (2 sílabas), tónica "mión" = 1ª desde el final (última), termina en 'n'
assertEq('camión: tipo', classifyStress(1, 'n').type, 'aguda');
assertEq('camión: requiere tilde', classifyStress(1, 'n').tildeRequired, true);
// reloj: re-loj (2 sílabas), tónica "loj" = 1ª desde el final (última), termina en 'j' (otra consonante)
assertEq('reloj: tipo', classifyStress(1, 'otherConsonant').type, 'aguda');
assertEq('reloj: requiere tilde', classifyStress(1, 'otherConsonant').tildeRequired, false);

// ── 2) Tilde diacrítica: función gramatical -> ¿lleva tilde? ──
// Regla: pronombre personal (sujeto) -> tilde; determinante (artículo/posesivo) antepuesto a sustantivo -> sin tilde.
function diacriticTilde(role) {
  return role === 'pronoun';
}
console.log('\n── 2) Tilde diacrítica (reactivos Ortografía #1 y #2) ──');
assertEq('"Él" (pronombre, sujeto de "llegó") lleva tilde', diacriticTilde('pronoun'), true);
assertEq('"el" (artículo ante "resto") NO lleva tilde', diacriticTilde('determiner'), false);
assertEq('"Tú" (pronombre, sujeto de "olvidas") lleva tilde', diacriticTilde('pronoun'), true);
assertEq('"tu" (posesivo ante "mochila") NO lleva tilde', diacriticTilde('determiner'), false);

// ── 3) Orden lógico del procedimiento de plantar un árbol (reactivo Redacción #9) ──
// Pasos: 1=rellenar, 2=cavar, 3=regar, 4=colocar. Restricciones de precedencia:
const CONSTRAINTS = [
  [2, 4], // cavar antes de colocar
  [4, 1], // colocar antes de rellenar
  [1, 3], // rellenar antes de regar
];
function satisfiesConstraints(sequence) {
  const pos = new Map(sequence.map((step, i) => [step, i]));
  return CONSTRAINTS.every(([before, after]) => pos.get(before) < pos.get(after));
}
const CANDIDATE_ORDERS = {
  correcta_cavar_colocar_rellenar_regar: [2, 4, 1, 3],
  distractor_colocar_cavar_regar_rellenar: [4, 2, 3, 1],
  distractor_regar_cavar_colocar_rellenar: [3, 2, 4, 1],
  distractor_rellenar_colocar_cavar_regar: [1, 4, 2, 3],
};
console.log('\n── 3) Orden lógico del procedimiento (reactivo Redacción #9) ──');
let validCount = 0;
for (const [name, seq] of Object.entries(CANDIDATE_ORDERS)) {
  const valid = satisfiesConstraints(seq);
  console.log(`${valid ? '✅' : '  '} ${name}: secuencia=${JSON.stringify(seq)} cumple restricciones=${valid}`);
  if (valid) validCount++;
}
assertEq('exactamente UNA secuencia cumple las 3 restricciones', validCount, 1);
assertEq('la secuencia válida es la declarada correcta', satisfiesConstraints(CANDIDATE_ORDERS.correcta_cavar_colocar_rellenar_regar), true);

console.log('\n' + '─'.repeat(60));
if (failures > 0) {
  console.error(`❌ ${failures} verificación(es) fallida(s).`);
  process.exit(1);
} else {
  console.log('✅ Todas las verificaciones computables pasaron.');
}
