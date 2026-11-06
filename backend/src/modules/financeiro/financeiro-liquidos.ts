/** Cálculo de frete/comissão/margem líquidos após descontos. */
export function calcularValoresLiquidos(input: {
  valorFreteCliente?: number | null;
  valorComissaoTotal?: number | null;
  valorPedagio?: number | null;
  valorBalanca?: number | null;
  descontoFreteCliente?: number | null;
  descontoComissaoTotal?: number | null;
}) {
  const frete = Number(input.valorFreteCliente ?? 0);
  const comissao = Number(input.valorComissaoTotal ?? 0);
  const ped = Number(input.valorPedagio ?? 0);
  const bal = Number(input.valorBalanca ?? 0);
  const df = Math.max(0, Number(input.descontoFreteCliente ?? 0));
  const dc = Math.max(0, Number(input.descontoComissaoTotal ?? 0));

  const valorFreteLiquido = Math.max(0, frete - df);
  const valorComissaoLiquida = Math.max(0, comissao - dc);
  const margemLiquida = valorFreteLiquido - valorComissaoLiquida - ped - bal;

  return {
    descontoFreteCliente: df || null,
    valorFreteLiquido: frete > 0 || df > 0 ? valorFreteLiquido : null,
    valorComissaoLiquida: comissao > 0 || dc > 0 ? valorComissaoLiquida : null,
    margemLiquida: frete > 0 || comissao > 0 ? margemLiquida : null,
  };
}

export function somaDescontosComissaoMotoristas(
  motoristas: { descontoComissao?: unknown }[]
) {
  return motoristas.reduce((s, m) => s + Math.max(0, Number(m.descontoComissao ?? 0)), 0);
}

export type TotaisCcMotorista = {
  adiantamentos: number;
  despesas: number;
  reembolsos: number;
  comissoes: number;
  acertos: number;
  descontosComissao: number;
  prestacoes: number;
};

/** Agrega lançamentos da conta corrente do motorista por tipo. */
export function agregarCcMotorista(lancamentos: { tipo: string; valor: unknown }[]): TotaisCcMotorista {
  const totais: TotaisCcMotorista = {
    adiantamentos: 0,
    despesas: 0,
    reembolsos: 0,
    comissoes: 0,
    acertos: 0,
    descontosComissao: 0,
    prestacoes: 0,
  };

  for (const l of lancamentos) {
    const v = Math.max(0, Number(l.valor ?? 0));
    switch (l.tipo) {
      case "ADIANTAMENTO":
        totais.adiantamentos += v;
        break;
      case "DESPESA_MOTORISTA":
        totais.despesas += v;
        break;
      case "REEMBOLSO_MOTORISTA":
        totais.reembolsos += v;
        break;
      case "COMISSAO_MOTORISTA":
        totais.comissoes += v;
        break;
      case "DESCONTO_COMISSAO_MOTORISTA":
        totais.descontosComissao += v;
        break;
      case "ACERTO_MOTORISTA":
        totais.acertos += v;
        break;
      case "PRESTACAO_CONTAS":
        totais.prestacoes += v;
        break;
    }
  }

  return totais;
}

/**
 * Saldo a pagar/receber na CC motorista.
 * Adiantamento já foi entregue ao motorista (reduz o acerto); despesas de viagem são reembolsadas.
 */
export function calcularSaldoCcMotorista(totais: TotaisCcMotorista) {
  const {
    adiantamentos,
    despesas,
    reembolsos,
    comissoes,
    acertos,
    descontosComissao,
    prestacoes,
  } = totais;

  const reembolsoDespesas = Math.max(0, despesas - adiantamentos) + reembolsos;
  const devolucaoAdiantamento = Math.max(0, adiantamentos - despesas);

  const saldo =
    comissoes + reembolsoDespesas - devolucaoAdiantamento - acertos - descontosComissao - prestacoes;

  return { saldo, reembolsoDespesas, devolucaoAdiantamento };
}

export function somaComissaoLancamentos(
  lancamentos: { tipo: string; valor: unknown }[]
) {
  let total = 0;
  for (const l of lancamentos) {
    const v = Number(l.valor ?? 0);
    if (l.tipo === "COMISSAO_MOTORISTA") total += v;
    else if (l.tipo === "DESCONTO_COMISSAO_MOTORISTA") total -= v;
  }
  return Math.max(0, total);
}

/** Separa custos de veículo espelhados da viagem vs. pagos direto pela empresa. */
export function classificarCustosVeiculo(
  lancamentos: { valor: unknown; observacoes?: string | null }[]
) {
  let espelho = 0;
  let direto = 0;
  for (const l of lancamentos) {
    const v = Number(l.valor ?? 0);
    const obs = (l.observacoes ?? "").toLowerCase();
    if (obs.includes("espelho")) espelho += v;
    else direto += v;
  }
  return { espelho, direto };
}

const TIPOS_COBRANCA_CLIENTE_KEYS = [
  "FRETE_CLIENTE",
  "PEDAGIO_CLIENTE",
  "BALANCA_CLIENTE",
  "OUTROS_CLIENTE",
] as const;

/** Cobrança líquida do cliente = frete + pedágio + balança + outros − abatimentos. */
export function cobrancaLiquidaCliente(lancamentos: { tipo: string; valor: unknown }[]) {
  let bruto = 0;
  let abatimento = 0;
  for (const l of lancamentos) {
    const v = Number(l.valor ?? 0);
    if (TIPOS_COBRANCA_CLIENTE_KEYS.includes(l.tipo as (typeof TIPOS_COBRANCA_CLIENTE_KEYS)[number])) {
      bruto += v;
    } else if (l.tipo === "ABATIMENTO_FRETE_CLIENTE") {
      abatimento += v;
    }
  }
  return { bruto, abatimento, liquido: Math.max(0, bruto - abatimento) };
}

/**
 * Receita operacional da viagem (DRE).
 * Pré-apuração: frete contratual líquido + cobranças extras já lançadas (ex.: seguro).
 * Pós-apuração: soma dos lançamentos de cobrança ao cliente.
 */
export function calcularReceitaOperacional(input: {
  valorFreteLiquido?: number | null;
  lancamentos: { tipo: string; valor: unknown }[];
}) {
  const freteLiquido = Math.max(0, Number(input.valorFreteLiquido ?? 0));
  const cobranca = cobrancaLiquidaCliente(input.lancamentos);

  const temFreteApurado = input.lancamentos.some(
    (l) => l.tipo === "FRETE_CLIENTE" && Number(l.valor ?? 0) > 0
  );

  if (temFreteApurado) {
    if (cobranca.liquido > 0) return cobranca.liquido;
    return freteLiquido > 0 ? freteLiquido : null;
  }

  const receita = Math.max(0, freteLiquido + cobranca.bruto - cobranca.abatimento);
  if (receita > 0) return receita;
  return freteLiquido > 0 ? freteLiquido : null;
}

/** Resultado real da viagem: receita − comissão − despesas CC motorista − custo veículo direto. */
export function calcularMargemOperacional(input: {
  valorReceitaLiquida?: number | null;
  valorFreteLiquido?: number | null;
  valorFreteCliente?: number | null;
  valorComissaoLiquida?: number | null;
  valorComissaoTotal?: number | null;
  custoDespesasViagem?: number | null;
  custoVeiculoDireto?: number | null;
}) {
  const receita = Number(
    input.valorReceitaLiquida ?? input.valorFreteLiquido ?? input.valorFreteCliente ?? 0
  );
  const comissao = Number(input.valorComissaoLiquida ?? input.valorComissaoTotal ?? 0);
  const despesas = Math.max(0, Number(input.custoDespesasViagem ?? 0));
  const veiculoDireto = Math.max(0, Number(input.custoVeiculoDireto ?? 0));
  const margem = receita - comissao - despesas - veiculoDireto;

  const temDados = receita > 0 || comissao > 0 || despesas > 0 || veiculoDireto > 0;

  return {
    custoDespesasViagem: despesas || null,
    custoVeiculoDireto: veiculoDireto || null,
    margemOperacional: temDados ? margem : null,
  };
}
