/** Documentos que a Space Light exige de todo instrutor antes de liberar o acesso. */
export const REQUIRED_INSTRUCTOR_DOCUMENTS = [
  {
    category: 'cnh',
    label: 'CNH',
    help: 'Foto ou digitalização da carteira de motorista, frente com a foto legível.',
  },
  {
    category: 'signature',
    label: 'Assinatura',
    help: 'Assinatura em papel branco, fotografada de cima. Ela vai nos documentos dos treinamentos.',
  },
  {
    category: 'mte',
    label: 'MTE ou RÉ',
    help: 'Registro no Ministério do Trabalho ou Registro de Especialidade.',
  },
] as const;

export type InstructorDocumentCategory = (typeof REQUIRED_INSTRUCTOR_DOCUMENTS)[number]['category'];

export const INSTRUCTOR_DOCUMENT_CATEGORIES = REQUIRED_INSTRUCTOR_DOCUMENTS.map(
  (item) => item.category,
) as readonly string[];

export function instructorDocumentLabel(category: string) {
  return REQUIRED_INSTRUCTOR_DOCUMENTS.find((item) => item.category === category)?.label ?? category;
}

export const INSTRUCTOR_DOCUMENT_STATUS: Record<string, { label: string; tone: 'pending' | 'ok' | 'bad' }> = {
  pending: { label: 'Aguardando análise', tone: 'pending' },
  approved: { label: 'Aprovado', tone: 'ok' },
  rejected: { label: 'Recusado', tone: 'bad' },
};
