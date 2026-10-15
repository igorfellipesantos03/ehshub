import axios from 'axios';
import { ENV } from '../config/env';

export class CredenciaisProtheusInvalidas extends Error {}
export class ProtheusIndisponivel extends Error {}

/**
 * Confere usuário e senha no OAuth2 do Protheus (mesma rota que o CentralHub
 * usa no login). O token devolvido é descartado: o EHS HUB só precisa saber
 * que a credencial é válida, não conversa com o Protheus depois disso.
 */
export async function validarCredenciais(username: string, password: string): Promise<void> {
  try {
    const { data } = await axios.post(
      `${ENV.PROTHEUS_BASE_URL}/rest/api/oauth2/v1/token?grant_type=password`,
      new URLSearchParams({ username, password }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: ENV.PROTHEUS_TIMEOUT_MS,
      }
    );

    if (!data?.access_token) throw new ProtheusIndisponivel('Protheus respondeu sem access_token');
  } catch (err: any) {
    if (err instanceof ProtheusIndisponivel) throw err;

    const status = err.response?.status;
    if (status === 401 || status === 403) throw new CredenciaisProtheusInvalidas();

    console.error('Falha ao consultar o Protheus:', status ?? err.code);
    throw new ProtheusIndisponivel();
  }
}
