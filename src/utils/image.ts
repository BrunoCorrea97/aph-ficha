/**
 * Redimensiona e comprime uma imagem capturada (ex.: foto do documento
 * da vítima) antes de salvar — evita que o histórico local (IndexedDB) e
 * o PDF gerado fiquem enormes com fotos de câmera em resolução total.
 */
export function redimensionarImagem(file: File, larguraMaxima = 1280, qualidade = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
      img.onload = () => {
        const escala = Math.min(1, larguraMaxima / img.width);
        const largura = Math.round(img.width * escala);
        const altura = Math.round(img.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }
        ctx.drawImage(img, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(file);
  });
}
