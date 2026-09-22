import { useEffect, useRef, useState } from "react";
import type { ModeloDocumento, CampoPosicao } from "../utils/documentTemplates";

interface RetanguloPx {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Transforma um campo calibrado no espaço "normal de leitura" (a
 * orientação em que o documento foi calibrado — ver documentTemplates.ts)
 * para o espaço da moldura ao vivo (documento deitado, vertical na tela).
 * É o inverso exato da rotação aplicada em capturar(): lá a imagem
 * capturada deitada é girada -90° para virar a imagem "alinhada"; aqui
 * fazemos o caminho contrário só para desenhar a prévia na tela.
 * Dedução: upright(u,v) vem de recorte(a,b) com u=b, v=1-a — logo,
 * para desenhar a prévia a partir de um campo em coordenadas upright,
 * usamos a=1-v, b=u.
 */
function paraEspacoDaMoldura(campo: CampoPosicao): CampoPosicao {
  return {
    x0: 1 - campo.y1,
    y0: campo.x0,
    x1: 1 - campo.y0,
    y1: campo.x1,
  };
}

/**
 * Câmera embutida no app (em vez de abrir o app de câmera nativo).
 *
 * A moldura é vertical, usando o lado mais comprido do quadro da câmera
 * — não a largura. O documento é fisicamente horizontal; pedindo pra
 * girá-lo dentro de uma moldura vertical, o recorte usa o lado mais
 * comprido do sensor, capturando bem mais pixels por campo depois
 * (testado: resolução baixa era a causa raiz da imprecisão da leitura).
 *
 * As sub-molduras dos campos (nome, data, CPF) aparecem em tempo real
 * dentro da moldura principal — a pessoa vê onde cada campo precisa
 * cair e ajusta o enquadramento antes de capturar.
 *
 * Todo o tamanho/posição é calculado em JavaScript (não via CSS
 * aspect-ratio) para evitar imprecisões de cálculo entre navegadores.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [molduraPx, setMolduraPx] = useState<RetanguloPx | null>(null);

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

  // Calcula o retângulo da moldura em pixels de tela, direto do tamanho
  // real do contêiner — evita depender de aspect-ratio via CSS.
  useEffect(() => {
    function recalcular() {
      const el = containerRef.current;
      if (!el) return;
      const { width: larguraTela, height: alturaTela } = el.getBoundingClientRect();
      const alturaMoldura = alturaTela * 0.78;
      const larguraMoldura = Math.min(alturaMoldura / modelo.proporcao, larguraTela * 0.9);
      setMolduraPx({
        left: (larguraTela - larguraMoldura) / 2,
        top: (alturaTela - alturaMoldura) / 2,
        width: larguraMoldura,
        height: alturaMoldura,
      });
    }
    recalcular();
    window.addEventListener("resize", recalcular);
    return () => window.removeEventListener("resize", recalcular);
  }, [modelo.proporcao, pronto]);

  function capturar() {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || !molduraPx) return;

    // Converte o retângulo da moldura (em pixels de tela) para pixels
    // reais do vídeo — a proporção entre os dois pode diferir (o vídeo
    // preenche a tela via object-cover, cortando as bordas).
    const telaRect = container.getBoundingClientRect();
    const escalaVideo = Math.max(video.videoWidth / telaRect.width, video.videoHeight / telaRect.height);
    const videoVisivelLargura = telaRect.width * escalaVideo;
    const videoVisivelAltura = telaRect.height * escalaVideo;
    const offsetX = (videoVisivelLargura - video.videoWidth) / 2;
    const offsetY = (videoVisivelAltura - video.videoHeight) / 2;

    const x = molduraPx.left * escalaVideo - offsetX;
    const y = molduraPx.top * escalaVideo - offsetY;
    const larguraFinal = molduraPx.width * escalaVideo;
    const alturaMoldura = molduraPx.height * escalaVideo;

    // 1) Recorta a região da moldura, exatamente como a câmera vê
    // (documento deitado dentro da moldura vertical).
    const recorte = document.createElement("canvas");
    recorte.width = larguraFinal;
    recorte.height = alturaMoldura;
    const ctxRecorte = recorte.getContext("2d");
    if (!ctxRecorte) return;
    ctxRecorte.drawImage(video, x, y, larguraFinal, alturaMoldura, 0, 0, larguraFinal, alturaMoldura);

    // 2) Gira 90° para a orientação normal de leitura.
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

  const campos = [
    modelo.campos.nome && { campo: modelo.campos.nome, label: "Nome" },
    modelo.campos.dataNascimento && { campo: modelo.campos.dataNascimento, label: "Nascimento" },
    modelo.campos.cpfOuRg && { campo: modelo.campos.cpfOuRg, label: "CPF/RG" },
  ].filter((c): c is { campo: CampoPosicao; label: string } => Boolean(c));

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
          <div ref={containerRef} className="relative flex-1 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {pronto && molduraPx && (
              <>
                <div
                  className="pointer-events-none absolute rounded-lg border-2 border-white"
                  style={{
                    left: molduraPx.left,
                    top: molduraPx.top,
                    width: molduraPx.width,
                    height: molduraPx.height,
                    boxShadow: "0 0 0 999px rgba(0,0,0,0.6)",
                  }}
                />
                {campos.map(({ campo, label }) => {
                  const c = paraEspacoDaMoldura(campo);
                  const left = molduraPx.left + c.x0 * molduraPx.width;
                  const top = molduraPx.top + c.y0 * molduraPx.height;
                  const largura = (c.x1 - c.x0) * molduraPx.width;
                  const altura = (c.y1 - c.y0) * molduraPx.height;
                  return (
                    <div key={label} className="pointer-events-none absolute" style={{ left, top, width: largura, height: altura }}>
                      <div className="h-full w-full rounded border-2 border-orange-400" />
                      <span className="absolute left-0 top-full mt-0.5 whitespace-nowrap rounded bg-orange-400 px-1 py-0.5 text-[10px] font-medium text-black">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
            <p className="absolute bottom-4 left-0 right-0 px-4 text-center text-sm text-white/90">
              Gire o documento e alinhe {modelo.nome} na vertical — encaixe cada campo na sua caixinha laranja
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
