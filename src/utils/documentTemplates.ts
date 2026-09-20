export interface CampoPosicao {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ModeloDocumento {
  id: string;
  nome: string;
  /** Proporção largura/altura da moldura de alinhamento. */
  proporcao: number;
  campos: Partial<{
    nome: CampoPosicao;
    cpfOuRg: CampoPosicao;
    dataNascimento: CampoPosicao;
  }>;
}

/**
 * Posições calibradas a partir de fotos reais de uma CNH (modelo atual,
 * padrão nacional desde 2016). Coordenadas em percentual, relativas ao
 * retângulo do documento já alinhado pela moldura de captura.
 */
export const MODELO_CNH: ModeloDocumento = {
  id: "CNH",
  nome: "CNH",
  proporcao: 1.586,
  campos: {
    nome: { x0: 0.11, y0: 0.27, x1: 0.85, y1: 0.335 },
    dataNascimento: { x0: 0.42, y0: 0.335, x1: 0.92, y1: 0.4 },
    cpfOuRg: { x0: 0.44, y0: 0.565, x1: 0.71, y1: 0.63 },
  },
};

/**
 * RG do RS (modelo antigo, Lei nº 7.116/83) — captura em duas etapas,
 * já que o documento costuma estar plastificado e não dá pra abrir/virar
 * sem tirar do plástico. Frente traz Nome e Data de Nascimento; Verso
 * traz o CPF. Calibrado com fotos reais.
 */
export const MODELO_RG_RS_FRENTE: ModeloDocumento = {
  id: "RG_RS_FRENTE",
  nome: "RG (RS) — Frente",
  proporcao: 1.4,
  campos: {
    nome: { x0: 0.42, y0: 0.32, x1: 0.92, y1: 0.42 },
    dataNascimento: { x0: 0.42, y0: 0.6, x1: 0.65, y1: 0.72 },
  },
};

export const MODELO_RG_RS_VERSO: ModeloDocumento = {
  id: "RG_RS_VERSO",
  nome: "RG (RS) — Verso",
  proporcao: 1.37,
  campos: {
    cpfOuRg: { x0: 0.09, y0: 0.14, x1: 0.44, y1: 0.24 },
  },
};

export function modeloCalibrado(modelo: ModeloDocumento): boolean {
  return Object.values(modelo.campos).some((c) => c && c.x1 - c.x0 > 0.01);
}
