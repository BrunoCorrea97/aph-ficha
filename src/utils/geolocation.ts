export interface ResultadoLocalizacao {
  texto: string;
  latitude: number;
  longitude: number;
}

/**
 * Obtém a localização atual do dispositivo. Tenta traduzir as
 * coordenadas em um endereço legível (via Nominatim/OpenStreetMap, uma
 * API pública gratuita) quando há conexão; se isso falhar (sem internet,
 * limite de uso etc.), usa as coordenadas brutas — nunca trava por causa
 * disso, já que o GPS em si não depende de internet.
 *
 * Lança erro com mensagem amigável quando a Geolocation API não está
 * disponível (comum em arquivos HTML abertos localmente — navegadores
 * bloqueiam GPS fora de https/localhost) ou quando a permissão é negada.
 */
export function obterLocalizacaoAtual(): Promise<ResultadoLocalizacao> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(
        new Error(
          "Geolocalização não disponível neste contexto (comum em arquivos HTML abertos localmente — funciona no link publicado)."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        const { latitude, longitude } = posicao.coords;
        const coordenadasTexto = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const resposta = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal, headers: { Accept: "application/json" } }
          );
          clearTimeout(timeout);
          if (!resposta.ok) throw new Error("reverse geocode falhou");
          const dados = await resposta.json();
          const endereco = dados?.display_name as string | undefined;
          resolve({
            texto: endereco ? `${endereco} (${coordenadasTexto})` : coordenadasTexto,
            latitude,
            longitude,
          });
        } catch {
          // Sem internet ou serviço indisponível — usa só as coordenadas.
          resolve({ texto: coordenadasTexto, latitude, longitude });
        }
      },
      (erro) => {
        const mensagens: Record<number, string> = {
          1: "Permissão de localização negada.",
          2: "Localização indisponível no momento.",
          3: "Tempo esgotado ao tentar obter a localização.",
        };
        reject(new Error(mensagens[erro.code] ?? "Não foi possível obter a localização."));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
