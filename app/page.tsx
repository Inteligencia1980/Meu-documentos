'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { db } from '../firebase';

interface Processo {
  id?: string;
  numero_processo: string;
  tipo_servico: string;
  status: string;
  bairro: string;
  local: string;
  categoria: string;
  solicitante: string;
  data_solicitacao: string;
  situacao: string;
  informacoes: string;
  situacao_detalhada: string;
  resumo_pdf?: string;
}

export default function Page() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [novo, setNovo] = useState<Processo>({
    numero_processo: '', tipo_servico: '', status: '', bairro: '', local: '', categoria: '',
    solicitante: '', data_solicitacao: '', situacao: '', informacoes: '', situacao_detalhada: '', resumo_pdf: ''
  });

  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroBairro, setFiltroBairro] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'processos'));
      const lista: Processo[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Processo));
      setProcessos(lista);
    };
    fetchData();
  }, []);

  async function exportarZip() {
    const zip = new JSZip();
    const filtrados = processos.filter(p =>
      (!filtroStatus || p.status === filtroStatus) &&
      (!filtroBairro || p.bairro === filtroBairro)
    );

    if (filtrados.length === 0) {
      alert('Nenhum processo encontrado com os filtros.');
      return;
    }

    for (const proc of filtrados) {
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(`Laudo do Processo - Nº ${proc.numero_processo || 'Não informado'}`, 14, 20);

      const texto = [
        `Número: ${proc.numero_processo || 'Não informado'}`,
        `Tipo de Serviço: ${proc.tipo_servico || 'Não informado'}`,
        `Status: ${proc.status || 'Não informado'}`,
        `Bairro: ${proc.bairro || 'Não informado'}`,
        `Local: ${proc.local || 'Não informado'}`,
        `Solicitante: ${proc.solicitante || 'Não informado'}`,
        `Data Solicitação: ${proc.data_solicitacao || 'Não informado'}`,
        `Situação: ${proc.situacao || 'Não informado'}`,
        `Categoria: ${proc.categoria || 'Não informado'}`,
        `Informações: ${proc.informacoes || 'Não informado'}`,
        `Detalhes: ${proc.situacao_detalhada || 'Não informado'}`,
        'Resumo:',
        ...(proc.resumo_pdf?.match(/.{1,80}/g) || ['(sem resumo)'])
      ];

      let y = 30;
      texto.forEach(linha => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(linha, 14, y);
        y += 8;
      });

      const blob = doc.output('blob');
      zip.file(`processo_${proc.numero_processo || 'sem-numero'}.pdf`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processos_filtrados.zip';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Visualização de Processos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <input className="border p-2 rounded" placeholder="Número" value={novo.numero_processo} onChange={e => setNovo({ ...novo, numero_processo: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Tipo de Serviço" value={novo.tipo_servico} onChange={e => setNovo({ ...novo, tipo_servico: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Status" value={novo.status} onChange={e => setNovo({ ...novo, status: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Bairro" value={novo.bairro} onChange={e => setNovo({ ...novo, bairro: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Local" value={novo.local} onChange={e => setNovo({ ...novo, local: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Categoria" value={novo.categoria} onChange={e => setNovo({ ...novo, categoria: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Solicitante" value={novo.solicitante} onChange={e => setNovo({ ...novo, solicitante: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Data Solicitação" value={novo.data_solicitacao} onChange={e => setNovo({ ...novo, data_solicitacao: e.target.value })} />
        <textarea className="border p-2 rounded" placeholder="Situação" value={novo.situacao} onChange={e => setNovo({ ...novo, situacao: e.target.value })} />
        <textarea className="border p-2 rounded" placeholder="Informações" value={novo.informacoes} onChange={e => setNovo({ ...novo, informacoes: e.target.value })} />
        <textarea className="border p-2 rounded" placeholder="Situação Detalhada" value={novo.situacao_detalhada} onChange={e => setNovo({ ...novo, situacao_detalhada: e.target.value })} />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={async () => {
            if (!novo.numero_processo || !novo.tipo_servico || !novo.status) {
              alert('Preencha os campos obrigatórios.');
              return;
            }
            const docRef = await addDoc(collection(db, 'processos'), novo);
            setProcessos(prev => [...prev, { id: docRef.id, ...novo }]);
            setNovo({
              numero_processo: '', tipo_servico: '', status: '', bairro: '', local: '', categoria: '',
              solicitante: '', data_solicitacao: '', situacao: '', informacoes: '', situacao_detalhada: '', resumo_pdf: ''
            });
          }}
        >
          ➕ Adicionar Processo
        </button>
      </div>

      <div className="flex gap-4 flex-wrap mb-4">
        <select className="border p-2 rounded" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="Aberto">Aberto</option>
          <option value="Pendente">Pendente</option>
          <option value="Concluído">Concluído</option>
        </select>
        <select className="border p-2 rounded" value={filtroBairro} onChange={e => setFiltroBairro(e.target.value)}>
          <option value="">Todos os Bairros</option>
          {Array.from(new Set(processos.map(p => p.bairro))).map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <button onClick={exportarZip} className="bg-indigo-600 text-white px-4 py-2 rounded">📁 Exportar ZIP</button>
      </div>

      {processos.filter(p =>
        (!filtroStatus || p.status === filtroStatus) &&
        (!filtroBairro || p.bairro === filtroBairro)
      ).map(proc => (
        <div key={proc.id} className="border p-4 rounded shadow bg-white">
          <p><strong>Número:</strong> {proc.numero_processo}</p>
          <p><strong>Serviço:</strong> {proc.tipo_servico}</p>
          <p><strong>Status:</strong> {proc.status}</p>
          <p><strong>Resumo IA:</strong> {proc.resumo_pdf}</p>
        </div>
      ))}
    </div>
  );
}