import type { Atendimento } from "../db/database";
import { gerarRelatorioPdf } from "../pdf/gerarRelatorioPdf";

const NATUREZA_CLINICA_LABEL: Record<string, string> = {
  AVE: "AVE",
  CONVULSAO: "Crise Convulsiva",
  GLICEMIA: "Hiper/Hipoglicemia",
  PRESSAO_ARTERIAL: "Hiper/Hipotensão",
  ANAFILAXIA: "Anafilaxia",
  OUTRO_MAL_SUBITO: "Outro / Mal Súbito",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text">{valor}</span>
    </div>
  );
}

export function ReportView({ atendimento }: { atendimento: Atendimento }) {
  async function baixarPdf() {
    const blob = gerarRelatorioPdf(atendimento);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ficha-aph-${atendimento.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const t = atendimento.avaliacaoTrauma;
  const c = atendimento.avaliacaoClinica;

  return (
    <div>
      <button
        type="button"
        onClick={baixarPdf}
        className="alvo-toque mb-6 w-full rounded-lg bg-accent text-lg font-semibold text-white"
      >
        Gerar PDF
      </button>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-medium text-accent-strong">Identificação</h2>
        <Campo label="Início" valor={fmt(atendimento.criadoEm)} />
        <Campo label="Local" valor={atendimento.local || "não informado"} />
        <Campo
          label="Natureza"
          valor={
            atendimento.natureza === "TRAUMA"
              ? "Trauma"
              : atendimento.natureza === "CLINICO"
                ? NATUREZA_CLINICA_LABEL[c?.naturezaClinica ?? ""] ?? "não especificado"
                : "não definida"
          }
        />
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-medium text-accent-strong">Avaliação Primária</h2>
        {atendimento.natureza === "TRAUMA" && t ? (
          <>
            <Campo label="Cena segura" valor={t.cenaSegura === undefined ? "não avaliado" : t.cenaSegura ? "Sim" : "Não"} />
            <Campo label="X — Hemorragia controlada" valor={t.xHemorragiaControlada === undefined ? "não avaliado" : t.xHemorragiaControlada ? "Sim" : "Não"} />
            <Campo label="A — Via aérea pérvia" valor={t.aViaAerea === undefined ? "não avaliado" : t.aViaAerea ? "Sim" : "Não"} />
            <Campo label="B — Respiração presente" valor={t.bRespiracao === undefined ? "não avaliado" : t.bRespiracao ? "Sim" : "Não"} />
            <Campo label="C — Pulso presente" valor={t.cPulso === undefined ? "não avaliado" : t.cPulso ? "Sim" : "Não"} />
            <Campo label="D — A.V.D.I." valor={t.dAvdi ?? "não avaliado"} />
            {t.glasgow?.total !== undefined && <Campo label="Glasgow" valor={String(t.glasgow.total)} />}
            <Campo label="E — Exposição realizada" valor={t.eExposicao === undefined ? "não avaliado" : t.eExposicao ? "Sim" : "Não"} />
            <Campo label="C.I.P.E." valor={t.cipeClassificacao ?? "não classificado"} />
          </>
        ) : atendimento.natureza === "CLINICO" && c ? (
          <>
            {c.naturezaClinica === "AVE" && (
              <>
                <Campo label="Início dos sintomas" valor={c.horarioInicioSintomas ? fmt(c.horarioInicioSintomas) : "não informado"} />
                <Campo label="Cincinnati — assimetria facial" valor={c.cincinnatiAssimetriaFacial === undefined ? "não avaliado" : c.cincinnatiAssimetriaFacial ? "Sim" : "Não"} />
                <Campo label="Cincinnati — debilidade de braços" valor={c.cincinnatiDebilidadeBracos === undefined ? "não avaliado" : c.cincinnatiDebilidadeBracos ? "Sim" : "Não"} />
                <Campo label="Cincinnati — fala anormal" valor={c.cincinnatiFalaAnormal === undefined ? "não avaliado" : c.cincinnatiFalaAnormal ? "Sim" : "Não"} />
              </>
            )}
            {c.naturezaClinica === "GLICEMIA" && (
              <Campo label="Glicemia capilar" valor={c.glicemiaMgdl !== undefined ? `${c.glicemiaMgdl} mg/dl` : "não informado"} />
            )}
            {c.naturezaClinica === "ANAFILAXIA" && (
              <>
                <Campo label="Hipotensão" valor={c.hipotensao === undefined ? "não avaliado" : c.hipotensao ? "Sim" : "Não"} />
                <Campo label="Dispneia ou vômitos" valor={c.dispneiaOuVomito === undefined ? "não avaliado" : c.dispneiaOuVomito ? "Sim" : "Não"} />
              </>
            )}
            <Campo label="Responsivo" valor={c.responsivo === undefined ? "não avaliado" : c.responsivo ? "Sim" : "Não"} />
            {c.glasgow?.total !== undefined && <Campo label="Glasgow" valor={String(c.glasgow.total)} />}
          </>
        ) : (
          <p className="text-text-muted">Não preenchida.</p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-medium text-accent-strong">SAMPLE</h2>
        <Campo label="Sinais e sintomas" valor={atendimento.sample?.sinaisSintomas || "não informado"} />
        <Campo label="Alergias" valor={atendimento.sample?.alergias || "não informado"} />
        <Campo label="Medicação" valor={atendimento.sample?.medicacao || "não informado"} />
        <Campo label="Passado médico" valor={atendimento.sample?.passadoMedico || "não informado"} />
        <Campo label="Ingestão" valor={atendimento.sample?.ingestao || "não informado"} />
        <Campo label="Eventos" valor={atendimento.sample?.eventos || "não informado"} />
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-medium text-accent-strong">Sinais Vitais</h2>
        {atendimento.sinaisVitais.length === 0 ? (
          <p className="text-text-muted">Nenhum registro.</p>
        ) : (
          <div className="space-y-2">
            {atendimento.sinaisVitais.map((v) => (
              <div key={v.id} className="rounded border border-border/50 p-2 text-sm">
                <p className="mb-1 font-medium text-text">
                  {v.momento === "INICIAL" ? "Inicial" : "Reavaliação"} — {fmt(v.horario)}
                </p>
                <p className="valor-numerico text-text-muted">
                  FC {v.fcBpm ?? "—"} · FR {v.frIrpm ?? "—"} · PA {v.paSistolica ?? "—"}x{v.paDiastolica ?? "—"} · Temp{" "}
                  {v.temperaturaC ?? "—"} · SatO2 {v.spo2Pct ?? "—"}% · Glicemia {v.glicemiaMgdl ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-medium text-accent-strong">Procedimentos</h2>
        {atendimento.procedimentos.length === 0 ? (
          <p className="text-text-muted">Nenhum procedimento registrado.</p>
        ) : (
          <ul className="space-y-1 text-sm text-text">
            {atendimento.procedimentos.map((p) => (
              <li key={p.id}>
                {fmt(p.horario)} — {p.nome}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-medium text-accent-strong">Reavaliações</h2>
        {atendimento.reavaliacoes.length === 0 ? (
          <p className="text-text-muted">Nenhuma reavaliação registrada.</p>
        ) : (
          <ul className="space-y-1 text-sm text-text">
            {atendimento.reavaliacoes.map((r) => (
              <li key={r.id}>
                {fmt(r.horario)} — {r.alteracoes || "sem alterações relatadas"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
