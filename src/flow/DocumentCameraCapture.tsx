import { useEffect, useRef, useState } from "react";
import type { ModeloDocumento } from "../utils/documentTemplates";

/**
 * Câmera embutida no app (em vez de abrir o app de câmera nativo) — o
 * motivo é a moldura de alinhamento: só sabendo exatamente onde o
 * documento está dentro do quadro é que dá pra recortar cada campo
 * (nome, CPF, data) pela posição, em vez de tentar ler o documento
 * inteiro de uma vez.
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
          height: { ideal: 1080 },
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

    // A moldura ocupa 88% da largura do quadro, centralizada, com a
    // proporção do documento — recorta exatamente essa região do vídeo,
    // em resolução nativa (não a resolução de tela, que é menor).
    const larguraMoldura = video.videoWidth * 0.88;
    const alturaMoldura = larguraMoldura / modelo.proporcao;
    const x = (video.videoWidth - larguraMoldura) / 2;
    const y = (video.videoHeight - alturaMoldura) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = larguraMoldura;
    canvas.height = alturaMoldura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, x, y, larguraMoldura, alturaMoldura, 0, 0, larguraMoldura, alturaMoldura);

    onCapturar(canvas.toDataURL("image/jpeg", 0.92));
  }

  function fechar() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancelar();
  }

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
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-accent-strong"
                style={{
                  width: "88%",
                  aspectRatio: `${modelo.proporcao}`,
                  boxShadow: "0 0 0 999px rgba(0,0,0,0.55)",
                }}
              />
            )}
            <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/90">
              Alinhe a {modelo.nome} dentro da moldura
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
