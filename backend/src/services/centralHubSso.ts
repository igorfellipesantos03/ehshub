import axios from 'axios';
import { ENV } from '../config/env';

export interface IdentidadeCentralHub {
  username: string;
  name: string;
  email: string | null;
}

/**
 * Troca o código recebido no callback pela identidade do usuário no CentralHub.
 * Servidor a servidor, via 127.0.0.1, com o client secret — nada disso passa
 * pelo navegador. Devolve null quando o código é inválido, expirou ou já foi
 * usado.
 */
export async function resgatarCodigo(code: string): Promise<IdentidadeCentralHub | null> {
  if (!ENV.SSO_CLIENT_SECRET) {
    throw new Error('SSO_CLIENT_SECRET não configurado.');
  }

  try {
    const { data } = await axios.post(
      `${ENV.CENTRALHUB_INTERNAL_URL}/internal/sso/token`,
      { client_id: ENV.SSO_CLIENT_ID, client_secret: ENV.SSO_CLIENT_SECRET, code },
      { timeout: 10000 }
    );
    return data.user;
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 401 || status === 403) return null;
    throw err;
  }
}
