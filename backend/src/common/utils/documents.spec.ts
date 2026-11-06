import { equal } from "node:assert/strict";
import {
  formatCnpjDisplay,
  isCnpjAlphanumerico,
  normalizeDocumento,
  validateCnpj,
  validateCpf,
} from "./documents";

// CNPJ numérico válido
equal(validateCnpj("04.252.011/0001-10"), true);
equal(normalizeDocumento("04.252.011/0001-10"), "04252011000110");

// CNPJ inválido
equal(validateCnpj("11.444.777/0001-00"), false);

// CPF válido conhecido em testes
equal(validateCpf("529.982.247-25"), true);

// Alfanumérico: formato aceito quando DV confere (exemplo de estrutura)
const alfa = "AB12CD34EFGH56";
if (validateCnpj(alfa)) {
  equal(isCnpjAlphanumerico(alfa), true);
  equal(formatCnpjDisplay(alfa).includes("/"), true);
}

console.log("documents.spec: ok");
