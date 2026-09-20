import { useState } from "react";
import type { DadosVitima } from "../db/database";
import { redimensionarImagem } from "../utils/image";
import { MaskedDateInput } from "../components/MaskedDateInput";
import { extrairDadosDocumento, extrairPorPosicao } from "../utils/ocr";
import { MODELO_CNH, MODELO_RG_RS, modeloCalibrado } from "../utils/documentTemplates";
import { DocumentCameraCapture } from "./DocumentCameraCapture";

type TipoDocumento = "CNH" | "RG_RS";

/**
 * Última etapa antes do relatório: identificação da vítima e, opcional,
 * uma foto do documento para agilizar o preenchimento em campo.
 *
 * Fluxo de captura por tipo de documento:
 *   - CNH: câmera embutida com moldura de alinhamento — sabendo onde o
 *     documento está no quadro, recorta e lê cada campo (nome, CPF,
 *     nascimento) isoladamente, mais confiável que ler o documento
 *     inteiro de uma vez. Se algum campo não for lido por posição, cai
 *     para leitura de texto livre como reforço.
 *   - RG (RS): ainda não tem moldura calibrada — usa foto livre (câmera
 *     nativa) + leitura de texto livre; se não achar nada, pede
 *     preenchimento manual.
 *
 * Tudo fica só no aparelho (IndexedDB local) — nada é enviado a nenhum
 * servidor.
 */
export function VitimaDadosStep({
  valor,
  onChange,
}: {
  valor: DadosVitima | undefined;
  onChange: (v: DadosVitima) => void;
}) {
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("CNH");
  const [mostrarCamera, setMostrarCamera] = useState(false);
  const [extraindoDados, setExtraindoDados] = useState(false);
  const [avisoExtracao, setAvisoExtracao] = useState<string | null>(null);

  const rgCalibrado = modeloCalibrado(MODELO_RG_RS);

  function aplicarExtraidos(dataUrl: string, extraido: {
    nome?: string;
    documentoCpfRg?: string;
    dataNascimento?: string;
  }) {
    onChange({
      ...valor,
      fotoDocumentoDataUrl: dataUrl,
      nome: valor?.nome || extraido.nome,
      documentoCpfRg: valor?.documentoCpfRg || extraido.documentoCpfRg,
      dataNascimento: valor?.dataNascimento || extraido.dataNascimento,
    });
    if (!extraido.nome && !extraido.documentoCpfRg && !extraido.dataNascimento) {
      setAvisoExtracao("Não consegui identificar os dados automaticamente — preencha manualmente.");
    } else {
      setAvisoExtracao("Dados extraídos automaticamente — confira e corrija se necessário.");
    }
  }

  async function handleCapturaCnh(dataUrlAlinhado: string) {
    setMostrarCamera(false);
    onChange({ ...valor, fotoDocumentoDataUrl: dataUrlAlinhado });
    setAvisoExtracao(null);
    setExtraindoDados(true);
    try {
      let extraido = await extrairPorPosicao(dataUrlAlinhado, MODELO_CNH);
      // Reforço: se a leitura por posição não achou nada, tenta texto livre
      // na mesma foto antes de desistir.
      if (!extraido.nome && !extraido.documentoCpfRg && !extraido.dataNascimento) {
        extraido = await extrairDadosDocumento(dataUrlAlinhado);
      }
      aplicarExtraidos(dataUrlAlinhado, extraido);
    } catch {
      setAvisoExtracao(
        "Extração automática não disponível neste aparelho agora — a foto foi salva normalmente, preencha os campos manualmente."
      );
    } finally {
      setExtraindoDados(false);
    }
  }

  async function handleFotoRgLivre(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvisoExtracao(null);

    let dataUrl: string;
    try {
      dataUrl = await redimensionarImagem(file);
      onChange({ ...valor, fotoDocumentoDataUrl: dataUrl });
    } catch {
      setAvisoExtracao("Não foi possível processar a foto. Tente novamente.");
      e.target.value = "";
      return;
    }

    setExtraindoDados(true);
    try {
      const extraido = await extrairDadosDocumento(dataUrl);
      aplicarExtraidos(dataUrl, extraido);
    } catch {
      setAvisoExtracao(
        "Extração automática não disponível neste arquivo/aparelho agora — a foto foi salva normalmente, preencha os campos manualmente."
      );
    } finally {
      setExtraindoDados(false);
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
          inputMode="numeric"
          onChange={(e) => onChange({ ...valor, documentoCpfRg: e.target.value })}
          className="alvo-toque w-full rounded-lg border border-border bg-surface px-4 text-lg text-text"
        />
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-sm text-text-muted">Data de nascimento</label>
        <MaskedDateInput
          valor={valor?.dataNascimento}
          onChange={(dataNascimento) => onChange({ ...valor, dataNascimento })}
        />
      </div>

      {!valor?.fotoDocumentoDataUrl && (
        <>
          <label className="mb-1 block text-sm text-text-muted">Tipo de documento</label>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoDocumento("CNH")}
              className={`alvo-toque rounded-lg border text-sm font-medium ${
                tipoDocumento === "CNH"
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface-raised text-text"
              }`}
            >
              CNH
            </button>
            <button
              type="button"
              onClick={() => setTipoDocumento("RG_RS")}
              className={`alvo-toque rounded-lg border text-sm font-medium ${
                tipoDocumento === "RG_RS"
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface-raised text-text"
              }`}
            >
              RG (RS)
            </button>
          </div>
        </>
      )}

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
              onClick={() => (tipoDocumento === "CNH" ? setMostrarCamera(true) : document.getElementById("input-rg-livre")?.click())}
              disabled={extraindoDados}
              className="alvo-toque rounded-lg border border-border text-sm font-medium text-text disabled:opacity-60"
            >
              {extraindoDados ? "Lendo dados…" : "Tirar outra foto"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...valor, fotoDocumentoDataUrl: undefined })}
              disabled={extraindoDados}
              className="alvo-toque rounded-lg border border-prioridade-vermelha/50 text-sm font-medium text-prioridade-vermelha disabled:opacity-60"
            >
              Remover foto
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            tipoDocumento === "CNH" ? setMostrarCamera(true) : document.getElementById("input-rg-livre")?.click()
          }
          disabled={extraindoDados}
          className="alvo-toque w-full rounded-lg border border-dashed border-border text-text-muted disabled:opacity-60"
        >
          {extraindoDados ? "Lendo dados do documento…" : "📷 Fotografar documento"}
        </button>
      )}
      {avisoExtracao && <p className="mt-2 text-sm text-text-muted">{avisoExtracao}</p>}
      {tipoDocumento === "RG_RS" && !rgCalibrado && (
        <p className="mt-2 text-xs text-text-muted">
          A leitura por posição do RG ainda não foi calibrada — usando leitura de texto livre.
        </p>
      )}

      <input
        id="input-rg-livre"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFotoRgLivre}
        className="hidden"
      />

      {mostrarCamera && (
        <DocumentCameraCapture
          modelo={MODELO_CNH}
          onCapturar={handleCapturaCnh}
          onCancelar={() => setMostrarCamera(false)}
        />
      )}
    </div>
  );
}
