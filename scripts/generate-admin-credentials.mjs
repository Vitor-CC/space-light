// Gera SPACE_ADMIN_PASSWORD_HASH e SPACE_ADMIN_PASSWORD_SALT a partir de uma senha.
//
// Usa exatamente o mesmo algoritmo de lib/password-auth.ts (PBKDF2 SHA-256,
// 210.000 iterações, salt de 18 bytes, saída em base64url).
//
// Uso:
//   node scripts/generate-admin-credentials.mjs "SuaSenhaForteAqui"
//
// Copie os valores impressos para as variáveis de ambiente (Vercel / .env.local).
// Nunca versione a senha em texto puro nem os valores gerados.

const PASSWORD_ITERATIONS = 210_000;

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(18));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PASSWORD_ITERATIONS },
    baseKey,
    256,
  );
  return {
    passwordHash: bytesToBase64Url(new Uint8Array(bits)),
    passwordSalt: bytesToBase64Url(salt),
  };
}

const password = process.argv[2];
if (!password) {
  console.error('Erro: informe a senha.\nUso: node scripts/generate-admin-credentials.mjs "SuaSenha"');
  process.exit(1);
}

const { passwordHash, passwordSalt } = await hashPassword(password);
console.log('\nAdicione estas variáveis de ambiente (não versione os valores):\n');
console.log(`SPACE_ADMIN_PASSWORD_HASH="${passwordHash}"`);
console.log(`SPACE_ADMIN_PASSWORD_SALT="${passwordSalt}"`);
console.log('\nTambém defina SPACE_ADMIN_EMAIL com o e-mail do administrador.\n');
