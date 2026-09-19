import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Atendimento } from "../db/database";
import { gerarLinkMaps } from "../utils/maps";

function formatarHorario(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

const NATUREZA_CLINICA_LABEL: Record<string, string> = {
  AVE: "AVE",
  CONVULSAO: "Crise Convulsiva",
  GLICEMIA: "Hiper/Hipoglicemia",
  PRESSAO_ARTERIAL: "Hiper/Hipotensão",
  ANAFILAXIA: "Anafilaxia",
  OUTRO_MAL_SUBITO: "Outro / Mal Súbito",
};

/**
 * Gera o PDF do relatório de atendimento e devolve o Blob para
 * download/compartilhamento. Todo o conteúdo vem do que foi preenchido
 * no atendimento — nada é inferido ou completado automaticamente aqui.
 */
export function gerarRelatorioPdf(atendimento: Atendimento): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margemEsquerda = 40;
  let y = 50;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Ficha de Atendimento Pré-Hospitalar", margemEsquerda, y);
  y += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${formatarHorario(new Date().toISOString())}`, margemEsquerda, y);
  y += 14;
  doc.text(`Início do atendimento: ${formatarHorario(atendimento.criadoEm)}`, margemEsquerda, y);
  y += 14;
  if (atendimento.local) {
    const linkMaps = gerarLinkMaps(atendimento);
    if (linkMaps) {
      doc.setTextColor(29, 78, 216);
      doc.textWithLink(`Local: ${atendimento.local}`, margemEsquerda, y, { url: linkMaps });
      doc.setTextColor(0, 0, 0);
    } else {
      doc.text(`Local: ${atendimento.local}`, margemEsquerda, y);
    }
    y += 14;
  }
  const naturezaTexto =
    atendimento.natureza === "TRAUMA"
      ? "Trauma"
      : atendimento.natureza === "CLINICO"
        ? `Clínico — ${NATUREZA_CLINICA_LABEL[atendimento.avaliacaoClinica?.naturezaClinica ?? ""] ?? "não especificado"}`
        : "Não definida";
  doc.text(`Natureza: ${naturezaTexto}`, margemEsquerda, y);
  y += 20;

  // Dados da Vítima
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Dados da Vítima", margemEsquerda, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nome: ${atendimento.vitima?.nome || "não informado"}`, margemEsquerda, y);
  y += 14;
  doc.text(`CPF/RG: ${atendimento.vitima?.documentoCpfRg || "não informado"}`, margemEsquerda, y);
  y += 14;
  const dataNascTexto = atendimento.vitima?.dataNascimento
    ? new Date(atendimento.vitima.dataNascimento + "T00:00:00").toLocaleDateString("pt-BR")
    : "não informado";
  doc.text(`Data de nascimento: ${dataNascTexto}`, margemEsquerda, y);
  y += 16;

  if (atendimento.vitima?.fotoDocumentoDataUrl) {
    try {
      const propriedades = doc.getImageProperties(atendimento.vitima.fotoDocumentoDataUrl);
      const larguraMaxima = 220;
      const largura = Math.min(larguraMaxima, propriedades.width);
      const altura = (propriedades.height * largura) / propriedades.width;

      if (y + altura > 780) {
        doc.addPage();
        y = 50;
      }
      doc.addImage(atendimento.vitima.fotoDocumentoDataUrl, "JPEG", margemEsquerda, y, largura, altura);
      y += altura + 16;
    } catch {
      doc.text("(não foi possível incluir a foto do documento)", margemEsquerda, y);
      y += 14;
    }
  }

  // Avaliação primária
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Avaliação Primária", margemEsquerda, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (atendimento.natureza === "TRAUMA" && atendimento.avaliacaoTrauma) {
    const t = atendimento.avaliacaoTrauma;
    const linhas = [
      `Cena segura: ${t.cenaSegura === undefined ? "não avaliado" : t.cenaSegura ? "Sim" : "Não"}`,
      `X — Hemorragia exsanguinante controlada: ${t.xHemorragiaControlada === undefined ? "não avaliado" : t.xHemorragiaControlada ? "Sim" : "Não"}`,
      `A — Via aérea pérvia: ${t.aViaAerea === undefined ? "não avaliado" : t.aViaAerea ? "Sim" : "Não"}`,
      `B — Respiração presente: ${t.bRespiracao === undefined ? "não avaliado" : t.bRespiracao ? "Sim" : "Não"}`,
      `C — Pulso presente: ${t.cPulso === undefined ? "não avaliado" : t.cPulso ? "Sim" : "Não"}`,
      `D — A.V.D.I.: ${t.dAvdi ?? "não avaliado"}${t.glasgow?.total !== undefined ? ` · Glasgow: ${t.glasgow.total} (O:${t.glasgow.ocular} V:${t.glasgow.verbal} M:${t.glasgow.motora})` : ""}`,
      `E — Exposição realizada: ${t.eExposicao === undefined ? "não avaliado" : t.eExposicao ? "Sim" : "Não"}`,
      `Classificação C.I.P.E.: ${t.cipeClassificacao ?? "não classificado"}`,
    ];
    for (const linha of linhas) {
      doc.text(linha, margemEsquerda, y);
      y += 14;
    }
  } else if (atendimento.natureza === "CLINICO" && atendimento.avaliacaoClinica) {
    const c = atendimento.avaliacaoClinica;
    const linhas: string[] = [];
    if (c.naturezaClinica === "AVE") {
      linhas.push(
        `Horário início dos sintomas: ${c.horarioInicioSintomas ? formatarHorario(c.horarioInicioSintomas) : "não informado"}`
      );
      linhas.push(
        `Cincinnati — assimetria facial: ${c.cincinnatiAssimetriaFacial === undefined ? "não avaliado" : c.cincinnatiAssimetriaFacial ? "Sim" : "Não"}`
      );
      linhas.push(
        `Cincinnati — debilidade de braços: ${c.cincinnatiDebilidadeBracos === undefined ? "não avaliado" : c.cincinnatiDebilidadeBracos ? "Sim" : "Não"}`
      );
      linhas.push(
        `Cincinnati — fala anormal: ${c.cincinnatiFalaAnormal === undefined ? "não avaliado" : c.cincinnatiFalaAnormal ? "Sim" : "Não"}`
      );
    }
    if (c.naturezaClinica === "GLICEMIA") {
      linhas.push(`Glicemia capilar: ${c.glicemiaMgdl !== undefined ? `${c.glicemiaMgdl} mg/dl` : "não informado"}`);
    }
    if (c.naturezaClinica === "ANAFILAXIA") {
      linhas.push(`Hipotensão presente: ${c.hipotensao === undefined ? "não avaliado" : c.hipotensao ? "Sim" : "Não"}`);
      linhas.push(
        `Dispneia ou vômitos: ${c.dispneiaOuVomito === undefined ? "não avaliado" : c.dispneiaOuVomito ? "Sim" : "Não"}`
      );
    }
    linhas.push(`Responsivo: ${c.responsivo === undefined ? "não avaliado" : c.responsivo ? "Sim" : "Não"}`);
    if (c.glasgow?.total !== undefined) {
      linhas.push(`Glasgow: ${c.glasgow.total} (O:${c.glasgow.ocular} V:${c.glasgow.verbal} M:${c.glasgow.motora})`);
    }
    for (const linha of linhas) {
      doc.text(linha, margemEsquerda, y);
      y += 14;
    }
  } else {
    doc.text("Não preenchida.", margemEsquerda, y);
    y += 14;
  }
  y += 10;

  // SAMPLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Avaliação Secundária (SAMPLE)", margemEsquerda, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const s = atendimento.sample;
  const sampleLinhas = [
    ["Sinais e sintomas", s?.sinaisSintomas],
    ["Alergias", s?.alergias],
    ["Uso de medicação", s?.medicacao],
    ["Passado médico", s?.passadoMedico],
    ["Ingestão de líquidos/alimentos", s?.ingestao],
    ["Eventos relacionados", s?.eventos],
  ];
  for (const [label, valor] of sampleLinhas) {
    doc.text(`${label}: ${valor || "não informado"}`, margemEsquerda, y);
    y += 14;
  }
  y += 6;

  // Sinais vitais (tabela)
  if (y > 650) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Sinais Vitais", margemEsquerda, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Momento", "Horário", "FC", "FR", "PA", "Temp", "SatO2", "Glicemia"]],
    body: atendimento.sinaisVitais.map((v) => [
      v.momento === "INICIAL" ? "Inicial" : "Reavaliação",
      formatarHorario(v.horario),
      v.fcBpm ?? "—",
      v.frIrpm ?? "—",
      v.paSistolica && v.paDiastolica ? `${v.paSistolica}x${v.paDiastolica}` : "—",
      v.temperaturaC ?? "—",
      v.spo2Pct ?? "—",
      v.glicemiaMgdl ?? "—",
    ]),
    styles: { fontSize: 9 },
    margin: { left: margemEsquerda },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 20;

  // Procedimentos
  if (y > 650) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Procedimentos Realizados", margemEsquerda, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (atendimento.procedimentos.length === 0) {
    doc.text("Nenhum procedimento registrado.", margemEsquerda, y);
    y += 14;
  } else {
    for (const p of atendimento.procedimentos) {
      doc.text(`${formatarHorario(p.horario)} — ${p.nome}${p.observacao ? ` (${p.observacao})` : ""}`, margemEsquerda, y);
      y += 14;
    }
  }
  y += 6;

  // Reavaliações
  if (y > 650) {
    doc.addPage();
    y = 50;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Reavaliações", margemEsquerda, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (atendimento.reavaliacoes.length === 0) {
    doc.text("Nenhuma reavaliação registrada.", margemEsquerda, y);
    y += 14;
  } else {
    for (const r of atendimento.reavaliacoes) {
      const glasgowTexto = r.glasgow?.total !== undefined ? ` · Glasgow: ${r.glasgow.total}` : "";
      doc.text(`${formatarHorario(r.horario)} — ${r.alteracoes || "sem alterações relatadas"}${glasgowTexto}`, margemEsquerda, y);
      y += 14;
    }
  }

  return doc.output("blob");
}
