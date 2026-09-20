import { createWorker, PSM } from "tesseract.js";
import { prepararImagemParaOcr } from "./image";
import type { CampoPosicao, ModeloDocumento } from "./documentTemplates";

export interface DadosExtraidos {
  nome?: string;
  documentoCpfRg?: string;
  dataNascimento?: string; // ISO AAAA-MM-DD
  textoCompleto: string;
}

/**
 * Roda OCR local (Tesseract.js, modelo português) sobre a foto do
 * documento e tenta extrair Nome, CPF/RG e Data de Nascimento por
 * heurística de padrões comuns em documentos brasileiros (RG, CNH, CIN).
 * Tudo roda no próprio aparelho — a imagem nunca sai do dispositivo.
 *
 * Calibrado empiricamente com uma CNH real: a imagem é convertida para
 * escala de cinza com contraste alongado antes do OCR — isso recupera
 * campos impressos em vermelho/laranja (comuns em CNH) que o OCR
 * simplesmente não enxerga na foto colorida original, e reduz ruído de
 * textura em fotos de tela de celular. O modo de segmentação
 * PSM.SPARSE_TEXT também ajuda bastante em documentos com muitas caixas
 * separadas (rótulo numa caixa, valor em outra).
 *
 * Nunca deve ser tratado como resultado definitivo: a tela que usa isso
 * sempre deixa os campos editáveis depois, e esta função prefere
 * devolver "não encontrado" a arriscar um valor errado quando o texto
 * lido não bate com o formato esperado (ex.: uma data com uma letra no
 * lugar de um dígito).
 *
 * Os arquivos do motor (worker, wasm, pacote de idioma) ficam em
 * /tesseract/ dentro de public/ — carregados localmente, sem depender de
 * nenhum CDN externo, para não quebrar o funcionamento offline.
 */
export async function extrairDadosDocumento(imagemDataUrl: string): Promise<DadosExtraidos> {
  const imagemParaOcr = await prepararImagemParaOcr(imagemDataUrl);

  const worker = await createWorker("por", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/tesseract-core-lstm.wasm.js",
    langPath: "/tesseract/",
    gzip: true,
  });

  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const {
      data: { text },
    } = await worker.recognize(imagemParaOcr);
    return { ...extrairCampos(text), textoCompleto: text };
  } finally {
    await worker.terminate();
  }
}

export function extrairCampos(texto: string): Omit<DadosExtraidos, "textoCompleto"> {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    documentoCpfRg: extrairCpfOuRg(texto, linhas),
    dataNascimento: extrairDataNascimento(linhas),
    nome: extrairNome(linhas),
  };
}

/**
 * CPF (XXX.XXX.XXX-XX) — exige a pontuação para não confundir com outros
 * números do documento (Nº de registro, doc. de identidade etc., que
 * costumam ter 9-11 dígitos corridos sem pontuação). Tolera um espaço
 * perdido pelo OCR ao lado de um ponto/traço.
 */
function extrairCpfOuRg(texto: string, linhas: string[]): string | undefined {
  const cpf = texto.match(/\d{3}\.\s?\d{3}\.\s?\d{3}-\s?\d{2}/);
  if (cpf) return cpf[0].replace(/\s/g, "");

  // RG: procura uma linha rotulada como identidade/RG e pega o primeiro
  // número com 7+ dígitos nela (ou na linha seguinte).
  const idxRotulo = linhas.findIndex((l) => /identidade|\brg\b/i.test(l));
  if (idxRotulo !== -1) {
    for (const linha of [linhas[idxRotulo], linhas[idxRotulo + 1]]) {
      const m = linha?.match(/\d[\d.]{6,}\d/);
      if (m) return m[0];
    }
  }
  return undefined;
}

/**
 * Procura a linha com "nascimento" e usa a data encontrada nela ou na
 * linha seguinte — layout comum em RG/CNH/CIN é rótulo numa linha, valor
 * na próxima. Aceita dia/mês com 1 ou 2 dígitos (o OCR às vezes perde um
 * dígito em números repetidos, ex. "11" lido como "1"), mas nunca inventa
 * um dígito que não apareceu — se a data não bate com esse formato,
 * prefere devolver nada a arriscar uma data errada.
 */
function extrairDataNascimento(linhas: string[]): string | undefined {
  const padraoData = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/;
  const idxRotulo = linhas.findIndex((l) => /nascimento/i.test(l));
  if (idxRotulo === -1) return undefined;

  for (const linha of [linhas[idxRotulo], linhas[idxRotulo + 1], linhas[idxRotulo + 2]]) {
    const m = linha?.match(padraoData);
    if (m) {
      const iso = isoValido(m[1], m[2], m[3]);
      if (iso) return iso;
    }
  }
  return undefined;
}

function isoValido(dia: string, mes: string, ano: string): string | undefined {
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(ano);
  if (d < 1 || d > 31 || m < 1 || m > 12 || a < 1900 || a > new Date().getFullYear()) return undefined;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

/**
 * Procura uma linha rotulada como nome ("NOME", "NOME E SOBRENOME") e
 * usa a linha seguinte como candidata — nunca tenta separar rótulo e
 * valor numa mesma linha (documentos reais quase sempre têm o rótulo
 * numa caixa e o valor abaixo). A candidata é validada: só letras,
 * espaços e acentos, pelo menos duas palavras — qualquer coisa com
 * dígito, barra vertical ou símbolo é cortada fora antes de validar,
 * pra não devolver lixo de OCR (datas/linhas vizinhas coladas por engano).
 */
function extrairNome(linhas: string[]): string | undefined {
  const idxRotulo = linhas.findIndex((l) => /\bnome\b/i.test(l));
  if (idxRotulo === -1) return undefined;

  for (const candidata of [linhas[idxRotulo + 1], linhas[idxRotulo + 2]]) {
    if (!candidata) continue;
    const limpo = limparCandidatoNome(candidata);
    if (nomeParecevalido(limpo)) return limpo;
  }
  return undefined;
}

function limparCandidatoNome(linha: string): string {
  // Corta a partir do primeiro dígito ou barra vertical (geralmente é
  // onde um campo vizinho colou nessa mesma linha), depois remove
  // qualquer símbolo que não seja letra/espaço/hífen/apóstrofo.
  const cortado = linha.split(/[|0-9]/)[0];
  return cortado
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nomeParecevalido(nome: string): boolean {
  if (nome.length < 4 || nome.length > 70) return false;
  const palavras = nome.split(" ").filter(Boolean);
  return palavras.length >= 2 && palavras.every((p) => p.length >= 1);
}

/** Recorta uma região percentual da imagem, devolvendo um novo data URL. */
function recortarCampo(imagemDataUrl: string, campo: CampoPosicao): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Não foi possível recortar a imagem."));
    img.onload = () => {
      const x = img.width * campo.x0;
      const y = img.height * campo.y0;
      const largura = img.width * (campo.x1 - campo.x0);
      const altura = img.height * (campo.y1 - campo.y0);

      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível recortar a imagem."));
        return;
      }
      ctx.drawImage(img, x, y, largura, altura, 0, 0, largura, altura);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = imagemDataUrl;
  });
}

/**
 * Extração por posição — usada quando a foto foi tirada com a moldura de
 * alinhamento (ver DocumentCameraCapture): como sabemos exatamente onde
 * cada campo fica no documento já alinhado, recorta e lê cada um
 * isoladamente, em vez de tentar interpretar o documento inteiro de uma
 * vez. Testado empiricamente ser bem mais confiável que o modo de texto
 * livre — mas só funciona se a foto realmente veio alinhada à moldura.
 */
export async function extrairPorPosicao(
  imagemAlinhadaDataUrl: string,
  modelo: ModeloDocumento
): Promise<DadosExtraidos> {
  const worker = await createWorker("por", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/tesseract-core-lstm.wasm.js",
    langPath: "/tesseract/",
    gzip: true,
  });

  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });

    async function lerCampo(campo: CampoPosicao): Promise<string> {
      const recorte = await recortarCampo(imagemAlinhadaDataUrl, campo);
      const preparado = await prepararImagemParaOcr(recorte);
      const {
        data: { text },
      } = await worker.recognize(preparado);
      return text.trim();
    }

    const [textoNome, textoData, textoDoc] = await Promise.all([
      lerCampo(modelo.campos.nome),
      lerCampo(modelo.campos.dataNascimento),
      lerCampo(modelo.campos.cpfOuRg),
    ]);

    return {
      nome: validarNome(textoNome),
      dataNascimento: validarData(textoData),
      documentoCpfRg: validarCpfRg(textoDoc),
      textoCompleto: `${textoNome}\n${textoData}\n${textoDoc}`,
    };
  } finally {
    await worker.terminate();
  }
}

function validarNome(texto: string): string | undefined {
  const limpo = texto
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return nomeParecevalido(limpo) ? limpo : undefined;
}

function validarData(texto: string): string | undefined {
  const m = texto.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (!m) return undefined;
  return isoValido(m[1], m[2], m[3]);
}

function validarCpfRg(texto: string): string | undefined {
  // CPF com pontuação, tolerando espaço perdido pelo OCR.
  const cpfPontuado = texto.match(/\d{3}\.\s?\d{3}\.\s?\d{3}-\s?\d{2}/);
  if (cpfPontuado) return cpfPontuado[0].replace(/\s/g, "");

  // 11 dígitos corridos (OCR pode perder a pontuação) — reformata como CPF.
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  }
  // RG (7-10 dígitos), sem tentar reformatar — cada estado tem um formato.
  if (digitos.length >= 7 && digitos.length <= 10) return digitos;

  return undefined;
}
