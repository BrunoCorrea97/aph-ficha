import { createWorker } from "tesseract.js";

export interface DadosExtraidos {
  nome?: string;
  documentoCpfRg?: string;
  dataNascimento?: string; // ISO AAAA-MM-DD
  textoCompleto: string;
}

/**
 * Roda OCR local (Tesseract.js, modelo português) sobre a foto do
 * documento e tenta extrair Nome, CPF/RG e Data de Nascimento por
 * heurística de padrões comuns em documentos brasileiros. Tudo roda no
 * próprio aparelho — a imagem nunca sai do dispositivo.
 *
 * Nunca deve ser tratado como resultado definitivo: documentos variam
 * muito de formato (RG difere por estado, CNH é diferente etc.) e a
 * qualidade da foto (luz, ângulo, reflexo) afeta bastante a precisão. A
 * tela que usa isso deve sempre deixar os campos editáveis depois.
 *
 * Os arquivos do motor (worker, wasm, pacote de idioma) ficam em
 * /tesseract/ dentro de public/ — carregados localmente, sem depender de
 * nenhum CDN externo, para não quebrar o funcionamento offline.
 */
export async function extrairDadosDocumento(imagemDataUrl: string): Promise<DadosExtraidos> {
  const worker = await createWorker("por", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/tesseract-core-lstm.wasm.js",
    langPath: "/tesseract/",
    gzip: true,
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(imagemDataUrl);
    return { ...extrairCampos(text), textoCompleto: text };
  } finally {
    await worker.terminate();
  }
}

function extrairCampos(texto: string): Omit<DadosExtraidos, "textoCompleto"> {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    documentoCpfRg: extrairCpfOuRg(texto),
    dataNascimento: extrairDataNascimento(texto),
    nome: extrairNome(linhas),
  };
}

/** CPF (XXX.XXX.XXX-XX) tem prioridade por ser um padrão inconfundível; senão tenta um RG (7 a 9 dígitos, com ou sem pontuação). */
function extrairCpfOuRg(texto: string): string | undefined {
  const cpf = texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  if (cpf) return cpf[0];

  const rg = texto.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]?\b/);
  if (rg && rg[0].replace(/\D/g, "").length >= 7) return rg[0];

  return undefined;
}

/** Datas no formato DD/MM/AAAA ou DD-MM-AAAA — pega a primeira encontrada perto de "NASC" quando possível, senão a primeira data válida do texto. */
function extrairDataNascimento(texto: string): string | undefined {
  const linhas = texto.split("\n");
  const padraoData = /(\d{2})[/.-](\d{2})[/.-](\d{4})/;

  const linhaComNasc = linhas.find((l) => /nasc/i.test(l));
  if (linhaComNasc) {
    const m = linhaComNasc.match(padraoData);
    if (m) return isoValido(m[1], m[2], m[3]);
    // Às vezes a data vem na linha seguinte à do rótulo "NASCIMENTO".
    const idx = linhas.indexOf(linhaComNasc);
    const proxima = linhas[idx + 1];
    const m2 = proxima?.match(padraoData);
    if (m2) return isoValido(m2[1], m2[2], m2[3]);
  }

  const qualquerData = texto.match(padraoData);
  if (qualquerData) return isoValido(qualquerData[1], qualquerData[2], qualquerData[3]);

  return undefined;
}

function isoValido(dia: string, mes: string, ano: string): string | undefined {
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(ano);
  if (d < 1 || d > 31 || m < 1 || m > 12 || a < 1900 || a > new Date().getFullYear()) return undefined;
  return `${ano}-${mes}-${dia}`;
}

/** Procura a linha após um rótulo "NOME" — comum em RG, CNH e CIN brasileiras. */
function extrairNome(linhas: string[]): string | undefined {
  const idxRotulo = linhas.findIndex((l) => /^nome[:\s]*$/i.test(l) || /^nome\b/i.test(l));
  if (idxRotulo === -1) return undefined;

  // Se o rótulo e o nome estiverem na mesma linha ("NOME: FULANO DA SILVA").
  const mesmaLinha = linhas[idxRotulo].replace(/^nome[:\s]*/i, "").trim();
  if (mesmaLinha.length > 3) return mesmaLinha;

  // Senão, assume que o nome está na linha seguinte.
  const proxima = linhas[idxRotulo + 1]?.trim();
  if (proxima && proxima.length > 3 && !/^\d/.test(proxima)) return proxima;

  return undefined;
}
