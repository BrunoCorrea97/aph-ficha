import type { GlasgowResultado } from "../db/database";

/**
 * Escala de Coma de Glasgow — fonte: ITO 23/CBMMG, Apêndice 02 (usada
 * como complementar ao POP de Trauma do CBMRS, que cita "Escala de Coma
 * de Glasgow" sem detalhar a tabela de pontos). Subescores registrados
 * separadamente do total, como a própria fonte recomenda.
 */
const OCULAR = [
  { pontos: 4, label: "Espontânea" },
  { pontos: 3, label: "Ao som" },
  { pontos: 2, label: "À estimulação (dor)" },
  { pontos: 1, label: "Ausente" },
];

const VERBAL = [
  { pontos: 5, label: "Orientada" },
  { pontos: 4, label: "Confusa" },
  { pontos: 3, label: "Palavras isoladas" },
  { pontos: 2, label: "Sons/gemidos" },
  { pontos: 1, label: "Ausente" },
];

const MOTORA = [
  { pontos: 6, label: "Obedece a ordens" },
  { pontos: 5, label: "Localiza a dor" },
  { pontos: 4, label: "Flexão normal à dor" },
  { pontos: 3, label: "Flexão anormal à dor" },
  { pontos: 2, label: "Extensão à dor" },
  { pontos: 1, label: "Ausente" },
];

const PUPILAR = [
  { pontos: 0, label: "As 2 pupilas reagem à luz" },
  { pontos: 1, label: "Apenas 1 pupila reage" },
  { pontos: 2, label: "Nenhuma pupila reage" },
];

function ChoiceRow({
  title,
  opcoes,
  valor,
  onChange,
}: {
  title: string;
  opcoes: Array<{ pontos: number; label: string }>;
  valor: number | undefined;
  onChange: (pontos: number) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-medium text-text-muted">{title}</p>
      <div className="space-y-2">
        {opcoes.map((o) => (
          <button
            key={o.pontos}
            type="button"
            onClick={() => onChange(o.pontos)}
            className={`alvo-toque flex w-full items-center justify-between rounded-lg border px-4 text-left ${
              valor === o.pontos
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface-raised text-text"
            }`}
          >
            <span>{o.label}</span>
            <span className="valor-numerico font-semibold">{o.pontos}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function GlasgowScale({
  value,
  onChange,
}: {
  value: GlasgowResultado;
  onChange: (value: GlasgowResultado) => void;
}) {
  function atualizar(campo: keyof GlasgowResultado, pontos: number) {
    const proximo = { ...value, [campo]: pontos };
    const total =
      (proximo.ocular ?? 0) +
      (proximo.verbal ?? 0) +
      (proximo.motora ?? 0) -
      (proximo.pupilarSubtracao ?? 0);
    onChange({ ...proximo, total });
  }

  const completo =
    value.ocular !== undefined && value.verbal !== undefined && value.motora !== undefined;

  return (
    <div>
      <ChoiceRow title="Abertura ocular" opcoes={OCULAR} valor={value.ocular} onChange={(p) => atualizar("ocular", p)} />
      <ChoiceRow title="Resposta verbal" opcoes={VERBAL} valor={value.verbal} onChange={(p) => atualizar("verbal", p)} />
      <ChoiceRow title="Resposta motora" opcoes={MOTORA} valor={value.motora} onChange={(p) => atualizar("motora", p)} />
      <ChoiceRow
        title="Reação pupilar"
        opcoes={PUPILAR}
        valor={value.pupilarSubtracao}
        onChange={(p) => atualizar("pupilarSubtracao", p)}
      />

      {completo && (
        <div className="mt-2 rounded-lg border border-border bg-surface p-4 text-center">
          <p className="text-text-muted">Escala de Coma de Glasgow</p>
          <p className="valor-numerico text-4xl font-bold text-text">{value.total}</p>
          <p className="text-xs text-text-muted">
            O: {value.ocular} · V: {value.verbal} · M: {value.motora}
            {value.pupilarSubtracao ? ` · Reação pupilar: −${value.pupilarSubtracao}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
