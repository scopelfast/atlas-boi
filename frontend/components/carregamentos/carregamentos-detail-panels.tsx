"use client";

import type { RefObject } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  CrudDataPanel,
  CrudFormFooter,
  CRUD_SELECT_CLASS,
} from "@/components/crud/crud-panels";
import { RotaIncompletaAlert } from "@/components/rotas/rota-incompleta-alert";
import { CarregamentoPendenciasAlert } from "@/components/carregamentos/carregamento-pendencias-alert";
import { CarregamentoTimeline } from "@/components/carregamentos/carregamento-timeline";
import { CarregamentoNotasPanel } from "@/components/carregamentos/carregamento-notas-panel";
import { CarregamentoMinutaSection } from "@/components/carregamentos/carregamento-minuta-section";
import { CarregamentoFotosCargaSection } from "@/components/carregamentos/carregamento-fotos-carga-section";
import { CarregamentoNfeClientesPrompt } from "@/components/carregamentos/carregamento-nfe-clientes-prompt";
import { CarregamentoFinanceiroPanel } from "@/components/carregamentos/carregamento-financeiro-panel";
import { CarregamentoGtaSection } from "@/components/carregamentos/carregamento-gta-section";
import type { FinanceiroResumo } from "@/components/carregamentos/carregamento-financeiro-resumo";
import {
  carregamentosApi,
  type CarregamentoEvento,
  type CarregamentoNotaFiscal,
  type NotaFiscalPapel,
  type CarregamentoStatus,
  type Cliente,
  type Motorista,
  type NfeImportPreview,
  type Rota,
  type Veiculo,
} from "@/services/api";
import { labelTipoVeiculo } from "@/lib/carregamento-veiculos";
import { isRotaIncompleta } from "@/lib/rota-incompleta";
import { labelClienteOption } from "@/lib/cliente-local";
import { STATUS_LABEL, type CarregamentoFormState } from "@/components/carregamentos/carregamentos-shared";

export type CarregamentosDetailTab =
  | "programacao"
  | "resultado"
  | "notas"
  | "minuta"
  | "gta"
  | "timeline";

export type CarregamentosDetailPanelsProps = {
  tab: CarregamentosDetailTab;
  editing: string | null;
  form: CarregamentoFormState;
  setForm: React.Dispatch<React.SetStateAction<CarregamentoFormState>>;
  editingNumero: string | null;
  pendenciasForm: string[];
  pendingNfeParsed: NfeImportPreview["parsed"] | null;
  pendingNfeXml: string | null;
  nfeAutoFilled: { quantidade?: boolean; valorCarga?: boolean; gta?: boolean };
  setNfeAutoFilled: React.Dispatch<
    React.SetStateAction<{ quantidade?: boolean; valorCarga?: boolean; gta?: boolean }>
  >;
  rotas: Rota[];
  rotaSelecionada: Rota | undefined;
  rotaPreenchida: boolean;
  nfeRotaCriada: { codigo: string; descricao: string } | null;
  onRotaChange: (rotaId: string) => void;
  clientes: Cliente[];
  refsLoading: boolean;
  motoristas: Motorista[];
  veiculos: Veiculo[];
  kmSincronizadoRota: boolean;
  setKmSincronizadoRota: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  cancelForm: (resetForm: () => void) => void;
  resetForm: () => void;
  financas: FinanceiroResumo | null;
  motoristasFinancas: { id: string; nome: string }[];
  handleFinanceiroChange: () => Promise<void>;
  nfeClientesParaCadastrar: NfeImportPreview["clientesParaCadastrar"] | null;
  setNfeClientesParaCadastrar: React.Dispatch<
    React.SetStateAction<NfeImportPreview["clientesParaCadastrar"] | null>
  >;
  cadastrandoClientesNfe: boolean;
  handleCadastrarClientesNfe: (opts: {
    cadastrarOrigem: boolean;
    cadastrarDestino: boolean;
  }) => Promise<void>;
  notasFiscais: CarregamentoNotaFiscal[];
  importingNfe: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleRemoveNota: (notaId: string) => Promise<void>;
  handleUpdateNotaPapel: (notaId: string, papel: NotaFiscalPapel) => Promise<void>;
  removingNotaId: string | null;
  updatingPapelId: string | null;
  minutaFotoNome: string | null;
  hasMinutaFoto: boolean;
  pendingMinutaFile: File | null;
  setPendingMinutaFile: (f: File | null) => void;
  setHasMinutaFoto: (v: boolean) => void;
  setMinutaFotoNome: (v: string | null) => void;
  loadEventos: (id: string) => Promise<void>;
  eventos: CarregamentoEvento[];
  eventosLoading: boolean;
};

export function CarregamentosDetailPanel(props: CarregamentosDetailPanelsProps) {
  const {
    tab,
    editing,
    form,
    setForm,
    editingNumero,
    pendenciasForm,
    pendingNfeParsed,
    pendingNfeXml,
    nfeAutoFilled,
    setNfeAutoFilled,
    rotas,
    rotaSelecionada,
    rotaPreenchida,
    nfeRotaCriada,
    onRotaChange,
    clientes,
    refsLoading,
    motoristas,
    veiculos,
    kmSincronizadoRota,
    setKmSincronizadoRota,
    handleSubmit,
    cancelForm,
    resetForm,
    financas,
    motoristasFinancas,
    handleFinanceiroChange,
    nfeClientesParaCadastrar,
    setNfeClientesParaCadastrar,
    cadastrandoClientesNfe,
    handleCadastrarClientesNfe,
    notasFiscais,
    importingNfe,
    fileInputRef,
    handleRemoveNota,
    handleUpdateNotaPapel,
    removingNotaId,
    updatingPapelId,
    minutaFotoNome,
    hasMinutaFoto,
    pendingMinutaFile,
    setPendingMinutaFile,
    setHasMinutaFoto,
    setMinutaFotoNome,
    loadEventos,
    eventos,
    eventosLoading,
  } = props;

  switch (tab) {
    case "programacao":
      return (
        <CrudDataPanel
          editing={!!editing}
          entityName="carregamento"
          editTitle="Programação do embarque"
          newTitle="Programação do embarque"
          onCancel={() => cancelForm(resetForm)}
        >
          {pendenciasForm.length > 0 && (
            <CarregamentoPendenciasAlert
              className="mb-4"
              pendencias={pendenciasForm}
              origemNfe={!!pendingNfeParsed || !!pendingNfeXml}
              showLinks
            />
          )}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {editing && (
              <div>
                <Label htmlFor="carregamento-codigo">Código interno</Label>
                <Input
                  id="carregamento-codigo"
                  className="mt-1 font-mono text-sm tabular-nums text-muted-foreground"
                  value={editingNumero ?? ""}
                  readOnly
                  disabled
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Identificador automático do sistema (ex.: CAR-2026-00002).
                </p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as CarregamentoStatus }))
                }
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Rota (opcional)</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.rotaId}
                onChange={(e) => onRotaChange(e.target.value)}
              >
                <option value="">— Manual —</option>
                {rotas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.codigo} — {r.descricao}
                  </option>
                ))}
              </select>
              {rotaSelecionada && isRotaIncompleta(rotaSelecionada) && (
                <div className="mt-2">
                  <RotaIncompletaAlert
                    rota={rotaSelecionada}
                    origemNfe={!!nfeRotaCriada || Number(rotaSelecionada.distanciaKm) === 0}
                    showRotasLink
                  />
                </div>
              )}
              {form.rotaId && rotaPreenchida && rotaSelecionada && !isRotaIncompleta(rotaSelecionada) && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Origem, destino e KM preenchidos pela rota — você pode ajustar manualmente.
                </p>
              )}
            </div>
            <div>
              <Label>Qtd. animais</Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={form.quantidadeAnimais}
                onChange={(e) => {
                  setForm((f) => ({ ...f, quantidadeAnimais: e.target.value }));
                  setNfeAutoFilled((a) => ({ ...a, quantidade: false }));
                }}
                required
              />
              {nfeAutoFilled.quantidade && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Preenchido pela NF-e (soma das quantidades nos itens do XML).
                </p>
              )}
            </div>
            <div>
              <Label>Cliente origem</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.clienteOrigemId}
                onChange={(e) => setForm((f) => ({ ...f, clienteOrigemId: e.target.value }))}
                required
              >
                <option value="">— Selecione —</option>
                {clientes
                  .filter((c) => c.tipo !== "DESEMBARQUE")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {labelClienteOption(c)}
                    </option>
                  ))}
              </select>
              {refsLoading && (
                <p className="mt-1 text-xs text-muted-foreground">Carregando clientes…</p>
              )}
            </div>
            <div>
              <Label>Cliente destino</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.clienteDestinoId}
                onChange={(e) => setForm((f) => ({ ...f, clienteDestinoId: e.target.value }))}
                required
              >
                <option value="">— Selecione —</option>
                {clientes
                  .filter((c) => c.tipo !== "EMBARQUE")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {labelClienteOption(c)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label>KM rota</Label>
              <Input
                className="mt-1"
                value={form.kmRota}
                onChange={(e) => {
                  setForm((f) => ({ ...f, kmRota: e.target.value }));
                  setKmSincronizadoRota(false);
                }}
                placeholder="Da rota ou manual"
              />
              {kmSincronizadoRota && rotaSelecionada && (
                <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  KM atualizado pela rota {rotaSelecionada.codigo} — salve o embarque para gravar.
                </p>
              )}
            </div>
            <div>
              <Label>Motorista</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.motoristaId}
                onChange={(e) => setForm((f) => ({ ...f, motoristaId: e.target.value }))}
              >
                <option value="">— Opcional —</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Tracionador (cavalo / toco)</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.veiculoTracionadorId}
                onChange={(e) => setForm((f) => ({ ...f, veiculoTracionadorId: e.target.value }))}
              >
                <option value="">— Opcional —</option>
                {veiculos
                  .filter((v) => v.tipo !== "CARRETA" && v.tipo !== "JULIETA")
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} · {labelTipoVeiculo(v.tipo)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label>Implemento (carreta / julieta)</Label>
              <select
                className={CRUD_SELECT_CLASS + " mt-1"}
                value={form.veiculoImplementoId}
                onChange={(e) => setForm((f) => ({ ...f, veiculoImplementoId: e.target.value }))}
              >
                <option value="">— Nenhum (veículo único) —</option>
                {veiculos
                  .filter((v) => v.tipo === "CARRETA" || v.tipo === "JULIETA")
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} · {labelTipoVeiculo(v.tipo)}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Conjunto articulado: cadastre cavalo e carreta separados no cadastro de veículos.
              </p>
            </div>
            <div>
              <Label>Valor carga</Label>
              <MoneyInput
                id="valor-carga"
                value={form.valorCarga}
                onChange={(display) => {
                  setForm((f) => ({ ...f, valorCarga: display }));
                  setNfeAutoFilled((a) => ({ ...a, valorCarga: false }));
                }}
                hint={
                  nfeAutoFilled.valorCarga
                    ? "Sugerido pelo valor total da NF-e importada."
                    : "Valor decimal em reais (2 casas)."
                }
              />
            </div>
            <div>
              <Label>Data embarque</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.dataEmbarque}
                onChange={(e) => setForm((f) => ({ ...f, dataEmbarque: e.target.value }))}
              />
            </div>
            <div>
              <Label>Previsão desembarque</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.dataPrevisaoDesembarque}
                onChange={(e) => setForm((f) => ({ ...f, dataPrevisaoDesembarque: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Observações</Label>
              <Input
                className="mt-1"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
            <CrudFormFooter
              editing={!!editing}
              onCancel={() => cancelForm(resetForm)}
              createLabel="Criar carregamento"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      );

    case "resultado":
      return (
        <CrudDataPanel
          editing={!!editing}
          entityName="carregamento"
          editTitle="Resultado financeiro"
          newTitle="Resultado financeiro"
          onCancel={() => cancelForm(resetForm)}
        >
          {!editing ? (
            <p className="text-sm text-muted-foreground">
              Crie e salve o embarque na aba Programação para acompanhar receita, comissões, despesas e
              lançamentos financeiros desta viagem.
            </p>
          ) : (
            editingNumero && (
              <CarregamentoFinanceiroPanel
                carregamentoId={editing}
                carregamentoNumero={editingNumero}
                status={form.status}
                financas={financas}
                motoristas={motoristasFinancas}
                onFinanceiroChange={handleFinanceiroChange}
              />
            )
          )}
        </CrudDataPanel>
      );

    case "notas":
      return (
        <CrudDataPanel
          editing={!!editing}
          entityName="carregamento"
          editTitle="Notas fiscais"
          newTitle="Notas fiscais"
          onCancel={() => cancelForm(resetForm)}
        >
          {nfeClientesParaCadastrar &&
            (nfeClientesParaCadastrar.origem || nfeClientesParaCadastrar.destino) && (
              <CarregamentoNfeClientesPrompt
                origem={nfeClientesParaCadastrar.origem}
                destino={nfeClientesParaCadastrar.destino}
                loading={cadastrandoClientesNfe}
                editingCarregamento={!!editing}
                onCadastrar={handleCadastrarClientesNfe}
                onDismiss={() => setNfeClientesParaCadastrar(null)}
              />
            )}
          <CarregamentoNotasPanel
            embedded
            clientes={clientes}
            notas={notasFiscais}
            pendingNota={
              !editing && pendingNfeParsed
                ? {
                    numero: pendingNfeParsed.numero,
                    serie: pendingNfeParsed.serie,
                    valorTotal: pendingNfeParsed.valorTotal,
                    quantidadeAnimais: pendingNfeParsed.quantidadeAnimais,
                    emitenteNome: pendingNfeParsed.emitenteNome,
                    emitenteCnpj: pendingNfeParsed.emitenteCnpj,
                    destinatarioNome: pendingNfeParsed.destinatarioNome,
                    destinatarioCnpj: pendingNfeParsed.destinatarioCnpj,
                    produtoDescricao: pendingNfeParsed.produtoDescricao,
                    chave: pendingNfeParsed.chave,
                    dataEmissao: pendingNfeParsed.dataEmissao,
                  }
                : null
            }
            canAdd={tab === "notas"}
            adding={importingNfe}
            onAddClick={() => fileInputRef.current?.click()}
            onRemoveNota={editing ? handleRemoveNota : undefined}
            onPapelChange={editing ? handleUpdateNotaPapel : undefined}
            removingId={removingNotaId}
            updatingPapelId={updatingPapelId}
          />
        </CrudDataPanel>
      );

    case "minuta":
      return (
        <CrudDataPanel
          editing={!!editing}
          entityName="carregamento"
          editTitle="Minuta / ordem de coleta"
          newTitle="Minuta / ordem de coleta"
          onCancel={() => cancelForm(resetForm)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <CarregamentoMinutaSection
              carregamentoId={editing}
              numeroMinuta={form.numeroMinuta}
              fotoNome={minutaFotoNome}
              onNumeroMinutaChange={(v) => setForm((f) => ({ ...f, numeroMinuta: v }))}
              hasFoto={hasMinutaFoto || !!pendingMinutaFile}
              onPendingFile={setPendingMinutaFile}
              onFotoChange={async () => {
                if (!editing) return;
                const c = await carregamentosApi.get(editing);
                setHasMinutaFoto(!!c.minutaFotoPath);
                setMinutaFotoNome(c.minutaFotoNome ?? null);
                await loadEventos(editing);
              }}
            />
            <CarregamentoFotosCargaSection carregamentoId={editing} />
            <CrudFormFooter
              editing={!!editing}
              onCancel={() => cancelForm(resetForm)}
              createLabel="Criar carregamento"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      );

    case "gta":
      return (
        <CrudDataPanel
          editing={!!editing}
          entityName="carregamento"
          editTitle="GTA — Guia de Trânsito Animal"
          newTitle="GTA — Guia de Trânsito Animal"
          onCancel={() => cancelForm(resetForm)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <CarregamentoGtaSection
              numeroGta={form.numeroGta}
              gtaUf={form.gtaUf}
              status={form.status}
              preenchidoNfe={nfeAutoFilled.gta}
              gtaVencimentoNfe={pendingNfeParsed?.gtaVencimento}
              onNumeroGtaChange={(v) => {
                setForm((f) => ({ ...f, numeroGta: v }));
                setNfeAutoFilled((a) => ({ ...a, gta: false }));
              }}
              onGtaUfChange={(v) => {
                setForm((f) => ({ ...f, gtaUf: v }));
                setNfeAutoFilled((a) => ({ ...a, gta: false }));
              }}
            />
            <CrudFormFooter
              editing={!!editing}
              onCancel={() => cancelForm(resetForm)}
              createLabel="Criar carregamento"
              saveLabel="Salvar alterações"
            />
          </form>
        </CrudDataPanel>
      );

    case "timeline":
      return (
        <CrudDataPanel
          editing={!!editing}
          entityName="carregamento"
          editTitle="Timeline"
          newTitle="Timeline"
          onCancel={() => cancelForm(resetForm)}
        >
          {editing ? (
            <CarregamentoTimeline eventos={eventos} loading={eventosLoading} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Abra um carregamento na Lista para ver o histórico de eventos, ou crie e salve um novo
              carregamento.
            </p>
          )}
        </CrudDataPanel>
      );

    default:
      return null;
  }
}
