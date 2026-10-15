import Swal from 'sweetalert2';
import api from '@/lib/api';

const ESTILO = {
  background: '#0B1120',
  color: '#f8fafc',
  confirmButtonColor: '#3b82f6',
  cancelButtonColor: '#475569',
  customClass: {
    popup: 'border border-slate-800 rounded-3xl',
    confirmButton: 'rounded-xl px-5 py-2.5 font-semibold',
    cancelButton: 'rounded-xl px-5 py-2.5 font-semibold',
  },
};

/**
 * Após o login local, oferece vincular o usuário do Protheus à conta. Com o
 * vínculo, a pessoa passa a entrar no EHS HUB direto pelo CentralHub (SSO).
 * A senha vai só para o backend, que confere no Protheus e a descarta.
 */
export async function perguntarVinculoProtheus(): Promise<void> {
  const pergunta = await Swal.fire({
    ...ESTILO,
    title: 'Você possui login no Protheus?',
    text: 'Vinculando seu usuário do Protheus, você poderá entrar no EHS HUB direto pelo CentralHub, sem digitar senha.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sim',
    cancelButtonText: 'Não',
  });

  if (!pergunta.isConfirmed) return;

  const vinculo = await Swal.fire({
    ...ESTILO,
    title: 'Vincular usuário do Protheus',
    html: `
      <p style="font-size:14px;color:#94a3b8;margin-bottom:8px">Use o mesmo usuário e senha do Protheus.</p>
      <input id="protheus-usuario" class="swal2-input" placeholder="nome.sobrenome" autocomplete="off">
      <input id="protheus-senha" class="swal2-input" type="password" placeholder="Senha do Protheus" autocomplete="off">
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Vincular',
    cancelButtonText: 'Agora não',
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    didOpen: () => document.getElementById('protheus-usuario')?.focus(),
    preConfirm: async () => {
      const username = (document.getElementById('protheus-usuario') as HTMLInputElement).value.trim();
      const password = (document.getElementById('protheus-senha') as HTMLInputElement).value;

      if (!username || !password) {
        Swal.showValidationMessage('Informe usuário e senha do Protheus.');
        return false;
      }

      try {
        await api.post('/auth/protheus/link', { username, password });
        return true;
      } catch (err: any) {
        Swal.showValidationMessage(err.response?.data?.error || 'Não foi possível vincular. Tente novamente.');
        return false;
      }
    },
  });

  if (!vinculo.isConfirmed) return;

  const user = JSON.parse(localStorage.getItem('@EHS:user') || '{}');
  localStorage.setItem('@EHS:user', JSON.stringify({ ...user, protheusLinked: true }));

  await Swal.fire({
    ...ESTILO,
    title: 'Protheus vinculado!',
    text: 'A partir de agora você também pode entrar pelo CentralHub.',
    icon: 'success',
    timer: 2200,
    showConfirmButton: false,
  });
}
