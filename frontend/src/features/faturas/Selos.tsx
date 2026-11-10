import { Selo } from '@/components/ui/Feedback';
import { ROTULOS_DE_ORIGEM, type Fatura } from './fatura';
import { SITUACOES, type Situacao } from './processamento';

export function SeloDeSituacao({ situacao }: { situacao: Situacao }) {
  const { rotulo, tom } = SITUACOES[situacao];
  return (
    <Selo tom={tom} ponto>
      {rotulo}
    </Selo>
  );
}

export function SeloDeOrigem({ fatura }: { fatura: Fatura }) {
  return fatura.origem === 'PROTHEUS' ? (
    <Selo tom="tech">{ROTULOS_DE_ORIGEM.PROTHEUS}</Selo>
  ) : (
    <Selo>Link</Selo>
  );
}
