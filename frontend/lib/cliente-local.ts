export function labelClienteOption(c: {
  nome: string;
  logradouro?: string | null;
  cidade: string;
  uf: string;
}) {
  const local = c.logradouro?.trim() || `${c.cidade}/${c.uf}`;
  return `${c.nome} — ${local}`;
}
