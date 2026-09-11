export function FlowProgress({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-xs text-text-muted">
        <span>{etapas[atual]}</span>
        <span className="valor-numerico">
          {atual + 1}/{etapas.length}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${((atual + 1) / etapas.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
