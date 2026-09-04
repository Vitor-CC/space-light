import { zip } from 'fflate';

export type ZipEntry = { id: string; name: string };

/** Evita que dois arquivos com o mesmo nome se sobrescrevam dentro do .zip. */
function uniqueName(name: string, used: Set<string>) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Baixa os arquivos um a um pelo próprio site (que checa permissão) e monta o
 * .zip no navegador. Fazer isso no servidor esbarraria no limite de 4,5 MB de
 * resposta de uma função da Vercel.
 */
export async function downloadFilesAsZip(input: {
  entries: ZipEntry[];
  zipName: string;
  onProgress?: (done: number, total: number) => void;
}) {
  const used = new Set<string>();
  const contents: Record<string, Uint8Array> = {};
  const failed: string[] = [];

  for (const [index, entry] of input.entries.entries()) {
    input.onProgress?.(index, input.entries.length);
    try {
      const response = await fetch(`/api/files/${entry.id}?download=1`);
      if (!response.ok) throw new Error(String(response.status));
      const buffer = new Uint8Array(await response.arrayBuffer());
      contents[uniqueName(entry.name, used)] = buffer;
    } catch {
      failed.push(entry.name);
    }
  }
  input.onProgress?.(input.entries.length, input.entries.length);

  if (Object.keys(contents).length === 0) {
    throw new Error('Nenhum arquivo pôde ser baixado.');
  }

  const archive = await new Promise<Uint8Array>((resolve, reject) => {
    zip(contents, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)));
  });

  const blob = new Blob([archive as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = input.zipName.endsWith('.zip') ? input.zipName : `${input.zipName}.zip`;
  link.click();
  URL.revokeObjectURL(url);

  return { zipped: Object.keys(contents).length, failed };
}
