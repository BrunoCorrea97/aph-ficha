import Dexie, { type Table } from "dexie";

export type Natureza = "TRAUMA" | "CLINICO";
export type NaturezaClinica =
  | "AVE"
  | "CONVULSAO"
  | "GLICEMIA"
  | "PRESSAO_ARTERIAL"
  | "ANAFILAXIA"
  | "OUTRO_MAL_SUBITO";

export interface GlasgowResultado {
  ocular?: number;
  verbal?: number;
  motora?: number;
  pupilarSubtracao?: number;
  total?: number;
}

export interface SinaisVitais {
  id: string;
  momento: "INICIAL" | "REAVALIACAO";
  horario: string; // ISO
  fcBpm?: number;
  frIrpm?: number;
  paSistolica?: number;
  paDiastolica?: number;
  temperaturaC?: number;
  spo2Pct?: number;
  glicemiaMgdl?: number;
}

export interface Reavaliacao {
  id: string;
  horario: string;
  alteracoes?: string;
  sinaisVitaisId?: string; // referencia um registro em sinaisVitais
  glasgow?: GlasgowResultado;
}

export interface Procedimento {
  id: string;
  nome: string;
  horario: string;
  observacao?: string;
}

export interface Sample {
  sinaisSintomas?: string;
  alergias?: string;
  medicacao?: string;
  passadoMedico?: string;
  ingestao?: string;
  eventos?: string;
}

export interface AvaliacaoTrauma {
  cenaSegura?: boolean;
  xHemorragiaControlada?: boolean;
  aViaAerea?: boolean;
  bRespiracao?: boolean;
  cPulso?: boolean;
  dAvdi?: "ALERTA" | "VOZ" | "DOR" | "IRRESPONSIVO";
  glasgow?: GlasgowResultado;
  eExposicao?: boolean;
  cipeClassificacao?: "CRITICO" | "INSTAVEL" | "POTENCIALMENTE_INSTAVEL" | "ESTAVEL";
}

export interface AvaliacaoClinica {
  naturezaClinica?: NaturezaClinica;
  // Campos específicos por natureza — todos opcionais, preenchidos
  // conforme o fluxo daquela natureza:
  cincinnatiAssimetriaFacial?: boolean;
  cincinnatiDebilidadeBracos?: boolean;
  cincinnatiFalaAnormal?: boolean;
  horarioInicioSintomas?: string;
  glicemiaMgdl?: number;
  hipotensao?: boolean;
  dispneiaOuVomito?: boolean;
  responsivo?: boolean;
  glasgow?: GlasgowResultado;
}

export interface DadosVitima {
  nome?: string;
  documentoCpfRg?: string;
  dataNascimento?: string; // YYYY-MM-DD
  fotoDocumentoDataUrl?: string;
  /** Só usado quando o documento precisa de duas fotos (ex.: RG frente/verso). */
  fotoDocumentoVersoDataUrl?: string;
}

export interface Atendimento {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  local?: string;
  localLatitude?: number;
  localLongitude?: number;
  natureza?: Natureza;
  vitima?: DadosVitima;
  avaliacaoTrauma?: AvaliacaoTrauma;
  avaliacaoClinica?: AvaliacaoClinica;
  sample?: Sample;
  sinaisVitais: SinaisVitais[];
  procedimentos: Procedimento[];
  reavaliacoes: Reavaliacao[];
  finalizado: boolean;
}

class FichaAphDatabase extends Dexie {
  atendimentos!: Table<Atendimento, string>;

  constructor() {
    super("ficha-aph");
    this.version(1).stores({
      atendimentos: "id, criadoEm, natureza, finalizado",
    });
  }
}

export const db = new FichaAphDatabase();

export function novoId(): string {
  return crypto.randomUUID();
}
