'use client';

import { useId, useState, type FormEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Botao } from '@/components/ui/Botao';
import { Input } from '@/components/ui/Campo';
import { Aviso } from '@/components/ui/Feedback';
import { CAMPOS_DE_DETALHE, GRUPOS_DE_DETALHE, empresaDaFatura, type Fatura } from './fatura';

interface ModalEditarFaturaProps {
  fatura: Fatura;
  aoFechar: () => void;
  aoSalvar: (dados: Partial<Fatura>) => void;
  salvando: boolean;
  erro?: string | null;
}

type Formulario = Record<string, string>;

const CAMPOS_PRINCIPAIS = ['emitente', 'local', 'faturaNumber', 'dataEmissao', 'valorFatura', 'consumoKwh'] as const;

// Passa os valores da fatura (ou do backup da IA) para texto de formulário.
const paraFormulario = (origem: Partial<Record<keyof Fatura, unknown>>, campos: readonly (keyof Fatura)[]) =>
  Object.fromEntries(
    campos.map((campo) => [campo, origem[campo] === null || origem[campo] === undefined ? '' : String(origem[campo])]),
  ) as Formulario;

const numeroOuNulo = (texto: string) => (texto.trim() === '' ? null : Number(texto));

export function ModalEditarFatura({ fatura, aoFechar, aoSalvar, salvando, erro }: ModalEditarFaturaProps) {
  const formularioId = useId();
  const camposDeDetalhe = CAMPOS_DE_DETALHE.map(({ campo }) => campo);
  const [dados, setDados] = useState<Formulario>(() => paraFormulario(fatura, [...CAMPOS_PRINCIPAIS, ...camposDeDetalhe]));
  const [semBackup, setSemBackup] = useState(false);

  const mudar = (campo: string, valor: string) => setDados((atual) => ({ ...atual, [campo]: valor }));

  // Volta os campos para o que a IA extraiu. O local não vem da IA, então fica como está.
  function redefinir() {
    if (!fatura.originalData) {
      setSemBackup(true);
      return;
    }
    const camposDaIa = [...CAMPOS_PRINCIPAIS.filter((campo) => campo !== 'local'), ...camposDeDetalhe];
    setDados((atual) => ({ ...atual, ...paraFormulario(fatura.originalData ?? {}, camposDaIa) }));
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    aoSalvar({
      emitente: dados.emitente || null,
      local: dados.local || null,
      faturaNumber: dados.faturaNumber || null,
      dataEmissao: dados.dataEmissao || null,
      valorFatura: Number(dados.valorFatura) || 0,
      consumoKwh: numeroOuNulo(dados.consumoKwh),
      ...Object.fromEntries(
        CAMPOS_DE_DETALHE.map(({ campo, tipo }) => [
          campo,
          tipo === 'texto' ? dados[campo].trim() || null : numeroOuNulo(dados[campo]),
        ]),
      ),
    });
  }

  return (
    <Modal
      titulo="Editar fatura"
      descricao={empresaDaFatura(fatura)}
      aoFechar={salvando ? () => {} : aoFechar}
      largura="max-w-2xl"
      rodape={
        <>
          <Botao icone={RotateCcw} onClick={redefinir} disabled={salvando} className="mr-auto">
            Redefinir para a IA
          </Botao>
          <Botao onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form={formularioId} variante="primario" carregando={salvando}>
            Salvar alterações
          </Botao>
        </>
      }
    >
      <form id={formularioId} onSubmit={enviar} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input rotulo="Emitente" value={dados.emitente} onChange={(e) => mudar('emitente', e.target.value)} />
          <Input rotulo="Local" value={dados.local} onChange={(e) => mudar('local', e.target.value)} />
          <Input
            rotulo="Nº da fatura"
            value={dados.faturaNumber}
            onChange={(e) => mudar('faturaNumber', e.target.value)}
            className="font-mono"
          />
          <Input
            rotulo="Data de emissão"
            value={dados.dataEmissao}
            onChange={(e) => mudar('dataEmissao', e.target.value)}
            placeholder="DD/MM/AAAA"
          />
          <Input
            rotulo="Valor da fatura (R$)"
            type="number"
            step="0.01"
            value={dados.valorFatura}
            onChange={(e) => mudar('valorFatura', e.target.value)}
          />
          <Input
            rotulo="Consumo total (kWh)"
            type="number"
            step="0.001"
            value={dados.consumoKwh}
            onChange={(e) => mudar('consumoKwh', e.target.value)}
          />
        </div>

        {GRUPOS_DE_DETALHE.map((grupo) => (
          <fieldset key={grupo.titulo} className="border-t border-hairline pt-5">
            <legend className="float-left mb-3 text-sm font-bold text-white">{grupo.titulo}</legend>
            <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-2">
              {grupo.campos.map(({ campo, rotulo, tipo }) => (
                <Input
                  key={campo}
                  rotulo={rotulo}
                  type={tipo === 'texto' ? 'text' : 'number'}
                  step={tipo === 'texto' ? undefined : tipo === 'inteiro' ? '1' : '0.001'}
                  value={dados[campo]}
                  onChange={(e) => mudar(campo, e.target.value)}
                  placeholder={campo === 'mesReferencia' ? 'MM/AAAA' : undefined}
                />
              ))}
            </div>
          </fieldset>
        ))}

        {semBackup && <Aviso>Esta fatura não tem dados originais da IA para restaurar.</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </form>
    </Modal>
  );
}
