import { redirect } from 'next/navigation';

/**
 * O autocadastro de empresa saiu em 2026-09-12: só a equipe Space cria o
 * acesso, com o nome de usuário que a empresa usa para entrar. Link antigo
 * (favorito, e-mail) cai direto no login.
 */
export default function ClientRegistrationPage() {
  redirect('/cliente/login');
}
