/**
 * Integração Brasil API - CNPJ
 * https://brasilapi.com.br/api/cnpj/v1/{cnpj}
 *
 * CPF: Consulta via API pública é restrita (LGPD).
 * Para CPF, use apenas validação + máscara. Serviços pagos existem (ex: Receita Federal via terceiros).
 */

export type CnpjApiResponse = {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  uf?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  descricao_situacao_cadastral?: string;
  data_inicio_atividade?: string;
};

const BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1";

/** Busca dados da empresa pelo CNPJ (Brasil API) */
export async function fetchCnpjData(cnpj: string): Promise<CnpjApiResponse | null> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`${BRASIL_API}/${digits}`);
    if (!res.ok) return null;
    return (await res.json()) as CnpjApiResponse;
  } catch {
    return null;
  }
}
