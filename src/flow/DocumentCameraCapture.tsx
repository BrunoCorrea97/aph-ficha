import { useEffect, useRef, useState } from "react";
import type { ModeloDocumento } from "../utils/documentTemplates";

/**
 * Câmera embutida no app (em vez de abrir o app de câmera nativo).
 *
 * Duas decisões de design que vieram de teste real (não são só estética):
 *
 * 1. A moldura é desenhada na VERTICAL, usando o lado mais comprido do
 *    quadro da câmera (normalmente a altura, com o celular na posição
 *    normal) — não a largura. Isso porque o documento é fisicamente
 *    horizontal (mais largo que alto); se a moldura também fosse
 *    horizontal, ela ficaria limitada pela largura do vídeo (o lado mais
 *    curto), desperdiçando resolução. Girando a moldura pra vertical (e
 *    pedindo pra girar o documento físico dentro dela), o recorte usa o
 *    lado mais comprido do sensor, capturando bem mais pixels por campo
 *    — testado e confirmado que resolução baixa era a causa raiz da
 *    imprecisão da leitura, não a lógica de extração.
 *
 * 2. Mostra sub-molduras dos campos (nome, data, CPF) dentro da moldura
 *    principal, em tempo real — assim a pessoa vê exatamente onde cada
 *    campo precisa cair e ajusta o enquadramento antes de capturar, em
 *    vez de confiar cegamente que "documento dentro da moldura grande"
 *    é suficiente para os recortes internos caírem no lugar certo.
 *
 * Depois de capturar, a imagem (que sai deitada, na orientação em que a
 * câmera realmente vê) é girada programaticamente para a orientação
 * normal de leitura antes de aplicar as posições calibradas dos campos —
 * assim a calibração (feita sempre olhando o documento na posição normal
 * de leitura) continua valendo sem precisar recalcular nada.
 */
export function DocumentCameraCapture({
  modelo,
  onCapturar,
  onCancelar,
}: {
  modelo: ModeloDocumento;
  onCapturar: (dataUrlAlinhado: string) => void;
  onCancelar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setPronto(true);
        }
      })
      .catch(() => {
        setErro(
          "Não foi possível acessar a câmera. Verifique se a permissão foi concedida ao navegador."
        );
      });

    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capturar() {
    const video = videoRef.current;
    if (!video) return;

    // Moldura vertical: usa o lado mais comprido do vídeo (normalmente a
    // altura) como base, não a largura — é o que garante mais pixels
    // reais por campo recortado depois.
    const ladoComprido = Math.max(video.videoWidth, video.videoHeight);
    const ladoCurto = Math.min(video.videoWidth, video.videoHeight);
    const alturaMoldura = ladoComprido * 0.88;
    const larguraMoldura = alturaMoldura / modelo.proporcao;
    const larguraFinal = Math.min(larguraMoldura, ladoCurto * 0.97);

    const x = (video.videoWidth - larguraFinal) / 2;
    const y = (video.videoHeight - alturaMoldura) / 2;

    // 1) Recorta a região da moldura, exatamente como a câmera vê
    // (documento deitado dentro da moldura vertical).
    const recorte = document.createElement("canvas");
    recorte.width = larguraFinal;
    recorte.height = alturaMoldura;
    const ctxRecorte = recorte.getContext("2d");
    if (!ctxRecorte) return;
    ctxRecorte.drawImage(video, x, y, larguraFinal, alturaMoldura, 0, 0, larguraFinal, alturaMoldura);

    // 2) Gira 90° para a orientação normal de leitura — o documento entra
    // deitado na moldura vertical, então o recorte sai "deitado" e
    // precisa girar para ficar na posição em que foi calibrado.
    const alinhado = document.createElement("canvas");
    alinhado.width = alturaMoldura;
    alinhado.height = larguraFinal;
    const ctxAlinhado = alinhado.getContext("2d");
    if (!ctxAlinhado) return;
    ctxAlinhado.translate(alinhado.width / 2, alinhado.height / 2);
    ctxAlinhado.rotate(-Math.PI / 2);
    ctxAlinhado.drawImage(recorte, -recorte.width / 2, -recorte.height / 2);

    onCapturar(alinhado.toDataURL("image/jpeg", 0.92));
  }

  function fechar() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancelar();
  }

  // Proporção da moldura na tela: vertical, largura/altura = 1/proporcao.
  const proporcaoTela = 1 / modelo.proporcao;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {erro ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-text">{erro}</p>
          <button
            type="button"
            onClick={fechar}
            className="alvo-toque rounded-lg border border-border px-6 text-text"
          >
            Voltar
          </button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {pronto && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border-2 border-accent-strong"
                style={{
                  height: "88%",
                  aspectRatio: `${proporcaoTela}`,
                  boxShadow: "0 0 0 999px rgba(0,0,0,0.55)",
                }}
              >
                {/* Sub-molduras dos campos — desenhadas no sistema de
                    coordenadas "normal de leitura" (a mesma da
                    calibração) e giradas de volta pra encaixar na
                    moldura vertical da tela. */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: "100%",
                    aspectRatio: `${modelo.proporcao}`,
                    transform: "translate(-50%, -50%) rotate(90deg)",
                  }}
                >
                  {modelo.campos.nome && <CampoOverlay campo={modelo.campos.nome} label="Nome" />}
                  {modelo.campos.dataNascimento && (
                    <CampoOverlay campo={modelo.campos.dataNascimento} label="Nascimento" />
                  )}
                  {modelo.campos.cpfOuRg && <CampoOverlay campo={modelo.campos.cpfOuRg} label="CPF/RG" />}
                </div>
              </div>
            )}
            <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/90">
              Gire o documento e alinhe {modelo.nome} na vertical — encaixe cada campo na sua caixinha
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 bg-black p-6">
            <button
              type="button"
              onClick={fechar}
              className="alvo-toque rounded-lg border border-white/30 px-6 text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={capturar}
              disabled={!pronto}
              className="alvo-toque rounded-full bg-accent px-10 text-lg font-semibold text-white disabled:opacity-50"
            >
              Capturar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CampoOverlay({
  campo,
  label,
}: {
  campo: { x0: number; y0: number; x1: number; y1: number };
  label: string;
}) {
  return (
    <div
      className="absolute flex items-start justify-start overflow-hidden rounded border border-dashed border-white/80"
      style={{
        left: `${campo.x0 * 100}%`,
        top: `${campo.y0 * 100}%`,
        width: `${(campo.x1 - campo.x0) * 100}%`,
        height: `${(campo.y1 - campo.y0) * 100}%`,
      }}
    >
      <span className="bg-black/60 px-1 text-[9px] leading-tight text-white" style={{ transform: "rotate(-90deg) translateX(-100%)", transformOrigin: "top left" }}>
        {label}
      </span>
    </div>
  );
}
