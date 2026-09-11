import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";

export function HomeScreen() {
  const total = useLiveQuery(() => db.atendimentos.count());

  return (
    <div className="flex min-h-screen flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-text">Ficha APH</h1>
        <p className="mb-8 text-text-muted">Calculadora, anotador e gerador de relatório de atendimento</p>

        <Link
          to="/novo"
          className="alvo-toque mb-4 flex items-center justify-center rounded-lg bg-accent text-lg font-semibold text-white"
        >
          Novo Atendimento
        </Link>
        <Link
          to="/historico"
          className="alvo-toque flex items-center justify-center rounded-lg border border-border text-lg font-medium text-text"
        >
          Histórico {total !== undefined ? `(${total})` : ""}
        </Link>

        <p className="mt-8 text-center text-xs text-text-muted">
          Ferramenta de apoio à avaliação e registro. Não substitui os POPs, treinamento e
          julgamento clínico do socorrista.
        </p>
      </div>
    </div>
  );
}
