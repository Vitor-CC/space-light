import { LoginUnificado, type LoginPortal } from '@/components/auth/login-unificado';
import { MolduraAcesso } from '@/components/auth/moldura-acesso';

export type { LoginPortal };

/**
 * As três portas antigas (/cliente/login, /instrutor/login, /empresa/login)
 * abrem o mesmo login unificado, já com o perfil certo marcado.
 */
export function ClientLogin({ status, portal = 'client' }: { status?: string; portal?: LoginPortal }) {
  return <MolduraAcesso><LoginUnificado portal={portal} status={status} /></MolduraAcesso>;
}
