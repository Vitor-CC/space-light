/**
 * Checklist operacional da turma. A equipe define os itens de cada norma (um
 * por linha) e o instrutor marca na sala da turma. A marca guarda o texto do
 * item: se a lista da norma mudar, marca de item que saiu deixa de contar.
 */

export type ChecklistDaNorma = { nr: string; items: string };
export type MarcaDoChecklist = { training_id: string; item: string };

/** Itens de um texto, um por linha, sem linhas vazias nem repetidas. */
export function itensDoTexto(texto: string) {
  return [...new Set((texto ?? '').split(/\r?\n/).map((linha) => linha.trim().slice(0, 200)).filter(Boolean))];
}

/** Checklist de uma turma: os itens da norma dela, cada um com a marca. */
export function checklistDaTurma(training: { id: string; nr: string }, modelos: ChecklistDaNorma[], marcas: MarcaDoChecklist[]) {
  const modelo = modelos.find((m) => m.nr === training.nr);
  const feitos = new Set(marcas.filter((m) => m.training_id === training.id).map((m) => m.item));
  const itens = itensDoTexto(modelo?.items ?? '').map((texto) => ({ texto, feito: feitos.has(texto) }));
  return { itens, feitos: itens.filter((i) => i.feito).length, total: itens.length };
}
