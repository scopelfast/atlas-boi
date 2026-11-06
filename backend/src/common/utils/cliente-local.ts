/** Chave do local de embarque/desembarque — mesmo CPF/CNPJ pode ter vários locais. */
export function buildLocalChave(input: {
  codigoIbge?: string | null;
  cidade: string;
  uf: string;
  logradouro?: string | null;
}): string {
  const ibge = input.codigoIbge?.trim();
  if (ibge) return `IBGE:${ibge}`;

  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 40);

  const uf = (input.uf || "NA").trim().toUpperCase().slice(0, 2);
  const cidade = norm(input.cidade || "NAOCIDADE");
  const log = input.logradouro?.trim() ? norm(input.logradouro) : "GERAL";
  return `LOC:${uf}-${cidade}-${log}`;
}

export function labelLocalCliente(input: {
  nome: string;
  logradouro?: string | null;
  cidade: string;
  uf: string;
}): string {
  const local = input.logradouro?.trim() || `${input.cidade}/${input.uf}`;
  return `${input.nome} — ${local}`;
}
