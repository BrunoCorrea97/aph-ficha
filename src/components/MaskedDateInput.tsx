import { useEffect, useState } from "react";

/**
 * Campo de data de nascimento com teclado numérico (em vez do seletor de
 * calendário nativo) e máscara visual DD/MM/AAAA preenchida enquanto o
 * usuário digita. Guarda/recebe a data em ISO (AAAA-MM-DD) para o resto
 * do app, convertendo internamente.
 *
 * Usa ano com 4 dígitos (não 2) de propósito — "DD/MM/AA" com ano de 2
 * dígitos é ambíguo (ex.: "30" poderia ser 1930 ou 2030), o que é
 * arriscado numa ficha de atendimento.
 */
function digitosParaIso(digitos: string): string | undefined {
  if (digitos.length !== 8) return undefined;
  const dia = digitos.slice(0, 2);
  const mes = digitos.slice(2, 4);
  const ano = digitos.slice(4, 8);
  return `${ano}-${mes}-${dia}`;
}

function isoParaDigitos(iso: string | undefined): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}${mes}${ano}`;
}

function digitosParaMascara(digitos: string): string {
  const dia = digitos.slice(0, 2);
  const mes = digitos.slice(2, 4);
  const ano = digitos.slice(4, 8);
  let resultado = dia;
  if (digitos.length > 2) resultado += `/${mes}`;
  if (digitos.length > 4) resultado += `/${ano}`;
  return resultado;
}

export function MaskedDateInput({
  valor,
  onChange,
}: {
  valor: string | undefined;
  onChange: (isoOuUndefined: string | undefined) => void;
}) {
  const [digitos, setDigitos] = useState(() => isoParaDigitos(valor));

  // Mantém sincronizado se o valor externo mudar (ex.: limpar o formulário).
  useEffect(() => {
    setDigitos(isoParaDigitos(valor));
  }, [valor]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const apenasDigitos = e.target.value.replace(/\D/g, "").slice(0, 8);
    setDigitos(apenasDigitos);
    onChange(digitosParaIso(apenasDigitos));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="DD/MM/AAAA"
      value={digitosParaMascara(digitos)}
      onChange={handleChange}
      className="alvo-toque valor-numerico w-full rounded-lg border border-border bg-surface px-4 text-lg text-text placeholder:text-text-muted/50"
    />
  );
}
