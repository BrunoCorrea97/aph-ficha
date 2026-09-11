interface QuickChoiceProps {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

export function QuickChoice({ label, value, onChange }: QuickChoiceProps) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-base text-text">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`alvo-toque rounded-lg border px-4 text-lg font-medium ${
            value === true ? "border-accent bg-accent text-white" : "border-border bg-surface-raised text-text"
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`alvo-toque rounded-lg border px-4 text-lg font-medium ${
            value === false ? "border-accent bg-accent text-white" : "border-border bg-surface-raised text-text"
          }`}
        >
          Não
        </button>
      </div>
    </div>
  );
}
