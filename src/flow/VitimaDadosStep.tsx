import { useRef, useState } from "react";
import type { DadosVitima } from "../db/database";
import { redimensionarImagem } from "../utils/image";

/**
 * Última etapa antes do relatório: identificação da vítima e, opcional,
 * uma foto do documento (RG/CPF) para agilizar o preenchimento em campo.
 * O input com capture="environment" abre a câmera traseira diretamente
 * no celular, sem precisar passar pela galeria.
 *
 * Tudo fica só no aparelho (IndexedDB local) — nada é enviado a
 * nenhum servidor.
 */
export function VitimaDadosStep({
  valor,
  onChange,
}: {
  valor: DadosVitima | undefined;
  onChange: (v: DadosVitima) => void;
}) {
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroFoto(null);
    setProcessandoFoto(true);
    try {
      const dataUrl = await redimensionarImagem(file);
      onChange({ ...valor, fotoDocumentoDataUrl: dataUrl });
    } catch {
      setErroFoto("Não foi possível processar a foto. Tente novamente.");
    } finally {
      setProcessandoFoto(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-text">Dados da Vítima</h1>
      <p className="mb-6 text-sm text-text-muted">
        Campo opcional. Fica salvo só neste aparelho — nada é enviado a nenhum servidor.
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-sm text-text-muted">Nome</label>
        <input
          value={valor?.nome ?? ""}
          onChange={(e) => onChange({ ...valor, nome: e.target.value })}
          className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 text-lg text-text"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm text-text-muted">CPF/RG</label>
        <input
          value={valor?.documentoCpfRg ?? ""}
          onChange={(e) => onChange({ ...valor, documentoCpfRg: e.target.value })}
          className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 text-lg text-text"
        />
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm text-text-muted">Data de nascimento</label>
        <input
          type="date"
          value={valor?.dataNascimento ?? ""}
          onChange={(e) => onChange({ ...valor, dataNascimento: e.target.value })}
          className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 text-text"
        />
      </div>

      <label className="mb-1 block text-sm text-text-muted">Foto do documento</label>
      {valor?.fotoDocumentoDataUrl ? (
        <div className="mb-2">
          <img
            src={valor.fotoDocumentoDataUrl}
            alt="Documento da vítima"
            className="mb-2 max-h-64 w-full rounded-lg border border-border object-contain"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              className="alvo-toque rounded-lg border border-border text-sm font-medium text-text"
            >
              Tirar outra foto
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...valor, fotoDocumentoDataUrl: undefined })}
              className="alvo-toque rounded-lg border border-prioridade-vermelha/50 text-sm font-medium text-prioridade-vermelha"
            >
              Remover foto
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputFotoRef.current?.click()}
          disabled={processandoFoto}
          className="alvo-toque w-full rounded-lg border border-dashed border-border text-text-muted disabled:opacity-60"
        >
          {processandoFoto ? "Processando…" : "📷 Fotografar documento"}
        </button>
      )}
      {erroFoto && <p className="mt-2 text-sm text-prioridade-amarela">{erroFoto}</p>}

      <input
        ref={inputFotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFoto}
        className="hidden"
      />
    </div>
  );
}
