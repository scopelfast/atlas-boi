import { describe, it } from "node:test";
import { equal } from "node:assert/strict";
import {
  calcularReceitaOperacional,
  calcularValoresLiquidos,
  cobrancaLiquidaCliente,
} from "./financeiro-liquidos";

describe("financeiro-liquidos", () => {
  it("calcularValoresLiquidos aplica descontos", () => {
    const r = calcularValoresLiquidos({
      valorFreteCliente: 8664,
      valorComissaoTotal: 1000,
      descontoFreteCliente: 100,
      descontoComissaoTotal: 50,
    });
    equal(r.valorFreteLiquido, 8564);
    equal(r.valorComissaoLiquida, 950);
  });

  it("receita pré-apuração = frete líquido + extras", () => {
    const receita = calcularReceitaOperacional({
      valorFreteLiquido: 8564,
      lancamentos: [{ tipo: "OUTROS_CLIENTE", valor: 550 }],
    });
    equal(receita, 9114);
  });

  it("receita pós-apuração usa lançamentos de cobrança", () => {
    const receita = calcularReceitaOperacional({
      valorFreteLiquido: 8564,
      lancamentos: [
        { tipo: "FRETE_CLIENTE", valor: 8664 },
        { tipo: "OUTROS_CLIENTE", valor: 550 },
      ],
    });
    equal(receita, 9214);
  });

  it("cobrancaLiquidaCliente desconta abatimento", () => {
    const c = cobrancaLiquidaCliente([
      { tipo: "FRETE_CLIENTE", valor: 1000 },
      { tipo: "ABATIMENTO_FRETE_CLIENTE", valor: 200 },
    ]);
    equal(c.liquido, 800);
  });
});
