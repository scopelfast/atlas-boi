import { equal } from "node:assert/strict";

/** Espelha os padrões do template animais-transito em query-brain.service.ts */
const ANIMAIS_PATTERNS = [/animais?/i, /cabe[cç]as?/i, /gado/i, /quantos.*em\s+tr[aâ]nsito/i];

function matchesAnimais(q: string) {
  return ANIMAIS_PATTERNS.some((p) => p.test(q));
}

equal(matchesAnimais("Quantos animais estão em trânsito?"), true);
equal(matchesAnimais("quantos animais em transito"), true);
equal(matchesAnimais("cabeças no caminhão"), true);
equal(matchesAnimais("Quantos carregamentos ativos temos?"), false);

console.log("query-brain.patterns.spec: ok");
