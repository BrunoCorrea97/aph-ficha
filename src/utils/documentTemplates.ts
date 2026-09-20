export interface CampoPosicao {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ModeloDocumento {
  id: "CNH" | "RG_RS";
  nome: string;
  /** Proporção largura/altura da moldura de alinhamento (documento de identidade padrão ≈ 1.586). */
  proporcao: number;
  campos: {
    nome: CampoPosicao;
    cpfOuRg: CampoPosicao;
    dataNascimento: CampoPosicao;
  };
}

/**
 * Posições calibradas a partir de fotos reais de uma CNH (modelo atual,
 * padrão nacional desde 2016). Coordenadas em percentual, relativas ao
 * retângulo do documento já alinhado pela moldura de captura — por isso
 * são estáveis independente do enquadramento da foto original.
 *
 * Cada caixa tem uma margem de tolerância a mais nas bordas (documentos
 * raramente ficam 100% perfeitos dentro da moldura).
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
 * Placeholder até calibrar com uma foto real de RG do RS — não usar em
 * produção ainda. Quando tiver a foto de referência, recalibrar do mesmo
 * jeito que foi feito para a CNH (ver documentação do projeto).
 */
export const MODELO_RG_RS: ModeloDocumento = {
  id: "RG_RS",
  nome: "RG (RS)",
  proporcao: 1.586,
  campos: {
    nome: { x0: 0, y0: 0, x1: 0, y1: 0 },
    dataNascimento: { x0: 0, y0: 0, x1: 0, y1: 0 },
    cpfOuRg: { x0: 0, y0: 0, x1: 0, y1: 0 },
  },
};

export const MODELOS_DISPONIVEIS: Record<"CNH" | "RG_RS", ModeloDocumento> = {
  CNH: MODELO_CNH,
  RG_RS: MODELO_RG_RS,
};

export function modeloCalibrado(modelo: ModeloDocumento): boolean {
  return Object.values(modelo.campos).some((c) => c.x1 - c.x0 > 0.01);
}
