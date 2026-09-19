import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, novoId } from "../db/database";
import type { Atendimento, Natureza, NaturezaClinica, SinaisVitais } from "../db/database";
import { QuickChoice } from "../components/QuickChoice";
import { FlowProgress } from "../components/FlowProgress";
import { GlasgowScale } from "../components/GlasgowScale";
import { ReportView } from "../components/ReportView";

function novoAtendimentoVazio(): Atendimento {
  const agora = new Date().toISOString();
  return {
    id: novoId(),
    criadoEm: agora,
    atualizadoEm: agora,
    sinaisVitais: [],
    procedimentos: [],
    reavaliacoes: [],
    finalizado: false,
  };
}

function getEtapas(a: Atendimento): string[] {
  if (!a.natureza) return ["Natureza"];
  const base =
    a.natureza === "TRAUMA"
      ? ["Natureza", "Cena e XABCDE", "SAMPLE"]
      : ["Natureza", "Avaliação Clínica", "SAMPLE"];
  return [...base, "Sinais Vitais", "Procedimentos", "Reavaliação", "Relatório"];
}

const CAMPOS_VITAIS: Array<{ key: keyof SinaisVitais; label: string }> = [
  { key: "fcBpm", label: "FC (bpm)" },
  { key: "frIrpm", label: "FR (irpm)" },
  { key: "paSistolica", label: "PA sistólica" },
  { key: "paDiastolica", label: "PA diastólica" },
  { key: "temperaturaC", label: "Temperatura (°C)" },
  { key: "spo2Pct", label: "SatO2 (%)" },
  { key: "glicemiaMgdl", label: "Glicemia (mg/dl)" },
];

export function NovoAtendimentoWizard() {
  const [atendimento, setAtendimento] = useState<Atendimento>(novoAtendimentoVazio());
  const [passo, setPasso] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const navigate = useNavigate();

  const etapas = getEtapas(atendimento);

  function atualizar(mutacao: (a: Atendimento) => Atendimento) {
    setAtendimento((prev) => mutacao({ ...prev, atualizadoEm: new Date().toISOString() }));
  }

  async function salvarNoHistorico() {
    await db.atendimentos.put({ ...atendimento, finalizado: true });
    setSalvo(true);
  }

  function avancar() {
    setPasso((p) => Math.min(p + 1, etapas.length - 1));
  }
  function voltar() {
    setPasso((p) => Math.max(p - 1, 0));
  }

  const etapaAtual = etapas[passo];

  return (
    <div className="min-h-screen px-4 pb-24 pt-6">
      <FlowProgress etapas={etapas} atual={passo} />

      {etapaAtual === "Natureza" && (
        <div>
          <h1 className="mb-6 text-2xl font-semibold text-text">Natureza da Ocorrência</h1>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                atualizar((a) => ({ ...a, natureza: "TRAUMA" as Natureza }));
                setPasso(1);
              }}
              className="alvo-toque rounded-lg border border-border bg-surface-raised py-8 text-xl font-semibold text-text"
            >
              Trauma
            </button>
            <button
              type="button"
              onClick={() => {
                atualizar((a) => ({ ...a, natureza: "CLINICO" as Natureza }));
                setPasso(1);
              }}
              className="alvo-toque rounded-lg border border-border bg-surface-raised py-8 text-xl font-semibold text-text"
            >
              Clínico
            </button>
          </div>
        </div>
      )}

      {etapaAtual === "Cena e XABCDE" && (
        <div>
          <h1 className="mb-4 text-2xl font-semibold text-text">Cena e XABCDE</h1>
          <QuickChoice
            label="Cena segura?"
            value={atendimento.avaliacaoTrauma?.cenaSegura}
            onChange={(v) => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, cenaSegura: v } }))}
          />
          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">X — Hemorragia</h2>
          <QuickChoice
            label="Hemorragia exsanguinante controlada?"
            value={atendimento.avaliacaoTrauma?.xHemorragiaControlada}
            onChange={(v) =>
              atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, xHemorragiaControlada: v } }))
            }
          />
          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">A — Vias aéreas</h2>
          <QuickChoice
            label="Via aérea pérvia?"
            value={atendimento.avaliacaoTrauma?.aViaAerea}
            onChange={(v) => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, aViaAerea: v } }))}
          />
          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">B — Respiração</h2>
          <QuickChoice
            label="Respiração presente?"
            value={atendimento.avaliacaoTrauma?.bRespiracao}
            onChange={(v) => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, bRespiracao: v } }))}
          />
          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">C — Circulação</h2>
          <QuickChoice
            label="Pulso presente?"
            value={atendimento.avaliacaoTrauma?.cPulso}
            onChange={(v) => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, cPulso: v } }))}
          />
          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">D — A.V.D.I. e Glasgow</h2>
          <div className="mb-4 grid grid-cols-4 gap-2">
            {(["ALERTA", "VOZ", "DOR", "IRRESPONSIVO"] as const).map((nivel) => (
              <button
                key={nivel}
                type="button"
                onClick={() => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, dAvdi: nivel } }))}
                className={`alvo-toque rounded-lg border text-xs font-medium ${
                  atendimento.avaliacaoTrauma?.dAvdi === nivel
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface-raised text-text"
                }`}
              >
                {nivel}
              </button>
            ))}
          </div>
          <GlasgowScale
            value={atendimento.avaliacaoTrauma?.glasgow ?? {}}
            onChange={(g) => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, glasgow: g } }))}
          />
          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">E — Exposição</h2>
          <QuickChoice
            label="Exposição realizada?"
            value={atendimento.avaliacaoTrauma?.eExposicao}
            onChange={(v) => atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, eExposicao: v } }))}
          />

          <h2 className="mb-2 mt-6 text-lg font-medium text-accent-strong">Classificação C.I.P.E.</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["CRITICO", "Crítico"],
                ["INSTAVEL", "Instável"],
                ["POTENCIALMENTE_INSTAVEL", "Pot. Instável"],
                ["ESTAVEL", "Estável"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  atualizar((a) => ({ ...a, avaliacaoTrauma: { ...a.avaliacaoTrauma, cipeClassificacao: key } }))
                }
                className={`alvo-toque rounded-lg border text-sm font-medium ${
                  atendimento.avaliacaoTrauma?.cipeClassificacao === key
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface-raised text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {etapaAtual === "Avaliação Clínica" && (
        <div>
          <h1 className="mb-4 text-2xl font-semibold text-text">Avaliação Clínica</h1>
          <h2 className="mb-2 text-lg font-medium text-accent-strong">Natureza específica</h2>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {(
              [
                ["AVE", "AVE"],
                ["CONVULSAO", "Crise Convulsiva"],
                ["GLICEMIA", "Hiper/Hipoglicemia"],
                ["PRESSAO_ARTERIAL", "Hiper/Hipotensão"],
                ["ANAFILAXIA", "Anafilaxia"],
                ["OUTRO_MAL_SUBITO", "Outro / Mal Súbito"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  atualizar((a) => ({
                    ...a,
                    avaliacaoClinica: { ...a.avaliacaoClinica, naturezaClinica: key as NaturezaClinica },
                  }))
                }
                className={`alvo-toque rounded-lg border text-sm font-medium ${
                  atendimento.avaliacaoClinica?.naturezaClinica === key
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface-raised text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {atendimento.avaliacaoClinica?.naturezaClinica === "AVE" && (
            <>
              <label className="mb-1 block text-sm text-text-muted">Horário do início dos sintomas</label>
              <input
                type="datetime-local"
                onChange={(e) =>
                  atualizar((a) => ({
                    ...a,
                    avaliacaoClinica: {
                      ...a.avaliacaoClinica,
                      horarioInicioSintomas: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    },
                  }))
                }
                className="alvo-toque mb-4 w-full rounded-lg border border-border bg-surface px-4 text-text"
              />
              <QuickChoice
                label="Assimetria facial?"
                value={atendimento.avaliacaoClinica?.cincinnatiAssimetriaFacial}
                onChange={(v) =>
                  atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, cincinnatiAssimetriaFacial: v } }))
                }
              />
              <QuickChoice
                label="Debilidade de braços?"
                value={atendimento.avaliacaoClinica?.cincinnatiDebilidadeBracos}
                onChange={(v) =>
                  atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, cincinnatiDebilidadeBracos: v } }))
                }
              />
              <QuickChoice
                label="Fala anormal?"
                value={atendimento.avaliacaoClinica?.cincinnatiFalaAnormal}
                onChange={(v) =>
                  atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, cincinnatiFalaAnormal: v } }))
                }
              />
            </>
          )}

          {atendimento.avaliacaoClinica?.naturezaClinica === "GLICEMIA" && (
            <div className="mb-4">
              <label className="mb-1 block text-sm text-text-muted">Glicemia capilar (mg/dl)</label>
              <input
                type="number"
                inputMode="numeric"
                onChange={(e) =>
                  atualizar((a) => ({
                    ...a,
                    avaliacaoClinica: {
                      ...a.avaliacaoClinica,
                      glicemiaMgdl: e.target.value ? Number(e.target.value) : undefined,
                    },
                  }))
                }
                className="alvo-toque valor-numerico w-32 rounded-lg border border-border bg-surface px-4 text-xl text-text"
              />
            </div>
          )}

          {atendimento.avaliacaoClinica?.naturezaClinica === "ANAFILAXIA" && (
            <>
              <QuickChoice
                label="Hipotensão presente?"
                value={atendimento.avaliacaoClinica?.hipotensao}
                onChange={(v) => atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, hipotensao: v } }))}
              />
              <QuickChoice
                label="Dispneia ou vômitos?"
                value={atendimento.avaliacaoClinica?.dispneiaOuVomito}
                onChange={(v) =>
                  atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, dispneiaOuVomito: v } }))
                }
              />
            </>
          )}

          <h2 className="mb-2 mt-4 text-lg font-medium text-accent-strong">Nível de consciência</h2>
          <QuickChoice
            label="Vítima responsiva?"
            value={atendimento.avaliacaoClinica?.responsivo}
            onChange={(v) => atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, responsivo: v } }))}
          />
          <GlasgowScale
            value={atendimento.avaliacaoClinica?.glasgow ?? {}}
            onChange={(g) => atualizar((a) => ({ ...a, avaliacaoClinica: { ...a.avaliacaoClinica, glasgow: g } }))}
          />
        </div>
      )}

      {etapaAtual === "SAMPLE" && (
        <div>
          <h1 className="mb-4 text-2xl font-semibold text-text">Avaliação Secundária — SAMPLE</h1>
          {(
            [
              ["sinaisSintomas", "Sinais e sintomas"],
              ["alergias", "Alergias"],
              ["medicacao", "Uso de medicação"],
              ["passadoMedico", "Passado médico"],
              ["ingestao", "Ingestão de líquidos/alimentos"],
              ["eventos", "Eventos relacionados"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="mb-4">
              <label className="mb-1 block text-sm text-text-muted">{label}</label>
              <textarea
                rows={2}
                value={atendimento.sample?.[key] ?? ""}
                onChange={(e) => atualizar((a) => ({ ...a, sample: { ...a.sample, [key]: e.target.value } }))}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text"
              />
            </div>
          ))}
        </div>
      )}

      {etapaAtual === "Sinais Vitais" && (
        <div>
          <h1 className="mb-4 text-2xl font-semibold text-text">Sinais Vitais (medição inicial)</h1>
          <SinaisVitaisForm
            onSalvar={(v) =>
              atualizar((a) => ({
                ...a,
                sinaisVitais: [
                  ...a.sinaisVitais.filter((sv) => sv.momento !== "INICIAL"),
                  { ...v, id: novoId(), momento: "INICIAL", horario: new Date().toISOString() },
                ],
              }))
            }
            valorInicial={atendimento.sinaisVitais.find((v) => v.momento === "INICIAL")}
          />
        </div>
      )}

      {etapaAtual === "Procedimentos" && (
        <ProcedimentosStep
          procedimentos={atendimento.procedimentos}
          onAdicionar={(nome, observacao) =>
            atualizar((a) => ({
              ...a,
              procedimentos: [...a.procedimentos, { id: novoId(), nome, observacao, horario: new Date().toISOString() }],
            }))
          }
        />
      )}

      {etapaAtual === "Reavaliação" && (
        <ReavaliacaoStep
          atendimento={atendimento}
          onAdicionar={(alteracoes, vitais) =>
            atualizar((a) => {
              const vitaisId = novoId();
              return {
                ...a,
                sinaisVitais: vitais ? [...a.sinaisVitais, { ...vitais, id: vitaisId, momento: "REAVALIACAO", horario: new Date().toISOString() }] : a.sinaisVitais,
                reavaliacoes: [
                  ...a.reavaliacoes,
                  { id: novoId(), horario: new Date().toISOString(), alteracoes, sinaisVitaisId: vitais ? vitaisId : undefined },
                ],
              };
            })
          }
        />
      )}

      {etapaAtual === "Relatório" && (
        <div>
          <h1 className="mb-4 text-2xl font-semibold text-text">Relatório do Atendimento</h1>
          <ReportView atendimento={atendimento} />
          {!salvo ? (
            <button
              type="button"
              onClick={salvarNoHistorico}
              className="alvo-toque mt-2 w-full rounded-lg border border-prioridade-verde/50 bg-prioridade-verde/10 text-lg font-medium text-text"
            >
              Salvar no histórico
            </button>
          ) : (
            <div className="mt-2 space-y-3">
              <p className="text-center text-prioridade-verde">Salvo no histórico.</p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="alvo-toque w-full rounded-lg border border-border text-lg font-medium text-text"
              >
                Voltar ao início
              </button>
            </div>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-border bg-surface p-4">
        <button
          type="button"
          onClick={voltar}
          disabled={passo === 0}
          className="alvo-toque flex-1 rounded-lg border border-border text-lg font-medium text-text disabled:opacity-40"
        >
          Voltar
        </button>
        {etapaAtual !== "Natureza" && etapaAtual !== "Relatório" && (
          <button
            type="button"
            onClick={avancar}
            className="alvo-toque flex-1 rounded-lg bg-accent text-lg font-semibold text-white"
          >
            Avançar
          </button>
        )}
      </div>
    </div>
  );
}

function SinaisVitaisForm({
  onSalvar,
  valorInicial,
}: {
  onSalvar: (v: Partial<SinaisVitais>) => void;
  valorInicial?: SinaisVitais;
}) {
  const [valores, setValores] = useState<Partial<SinaisVitais>>(valorInicial ?? {});

  return (
    <div className="grid grid-cols-2 gap-4">
      {CAMPOS_VITAIS.map((campo) => (
        <div key={campo.key}>
          <label className="mb-1 block text-sm text-text-muted">{campo.label}</label>
          <input
            type="number"
            inputMode="decimal"
            value={(valores[campo.key] as number | undefined) ?? ""}
            onChange={(e) => {
              const next = { ...valores, [campo.key]: e.target.value ? Number(e.target.value) : undefined };
              setValores(next);
              onSalvar(next);
            }}
            className="alvo-toque valor-numerico w-full rounded-lg border border-border bg-surface px-3 text-xl text-text"
          />
        </div>
      ))}
    </div>
  );
}

function ProcedimentosStep({
  procedimentos,
  onAdicionar,
}: {
  procedimentos: Atendimento["procedimentos"];
  onAdicionar: (nome: string, observacao?: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [observacao, setObservacao] = useState("");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-text">Procedimentos Realizados</h1>
      <div className="mb-4">
        <label className="mb-1 block text-sm text-text-muted">Procedimento</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 text-lg text-text"
          placeholder="Ex.: Oxigenoterapia via Máscara de Hudson"
        />
      </div>
      <div className="mb-4">
        <label className="mb-1 block text-sm text-text-muted">Observação (opcional)</label>
        <input
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 text-lg text-text"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          if (!nome.trim()) return;
          onAdicionar(nome, observacao || undefined);
          setNome("");
          setObservacao("");
        }}
        className="alvo-toque mb-6 w-full rounded-lg border border-dashed border-border text-text-muted"
      >
        + Adicionar procedimento
      </button>

      {procedimentos.length > 0 && (
        <ul className="space-y-2">
          {procedimentos.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-text">
              {new Date(p.horario).toLocaleTimeString("pt-BR")} — {p.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReavaliacaoStep({
  atendimento,
  onAdicionar,
}: {
  atendimento: Atendimento;
  onAdicionar: (alteracoes: string, vitais?: Partial<SinaisVitais>) => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alteracoes, setAlteracoes] = useState("");
  const [vitais, setVitais] = useState<Partial<SinaisVitais>>({});

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-text">Reavaliação</h1>
      <p className="mb-4 text-sm text-text-muted">
        Campo opcional — adicione quantas reavaliações forem necessárias durante o atendimento, ou
        avance sem nenhuma se não houver reavaliação a registrar.
      </p>

      {atendimento.reavaliacoes.length > 0 && (
        <ul className="mb-4 space-y-2">
          {atendimento.reavaliacoes.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-surface px-4 py-3">
              <p className="text-sm text-text-muted">{new Date(r.horario).toLocaleTimeString("pt-BR")}</p>
              <p className="text-text">{r.alteracoes || "sem alterações relatadas"}</p>
            </li>
          ))}
        </ul>
      )}

      {!mostrarForm ? (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="alvo-toque w-full rounded-lg border border-dashed border-border text-text-muted"
        >
          + Nova reavaliação
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-4">
          <label className="mb-1 block text-sm text-text-muted">Alterações observadas</label>
          <textarea
            rows={3}
            value={alteracoes}
            onChange={(e) => setAlteracoes(e.target.value)}
            className="mb-4 w-full rounded-lg border border-border bg-base px-4 py-2 text-text"
          />
          <p className="mb-2 text-sm font-medium text-text-muted">Novos sinais vitais (opcional)</p>
          <div className="mb-4 grid grid-cols-2 gap-3">
            {CAMPOS_VITAIS.map((campo) => (
              <div key={campo.key}>
                <label className="mb-1 block text-xs text-text-muted">{campo.label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  onChange={(e) =>
                    setVitais((v) => ({ ...v, [campo.key]: e.target.value ? Number(e.target.value) : undefined }))
                  }
                  className="alvo-toque valor-numerico w-full rounded-lg border border-border bg-base px-3 text-lg text-text"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setAlteracoes("");
                setVitais({});
              }}
              className="alvo-toque rounded-lg border border-border text-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const temVitais = Object.values(vitais).some((v) => v !== undefined);
                onAdicionar(alteracoes, temVitais ? vitais : undefined);
                setMostrarForm(false);
                setAlteracoes("");
                setVitais({});
              }}
              className="alvo-toque rounded-lg bg-accent text-white"
            >
              Salvar reavaliação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
