import { createHash } from "crypto";
import { XMLParser } from "fast-xml-parser";

export type NfeEndereco = {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigoIbge: string | null;
};

export type NfeParsedData = {
  chave: string | null;
  numero: string | null;
  serie: string | null;
  valorTotal: number | null;
  emitenteCnpj: string | null;
  emitenteNome: string | null;
  emitenteFantasia: string | null;
  emitenteEndereco: NfeEndereco | null;
  destinatarioCnpj: string | null;
  destinatarioNome: string | null;
  destinatarioFantasia: string | null;
  destinatarioEndereco: NfeEndereco | null;
  dataEmissao: string | null;
  quantidadeAnimais: number | null;
  produtoDescricao: string | null;
  numeroGta: string | null;
  gtaUf: string | null;
  gtaVencimento: string | null;
  xmlHash: string;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function pickText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && node !== null && "#text" in node) {
    return String((node as { "#text": string })["#text"]);
  }
  return null;
}

function pickEndereco(
  participante: Record<string, unknown> | undefined,
  enderecoKey: "enderEmit" | "enderDest"
): NfeEndereco | null {
  const ender = participante?.[enderecoKey] as Record<string, unknown> | undefined;
  if (!ender) return null;
  const cidade = pickText(ender.xMun);
  const uf = pickText(ender.UF);
  if (!cidade && !uf) return null;
  return {
    cep: pickText(ender.CEP),
    logradouro: pickText(ender.xLgr),
    numero: pickText(ender.nro),
    complemento: pickText(ender.xCpl),
    bairro: pickText(ender.xBairro),
    cidade,
    uf,
    codigoIbge: pickText(ender.cMun),
  };
}

function pickDoc(participante: Record<string, unknown> | undefined): string | null {
  if (!participante) return null;
  const cnpj = pickText(participante.CNPJ);
  if (cnpj != null) {
    const digits = cnpj.replace(/\D/g, "");
    // XML parser pode converter CNPJ numérico e remover zero à esquerda (ex.: 02916… → 2916…)
    if (digits.length > 0 && digits.length < 14) return digits.padStart(14, "0");
    return digits.slice(0, 14);
  }
  const cpf = pickText(participante.CPF);
  if (cpf == null) return null;
  const digits = cpf.replace(/\D/g, "");
  return digits.length > 0 && digits.length < 11 ? digits.padStart(11, "0") : digits;
}

function extractChave(infNFe: Record<string, unknown>): string | null {
  const id = pickText(infNFe["@_Id"]);
  if (id?.startsWith("NFe")) return id.slice(3);
  return id;
}

function sumQuantidadeProdutos(detNodes: Record<string, unknown>[]): number | null {
  let total = 0;
  let found = false;
  for (const det of detNodes) {
    const prod = det.prod as Record<string, unknown> | undefined;
    if (!prod) continue;
    const qCom = pickText(prod.qCom);
    if (qCom != null) {
      const n = parseFloat(qCom.replace(",", "."));
      if (Number.isFinite(n)) {
        total += n;
        found = true;
      }
    }
  }
  return found ? Math.round(total) : null;
}

function firstProdutoDescricao(detNodes: Record<string, unknown>[]): string | null {
  for (const det of detNodes) {
    const prod = det.prod as Record<string, unknown> | undefined;
    const desc = pickText(prod?.xProd);
    if (desc) return desc;
  }
  return null;
}

function normalizeObsCampo(campo: string): string {
  return campo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseInfAdicObs(infAdic: Record<string, unknown> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!infAdic) return map;
  for (const obs of asArray(infAdic.obsCont as Record<string, unknown> | Record<string, unknown>[])) {
    const campo = pickText(obs.xCampo);
    const texto = pickText(obs.xTexto);
    if (campo && texto) map.set(normalizeObsCampo(campo), texto.trim());
  }
  return map;
}

function pickObs(obs: Map<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = obs.get(normalizeObsCampo(key));
    if (v) return v;
  }
  for (const [k, v] of obs) {
    for (const key of keys) {
      const nk = normalizeObsCampo(key);
      if (k.includes(nk) || nk.includes(k)) return v;
    }
  }
  return null;
}

function extractGtaFromNfe(
  infNFe: Record<string, unknown>,
  emit: Record<string, unknown> | undefined
): { numeroGta: string | null; gtaUf: string | null; gtaVencimento: string | null } {
  const obs = parseInfAdicObs(infNFe.infAdic as Record<string, unknown> | undefined);

  const numeroGta =
    pickObs(obs, "NUMERO GTA", "Nº GTA", "N GTA", "GTA", "NUM GTA") ??
    pickObs(obs, "NUMERO DA GTA", "N GTA EMITIDA");

  const gtaVencimento =
    pickObs(obs, "VENCIMENTO GTA", "VALIDADE GTA", "VENC GTA", "DATA VENCIMENTO GTA") ?? null;

  const avulsa = infNFe.avulsa as Record<string, unknown> | undefined;
  const ufObs = pickObs(obs, "UF GTA", "UF EMISSORA GTA", "UF EMISSORA");
  const ufEmit = pickEndereco(emit, "enderEmit")?.uf;
  const gtaUf = (ufObs ?? pickText(avulsa?.UF) ?? ufEmit)?.toUpperCase().slice(0, 2) ?? null;

  return { numeroGta, gtaUf, gtaVencimento };
}

export function normalizeDocumento(doc: string | null | undefined): string {
  return (doc ?? "").replace(/\D/g, "");
}

export function hashNfeXml(xml: string): string {
  return createHash("sha256").update(xml.trim()).digest("hex");
}

export function parseNfeXml(xml: string): NfeParsedData {
  const trimmed = xml.trim();
  if (!trimmed.includes("<")) {
    throw new Error("Arquivo inválido — envie um XML de NF-e");
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
  });

  const doc = parser.parse(trimmed) as Record<string, unknown>;
  const nfeRoot =
    (doc.nfeProc as Record<string, unknown> | undefined)?.NFe ??
    doc.NFe ??
    doc;

  const nfe = (Array.isArray(nfeRoot) ? nfeRoot[0] : nfeRoot) as Record<string, unknown>;
  const infNFeRaw = nfe?.infNFe ?? nfe;
  const infNFe = (Array.isArray(infNFeRaw) ? infNFeRaw[0] : infNFeRaw) as Record<string, unknown>;

  if (!infNFe?.ide) {
    throw new Error("XML não reconhecido como NF-e (infNFe/ide ausente)");
  }

  const ide = infNFe.ide as Record<string, unknown>;
  const emit = infNFe.emit as Record<string, unknown> | undefined;
  const dest = infNFe.dest as Record<string, unknown> | undefined;
  const total = infNFe.total as Record<string, unknown> | undefined;
  const icmsTot = total?.ICMSTot as Record<string, unknown> | undefined;
  const detNodes = asArray(infNFe.det as Record<string, unknown> | Record<string, unknown>[]);

  const dhEmi = pickText(ide.dhEmi) ?? pickText(ide.dEmi);
  let dataEmissao: string | null = null;
  if (dhEmi) {
    const d = new Date(dhEmi.length === 10 ? `${dhEmi}T12:00:00` : dhEmi);
    if (!Number.isNaN(d.getTime())) dataEmissao = d.toISOString();
  }

  const valorRaw = pickText(icmsTot?.vNF);
  const valorTotal = valorRaw != null ? parseFloat(valorRaw.replace(",", ".")) : null;

  const gta = extractGtaFromNfe(infNFe, emit);

  return {
    chave: extractChave(infNFe),
    numero: pickText(ide.nNF),
    serie: pickText(ide.serie),
    valorTotal: valorTotal != null && Number.isFinite(valorTotal) ? valorTotal : null,
    emitenteCnpj: pickDoc(emit),
    emitenteNome: pickText(emit?.xNome),
    emitenteFantasia: pickText(emit?.xFant),
    emitenteEndereco: pickEndereco(emit, "enderEmit"),
    destinatarioCnpj: pickDoc(dest),
    destinatarioNome: pickText(dest?.xNome),
    destinatarioFantasia: pickText(dest?.xFant),
    destinatarioEndereco: pickEndereco(dest, "enderDest"),
    dataEmissao,
    quantidadeAnimais: sumQuantidadeProdutos(detNodes),
    produtoDescricao: firstProdutoDescricao(detNodes),
    numeroGta: gta.numeroGta,
    gtaUf: gta.gtaUf,
    gtaVencimento: gta.gtaVencimento,
    xmlHash: hashNfeXml(trimmed),
  };
}
