import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { ReportView } from "../components/ReportView";

export function HistoricoScreen() {
  const atendimentos = useLiveQuery(() => db.atendimentos.orderBy("criadoEm").reverse().toArray());
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const navigate = useNavigate();

  const atendimentoAberto = atendimentos?.find((a) => a.id === abertoId);

  if (atendimentoAberto) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-6">
        <button
          type="button"
          onClick={() => setAbertoId(null)}
          className="alvo-toque mb-4 flex items-center text-text-muted"
        >
          ← Voltar ao histórico
        </button>
        <ReportView atendimento={atendimentoAberto} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Histórico</h1>
        <button type="button" onClick={() => navigate("/")} className="text-text-muted">
          Início
        </button>
      </div>

      {atendimentos?.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-text-muted">Nenhum atendimento salvo ainda.</p>
        </div>
      )}

      <ul className="space-y-3">
        {atendimentos?.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setAbertoId(a.id)}
              className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 py-4 text-left"
            >
              <p className="font-medium text-text">
                {new Date(a.criadoEm).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-text-muted">
                {a.natureza === "TRAUMA" ? "Trauma" : a.natureza === "CLINICO" ? "Clínico" : "Sem natureza"}
                {a.local ? ` · ${a.local}` : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <Link
        to="/novo"
        className="alvo-toque fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-lg"
      >
        + Novo
      </Link>
    </div>
  );
}
