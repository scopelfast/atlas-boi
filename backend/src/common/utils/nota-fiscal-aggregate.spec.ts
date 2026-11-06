import { describe, it } from "node:test";
import { equal } from "node:assert/strict";
import { agregarNotasFiscais, notasParaContabilizacao } from "./nota-fiscal-aggregate";

describe("nota-fiscal-aggregate", () => {
  it("soma só notas PRINCIPAL", () => {
    const notas = [
      { papel: "PRINCIPAL", quantidadeAnimais: 54, valorTotal: 100000 },
      { papel: "TROCA", quantidadeAnimais: 54, valorTotal: 100000 },
    ];
    const agg = agregarNotasFiscais(notas);
    equal(agg.quantidadeAnimais, 54);
    equal(agg.valorCarga, 100000);
    equal(agg.troca, 1);
    equal(notasParaContabilizacao(notas).length, 1);
  });

  it("default papel é PRINCIPAL", () => {
    const agg = agregarNotasFiscais([{ quantidadeAnimais: 10, valorTotal: 500 }]);
    equal(agg.quantidadeAnimais, 10);
    equal(agg.valorCarga, 500);
  });
});
