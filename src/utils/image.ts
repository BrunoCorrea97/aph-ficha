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

/**
 * Converte a imagem para escala de cinza com alongamento de contraste
 * (equivalente a um "autocontrast") — usada só para alimentar o OCR, não
 * para exibição. Testado empiricamente: recupera campos em cor
 * (vermelho/laranja) que o OCR simplesmente não enxerga na imagem
 * colorida original, e reduz ruído de textura/reflexo em fotos de tela.
 */
export function prepararImagemParaOcr(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Não foi possível preparar a imagem para leitura."));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível preparar a imagem para leitura."));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let min = 255;
      let max = 0;
      const cinza = new Float32Array(data.length / 4);
      for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        cinza[i / 4] = g;
        if (g < min) min = g;
        if (g > max) max = g;
      }
      const amplitude = Math.max(1, max - min);
      for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        let v = ((cinza[idx] - min) / amplitude) * 255;
        v = Math.min(255, Math.max(0, (v - 128) * 1.4 + 128));
        data[i] = data[i + 1] = data[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}
