import type { Atendimento } from "../db/database";

/**
 * Decide o link do Google Maps a partir do que foi preenchido:
 *   - Com coordenadas de GPS (localLatitude/localLongitude): aponta
 *     exatamente para o pino daquele ponto.
 *   - Só com texto (digitado manualmente, sem coordenadas — caso comum
 *     na versão HTML standalone, onde o GPS costuma não funcionar):
 *     abre uma busca no Google Maps por esse texto.
 *   - Sem nada preenchido: undefined (nenhum link a mostrar).
 */
export function gerarLinkMaps(atendimento: Pick<Atendimento, "local" | "localLatitude" | "localLongitude">): string | undefined {
  if (atendimento.localLatitude !== undefined && atendimento.localLongitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${atendimento.localLatitude},${atendimento.localLongitude}`;
  }
  if (atendimento.local?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(atendimento.local.trim())}`;
  }
  return undefined;
}
