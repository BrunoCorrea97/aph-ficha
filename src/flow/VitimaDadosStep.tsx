import { useState } from "react";
import type { DadosVitima } from "../db/database";
import { redimensionarImagem } from "../utils/image";
import { MaskedDateInput } from "../components/MaskedDateInput";
import { extrairDadosDocumento, extrairPorPosicao, type DadosExtraidos } from "../utils/ocr";
import { MODELO_CNH, MODELO_RG_RS_FRENTE, MODELO_RG_RS_VERSO } from "../utils/documentTemplates";
import { DocumentCameraCapture } from "./DocumentCameraCapture";

type TipoDocumento = "CNH" | "RG_RS";
type EtapaCameraRg = "FRENTE" | "VERSO" | null;

/**
 * Última etapa antes do relatório: identificação da vítima e, opcional,
 * uma foto do documento para agilizar o preenchimento em campo.
 *
 * Fluxo de captura por tipo de documento (câmera embutida com moldura de
 * alinhamento — sabendo onde o documento está no quadro, recorta e lê
 * cada campo isoladamente, mais confiável que ler o documento inteiro):
 *   - CNH: uma foto (frente), lê nome, CPF e nascimento.
 *   - RG (RS): duas fotos em sequência (frente, depois verso) — o
 *     documento costuma estar plastificado e não dá pra abrir sem tirar
 *     do plástico. Frente lê nome e nascimento; verso lê o CPF.
 *
 * Se a leitura por posição não achar nada em algum campo, tenta uma vez
 * como reforço a leitura de texto livre na mesma foto antes de desistir.
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
  const [etapaCamera, setEtapaCamera] = useState<EtapaCameraRg | "CNH">(null);
  const [extraindoDados, setExtraindoDados] = useState(false);
  const [avisoExtracao, setAvisoExtracao] = useState<string | null>(null);

  function aplicarExtraidos(base: DadosVitima | undefined, extraido: Partial<DadosExtraidos>): DadosVitima {
    return {
      ...base,
      nome: base?.nome || extraido.nome,
      documentoCpfRg: base?.documentoCpfRg || extraido.documentoCpfRg,
      dataNascimento: base?.dataNascimento || extraido.dataNascimento,
    };
  }

  function avisar(extraido: Partial<DadosExtraidos>) {
    if (!extraido.nome && !extraido.documentoCpfRg && !extraido.dataNascimento) {
      setAvisoExtracao("Não consegui identificar os dados automaticamente — preencha manualmente.");
    } else {
      setAvisoExtracao("Dados extraídos automaticamente — confira e corrija se necessário.");
    }
  }

  async function handleCapturaCnh(dataUrlAlinhado: string) {
    setEtapaCamera(null);
    const comFoto: DadosVitima = { ...valor, fotoDocumentoDataUrl: dataUrlAlinhado };
    onChange(comFoto);
    setAvisoExtracao(null);
    setExtraindoDados(true);
    try {
      let extraido = await extrairPorPosicao(dataUrlAlinhado, MODELO_CNH);
      if (!extraido.nome && !extraido.documentoCpfRg && !extraido.dataNascimento) {
        extraido = await extrairDadosDocumento(dataUrlAlinhado);
      }
      onChange(aplicarExtraidos(comFoto, extraido));
      avisar(extraido);
    } catch {
      setAvisoExtracao(
        "Extração automática não disponível neste aparelho agora — a foto foi salva normalmente, preencha os campos manualmente."
      );
    } finally {
      setExtraindoDados(false);
    }
  }

  async function handleCapturaRgFrente(dataUrlAlinhado: string) {
    const comFoto: DadosVitima = { ...valor, fotoDocumentoDataUrl: dataUrlAlinhado };
    onChange(comFoto);
    setAvisoExtracao(null);
    setExtraindoDados(true);
    try {
      const extraido = await extrairPorPosicao(dataUrlAlinhado, MODELO_RG_RS_FRENTE);
      onChange(aplicarExtraidos(comFoto, extraido));
    } catch {
      // segue para o verso mesmo se a frente falhar — o CPF ainda pode vir de lá
    } finally {
      setExtraindoDados(false);
      // Abre automaticamente a câmera do verso em seguida.
      setEtapaCamera("VERSO");
    }
  }

  async function handleCapturaRgVerso(dataUrlAlinhado: string) {
    setEtapaCamera(null);
    const comFoto: DadosVitima = { ...valor, fotoDocumentoVersoDataUrl: dataUrlAlinhado };
    onChange(comFoto);
    setExtraindoDados(true);
    try {
      const extraido = await extrairPorPosicao(dataUrlAlinhado, MODELO_RG_RS_VERSO);
      onChange(aplicarExtraidos(comFoto, extraido));
      avisar({
        nome: comFoto.nome,
        dataNascimento: comFoto.dataNascimento,
        documentoCpfRg: extraido.documentoCpfRg,
        textoCompleto: "",
      });
    } catch {
      setAvisoExtracao(
        "Extração automática não disponível neste aparelho agora — as fotos foram salvas normalmente, preencha os campos manualmente."
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
      onChange(aplicarExtraidos({ ...valor, fotoDocumentoDataUrl: dataUrl }, extraido));
      avisar(extraido);
    } catch {
      setAvisoExtracao(
        "Extração automática não disponível neste arquivo/aparelho agora — a foto foi salva normalmente, preencha os campos manualmente."
      );
    } finally {
      setExtraindoDados(false);
      e.target.value = "";
    }
  }

  const temFoto = Boolean(valor?.fotoDocumentoDataUrl);

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

      {!temFoto && (
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
      {temFoto ? (
        <div className="mb-2">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <img
              src={valor!.fotoDocumentoDataUrl}
              alt="Documento da vítima (frente)"
              className="max-h-64 w-full rounded-lg border border-border object-contain"
            />
            {valor?.fotoDocumentoVersoDataUrl && (
              <img
                src={valor.fotoDocumentoVersoDataUrl}
                alt="Documento da vítima (verso)"
                className="max-h-64 w-full rounded-lg border border-border object-contain"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                tipoDocumento === "CNH"
                  ? setEtapaCamera("CNH")
                  : setEtapaCamera("FRENTE")
              }
              disabled={extraindoDados}
              className="alvo-toque rounded-lg border border-border text-sm font-medium text-text disabled:opacity-60"
            >
              {extraindoDados ? "Lendo dados…" : "Tirar outra foto"}
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ ...valor, fotoDocumentoDataUrl: undefined, fotoDocumentoVersoDataUrl: undefined })
              }
              disabled={extraindoDados}
              className="alvo-toque rounded-lg border border-prioridade-vermelha/50 text-sm font-medium text-prioridade-vermelha disabled:opacity-60"
            >
              Remover foto{valor?.fotoDocumentoVersoDataUrl ? "s" : ""}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEtapaCamera(tipoDocumento === "CNH" ? "CNH" : "FRENTE")}
          disabled={extraindoDados}
          className="alvo-toque w-full rounded-lg border border-dashed border-border text-text-muted disabled:opacity-60"
        >
          {extraindoDados
            ? "Lendo dados do documento…"
            : tipoDocumento === "RG_RS"
              ? "📷 Fotografar frente do RG"
              : "📷 Fotografar documento"}
        </button>
      )}
      {avisoExtracao && <p className="mt-2 text-sm text-text-muted">{avisoExtracao}</p>}

      <input
        id="input-rg-livre"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFotoRgLivre}
        className="hidden"
      />

      {etapaCamera === "CNH" && (
        <DocumentCameraCapture
          modelo={MODELO_CNH}
          onCapturar={handleCapturaCnh}
          onCancelar={() => setEtapaCamera(null)}
        />
      )}
      {etapaCamera === "FRENTE" && (
        <DocumentCameraCapture
          modelo={MODELO_RG_RS_FRENTE}
          onCapturar={handleCapturaRgFrente}
          onCancelar={() => setEtapaCamera(null)}
        />
      )}
      {etapaCamera === "VERSO" && (
        <DocumentCameraCapture
          modelo={MODELO_RG_RS_VERSO}
          onCapturar={handleCapturaRgVerso}
          onCancelar={() => setEtapaCamera(null)}
        />
      )}
    </div>
  );
}
