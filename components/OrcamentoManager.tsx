import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Orcamento, OrcamentoItem, ConfiguracaoEmpresa, CampoExtra } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  X, 
  Printer, 
  Eye, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronDown, 
  Building2, 
  User, 
  MapPin, 
  ClipboardList, 
  Calendar,
  Layout
} from 'lucide-react';

interface OrcamentoManagerProps {
  orcamentos: Orcamento[];
  setOrcamentos: React.Dispatch<React.SetStateAction<Orcamento[]>>;
  onNavigateToReports: () => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const formatInputCurrency = (value: number): string => {
  if (!value && value !== 0) return '';
  return (value / 1).toFixed(2).replace('.', ',');
};

const parseCurrencyInput = (raw: string): number => {
  const cleanValue = raw.replace(/[^\d]/g, '');
  if (!cleanValue) return 0;
  return Number(cleanValue) / 100;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const today = () => new Date().toLocaleDateString('en-CA');

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'Aguardando Cliente': {
    label: 'Aguardando Cliente',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Clock size={12} />,
  },
  'Efetivado': {
    label: 'Efetivado',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 size={12} />,
  },
  'Não concluído': {
    label: 'Não concluído',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: <XCircle size={12} />,
  },
};

// ==============================================================
// PRINT LAYOUT COMPONENT
// ==============================================================
const OrcamentoPrintView: React.FC<{ orcamento: Orcamento, company: ConfiguracaoEmpresa | null }> = ({ orcamento, company }) => {
  const total = (orcamento.items || []).reduce((acc, i) => acc + i.value, 0);

  // Função para formatar data por extenso
  const formatDataExtenso = (dataStr: string) => {
    const data = new Date(dataStr + 'T12:00:00'); 
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `Bauru/SP, ${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
  };
  
  // Dados fallback caso não existam no banco
  const companyData = company || {
    nome_fantasia: 'TERRAPLANAGEM BAURU',
    cnpj: '54.148.867/0001-18',
    inscricao_municipal: '641024',
    endereco: 'Rua Batista de Carvalho, 4-33, Centro, Bauru/SP',
    telefone: '(14) 99188-5658',
    email: 'terraplanagembauru@gmail.com'
  };

  return (
    <div className="print-container font-sans text-slate-800 max-w-3xl mx-auto">
      {/* 
          Usamos uma tabela mestre para que o thead (cabeçalho) 
          se repita automaticamente em todas as páginas impressas.
      */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <td className="p-0 border-0">
              <div className="header-spacer h-4 print:block hidden"></div>
              {/* Header Real */}
              <div className="border-b-4 border-amber-500 pb-4 mb-6">
                <div className="flex items-start justify-between">
                  {/* Lado Esquerdo: Dados da Empresa */}
                  <div className="flex flex-col gap-3 max-w-[60%]">
                    {companyData.logo_url && (
                      <img src={companyData.logo_url} alt="Logo" className="h-20 w-auto object-contain self-start" />
                    )}
                    {!companyData.logo_url && (
                      <div className="text-2xl font-black text-slate-900 leading-none">{companyData.nome_fantasia}</div>
                    )}
                    
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                        {companyData.cnpj && `CNPJ: ${companyData.cnpj}`} {companyData.inscricao_municipal && `| I.M.: ${companyData.inscricao_municipal}`}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        <p>{companyData.endereco}</p>
                        <p>Fone: {companyData.telefone} | Email: {companyData.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Dados do Orçamento */}
                  <div className="text-right pt-1">
                    <div className="text-3xl font-black text-amber-500 leading-none">ORÇAMENTO</div>
                    <div className="text-xl font-black text-slate-800 tracking-tighter mt-1">Nº {String(orcamento.numero).padStart(3, '0')}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight">Emitido em: {formatDate(orcamento.dataEmissao)}</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="p-0 border-0">
              {/* Client info */}
              <div className="rounded-xl p-5 mb-6 border border-slate-200 break-inside-avoid">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center">
                  <User size={14} className="mr-1.5" /> Dados do Cliente
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 font-bold">Nome / Razão Social</span>
                    <p className="font-bold text-slate-900 mt-0.5">{orcamento.nome}</p>
                  </div>
                  {orcamento.cpfCnpj && (
                    <div>
                      <span className="text-xs text-slate-500 font-bold">CPF / CNPJ</span>
                      <p className="font-bold text-slate-900 mt-0.5">{orcamento.cpfCnpj}</p>
                    </div>
                  )}
                  {orcamento.endereco && (
                    <div className="col-span-2">
                      <span className="text-xs text-slate-500 font-bold">Endereço</span>
                      <p className="font-bold text-slate-900 mt-0.5">{orcamento.endereco}</p>
                    </div>
                  )}
                  {orcamento.dadosComplementares && (
                    <div className="col-span-2">
                      <span className="text-xs text-slate-500 font-bold">Dados Complementares</span>
                      <p className="text-slate-700 mt-0.5">{orcamento.dadosComplementares}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              {(orcamento.items || []).some(item => item.description.trim() !== '') && (
                <div className="mb-6 break-inside-avoid-page">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center">
                    <ClipboardList size={14} className="mr-1.5" /> Descrição dos Serviços
                  </h3>
                  <table className="w-full border border-slate-200 rounded-xl overflow-hidden text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="px-4 py-2.5 text-left font-bold border-r border-slate-700">Descrição</th>
                        <th className="px-4 py-2.5 text-right font-bold w-40">Valor Unitário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orcamento.items || []).filter(item => item.description.trim() !== '').map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-2.5 border-r border-slate-100 whitespace-pre-wrap">{item.description}</td>
                          <td className="px-4 py-2.5 text-right font-bold">
                            {item.value > 0 ? formatCurrency(item.value) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {!orcamento.ocultarTotal && (
                      <tfoot>
                        <tr className="bg-amber-50 border-t-2 border-amber-400">
                          <td className="px-4 py-3 font-black text-slate-800 uppercase text-sm border-r border-amber-100">TOTAL GERAL</td>
                          <td className="px-4 py-3 text-right font-black text-amber-700 text-lg">{formatCurrency(total)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Campos Extras Dinâmicos */}
              {orcamento.camposExtras?.filter(c => c.ativo && (c.titulo || c.descricao)).map((campo) => (
                <div key={campo.id} className="mb-6 border border-slate-200 rounded-xl p-5 break-inside-avoid">
                  {campo.titulo && <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Layout size={12} className="text-slate-400" /> {campo.titulo}
                  </div>}
                  <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {campo.descricao}
                  </div>
                </div>
              ))}

              {/* Payment & Details */}
              <div className="grid grid-cols-2 gap-4 mb-6 break-inside-avoid">
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Pagamento</h4>
                  <p className="text-sm"><span className="font-bold">Forma:</span> {orcamento.formaPagamento}</p>
                  <p className="text-sm mt-1"><span className="font-bold">Condição:</span> {orcamento.condicaoPagamento}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                    <Calendar size={12} className="mr-1" /> Início dos Serviços
                  </h4>
                  <p className="text-sm font-bold text-slate-800">{orcamento.inicioServicos}</p>
                </div>
              </div>

              {orcamento.informacoesComplementares && orcamento.informacoesComplementares.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 break-inside-avoid">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-2">Informações Complementares</h4>
                  <div className="space-y-3">
                    {orcamento.informacoesComplementares.map((info, i) => (
                      <p key={i} className="text-sm text-slate-700 whitespace-pre-wrap">{info}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer e Assinatura */}
              <div className="border-t-2 border-slate-200 pt-6 mt-8 break-inside-avoid">
                <div className="flex flex-col gap-1 text-sm text-slate-500 font-medium">
                  <p>Orçamento válido por 30 dias a partir da data de emissão.</p>
                  <p>Empresa Optante Simples Nacional</p>
                  <div className="mt-4 pt-4 border-t border-slate-100/50">
                    <p className="text-slate-800 font-bold text-base">{formatDataExtenso(orcamento.dataEmissao)}</p>
                  </div>
                </div>
                <div className="mt-12 flex justify-center">
                  <div className="text-center max-w-sm w-full">
                    {companyData.assinatura_tipo === 'imagem' && companyData.assinatura_url ? (
                      <img src={companyData.assinatura_url} alt="Assinatura" className="h-16 mx-auto mb-1 object-contain" />
                    ) : (
                      <div className="signature text-2xl text-blue-900 mb-1">
                        {companyData.responsavel_assinatura_digital || companyData.nome_fantasia}
                      </div>
                    )}
                    <div className="border-t border-slate-400 pt-2 text-sm text-slate-800 font-bold">
                      {companyData.responsavel_nome || companyData.nome_fantasia}
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ==============================================================
// MAIN COMPONENT
// ==============================================================
const OrcamentoManager: React.FC<OrcamentoManagerProps> = ({ orcamentos, setOrcamentos, onNavigateToReports }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'print'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyConfig, setCompanyConfig] = useState<ConfiguracaoEmpresa | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('configuracao_empresa').select('*').limit(1).single();
      if (data) setCompanyConfig(data);
    };
    fetchConfig();
  }, []);

  // Auto-focus the date field whenever the modal opens in add/edit mode
  useEffect(() => {
    if (isModalOpen && modalMode !== 'print') {
      const timer = setTimeout(() => dateInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, modalMode]);

  const emptyForm = (): Partial<Orcamento> => ({
    nome: '',
    cpfCnpj: '',
    endereco: '',
    dadosComplementares: '',
    items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
    formaPagamento: 'A Vista',
    condicaoPagamento: 'Pix',
    inicioServicos: 'A Combinar com o cliente',
    informacoesComplementares: [],
    camposExtras: [],
    dataEmissao: today(),
    status: 'Aguardando Cliente',
    efetivadoInfo: '',
    ocultarTotal: false,
  });

  const [formData, setFormData] = useState<Partial<Orcamento>>(emptyForm());

  const filteredOrcamentos = useMemo(() => {
    return orcamentos
      .filter(o => {
        const matchSearch =
          String(o.numero).includes(searchTerm) ||
          o.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.numero - a.numero);
  }, [orcamentos, searchTerm, statusFilter]);

  const getNextNumber = async (): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('orcamento_config')
        .select('id, proximo_numero')
        .limit(1)
        .single();

      if (error || !data) return 118;

      const nextNum = data.proximo_numero;

      await supabase
        .from('orcamento_config')
        .update({ proximo_numero: nextNum + 1 })
        .eq('id', data.id);

      return nextNum;
    } catch {
      return Date.now(); // fallback
    }
  };

  const handleOpenAdd = async () => {
    const nextNum = await getNextNumber();
    setEditingId(null);
    setModalMode('add');
    setFormData({ ...emptyForm(), numero: nextNum });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (o: Orcamento, mode: 'edit' | 'view' | 'print') => {
    setEditingId(o.id);
    setModalMode(mode);
    setFormData({ ...o });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view' || modalMode === 'print') {
      if (modalMode === 'print') window.print();
      else setIsModalOpen(false);
      return;
    }

    if (!formData.nome || !formData.dataEmissao) {
      return alert('Preencha o Nome e a Data de Emissão.');
    }

    const orcData: Orcamento = {
      id: editingId || crypto.randomUUID(),
      numero: formData.numero!,
      nome: formData.nome!,
      cpfCnpj: formData.cpfCnpj || '',
      endereco: formData.endereco || '',
      dadosComplementares: formData.dadosComplementares || '',
      items: formData.items || [],
      formaPagamento: formData.formaPagamento || 'A Vista',
      condicaoPagamento: formData.condicaoPagamento || 'Pix',
      inicioServicos: formData.inicioServicos || 'A Combinar com o cliente',
      informacoesComplementares: formData.informacoesComplementares || [],
      camposExtras: formData.camposExtras || [],
      dataEmissao: formData.dataEmissao!,
      status: formData.status || 'Aguardando Cliente',
      efetivadoInfo: formData.status === 'Efetivado' ? (formData.efetivadoInfo || '') : '',
      ocultarTotal: !!formData.ocultarTotal,
      createdAt: Date.now(),
    };

    if (editingId) {
      setOrcamentos(prev => prev.map(o => o.id === editingId ? orcData : o));
    } else {
      setOrcamentos(prev => [orcData, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setOrcamentos(prev => prev.filter(o => o.id !== id));
    setDeleteConfirmId(null);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { id: crypto.randomUUID(), description: '', value: 0 }],
    }));
  };

  const removeItem = (id: string) => {
    if ((formData.items?.length || 0) <= 1) return;
    setFormData(prev => ({ ...prev, items: prev.items?.filter(i => i.id !== id) }));
  };

  const updateItem = (id: string, field: keyof OrcamentoItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(i => (i.id === id ? { ...i, [field]: value } : i)),
    }));
  };

  const total = (formData.items || []).reduce((acc, i) => acc + (i.value || 0), 0);

  const isViewOnly = modalMode === 'view';

  return (
    <div className="space-y-6">
      {/* ─── Toolbar ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nº ou nome..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="pl-4 pr-9 py-2 border border-slate-200 rounded-lg bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="Aguardando Cliente">⏳ Aguardando Cliente</option>
              <option value="Efetivado">✅ Efetivado</option>
              <option value="Não concluído">❌ Não concluído</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 font-bold hover:bg-slate-700 transition-colors shadow-sm w-full lg:w-auto justify-center"
          >
            <Printer size={16} /> Ver Relatório
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg w-full lg:w-auto justify-center"
          >
            <Plus size={18} /> Novo Orçamento
          </button>
        </div>
      </div>

      {/* ─── Counters ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:hidden">
        {['Aguardando Cliente', 'Efetivado', 'Não concluído'].map(st => {
          const count = orcamentos.filter(o => o.status === st).length;
          const cfg = STATUS_CONFIG[st];
          return (
            <div
              key={st}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer ${cfg.color} hover:opacity-80 transition-opacity`}
              onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
            >
              <span className="text-lg">{cfg.icon}</span>
              <div>
                <div className="text-xl font-black">{count}</div>
                <div className="text-[10px] font-bold uppercase tracking-tight">{cfg.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Table ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto print:hidden">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Nº / Data</th>
              <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
              <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Pagamento</th>
              <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
              <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrcamentos.map(o => {
              const itemTotal = (o.items || []).reduce((acc, i) => acc + i.value, 0);
              const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG['Aguardando Cliente'];
              return (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-black text-slate-800">Nº {String(o.numero).padStart(3, '0')}</div>
                    <div className="text-xs text-slate-400">{formatDate(o.dataEmissao)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{o.nome}</div>
                    {o.cpfCnpj && <div className="text-xs text-slate-400">{o.cpfCnpj}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-600">{o.formaPagamento}</div>
                    <div className="text-xs text-slate-400">{o.condicaoPagamento}</div>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-slate-900">{formatCurrency(itemTotal)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border w-fit ${cfg.color}`}>
                        {cfg.icon} {o.status}
                      </span>
                      {o.status === 'Efetivado' && o.efetivadoInfo && (
                        <span className="text-[10px] text-emerald-600 font-bold ml-0.5">↳ {o.efetivadoInfo}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button onClick={() => handleOpenEdit(o, 'print')} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Emitir Orçamento">
                        <Printer size={17} />
                      </button>
                      <button onClick={() => handleOpenEdit(o, 'view')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Visualizar">
                        <Eye size={17} />
                      </button>
                      <button onClick={() => handleOpenEdit(o, 'edit')} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Editar">
                        <Edit size={17} />
                      </button>
                      <button onClick={() => setDeleteConfirmId(o.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg" title="Excluir">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredOrcamentos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Delete Confirm ───────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600">
              <AlertTriangle className="mr-2" /> Atenção!
            </h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão definitiva deste orçamento?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId!)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:relative print:block print:bg-white print:p-0 print:z-0 print:backdrop-blur-none">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[95vh] print:shadow-none print:max-h-none print:rounded-none print:overflow-visible print:w-full print:max-w-none">

            {/* Modal Header — hidden when printing */}
            <div className="flex items-center justify-between px-6 py-5 border-b print:hidden">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-amber-500" size={22} />
                {modalMode === 'print' ? 'Emitir Orçamento' : modalMode === 'view' ? 'Visualizar Orçamento' : editingId ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-700" /></button>
            </div>

            <div className="p-6">
              {/* Print layout */}
              {modalMode === 'print' ? (
                <div>
                  <OrcamentoPrintView orcamento={formData as Orcamento} company={companyConfig} />
                  <div className="flex justify-end gap-3 pt-6 border-t mt-6 print:hidden">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Fechar</button>
                    <button onClick={() => window.print()} className="px-8 py-2 bg-slate-900 text-white font-bold rounded-lg shadow-xl flex items-center gap-2 hover:bg-slate-800 transition-colors">
                      <Printer size={16} /> Imprimir / Salvar PDF
                    </button>
                  </div>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Row 1: Nº, Data, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nº Orçamento</label>
                      <input
                        readOnly
                        className="w-full px-4 py-2 border rounded-lg bg-slate-50 font-black text-slate-700 cursor-not-allowed"
                        value={formData.numero || '---'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Data de Emissão *</label>
                      <input
                        ref={dateInputRef}
                        required
                        type="date"
                        readOnly={isViewOnly}
                        className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50"
                        value={formData.dataEmissao}
                        onChange={e => setFormData(p => ({ ...p, dataEmissao: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status *</label>
                      <select
                        disabled={isViewOnly}
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold disabled:bg-slate-50"
                        value={formData.status}
                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as Orcamento['status'] }))}
                      >
                        <option value="Aguardando Cliente">⏳ Aguardando Cliente</option>
                        <option value="Efetivado">✅ Efetivado</option>
                        <option value="Não concluído">❌ Não concluído</option>
                      </select>
                    </div>
                  </div>

                  {/* Efetivado info */}
                  {formData.status === 'Efetivado' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                        ✅ Informação de Efetivação (NF, data, ref.)
                      </label>
                      <input
                        type="text"
                        readOnly={isViewOnly}
                        placeholder="Ex.: NF 001, Data 15/03/2026, Pedido 123..."
                        className="w-full px-4 py-2 border-2 border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50 text-emerald-800 font-semibold placeholder-emerald-300"
                        value={formData.efetivadoInfo}
                        onChange={e => setFormData(p => ({ ...p, efetivadoInfo: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Client data */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <User size={13} /> Dados do Cliente
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nome / Razão Social *</label>
                        <input
                          required
                          readOnly={isViewOnly}
                          placeholder="Nome completo ou razão social"
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                          value={formData.nome}
                          onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">CPF / CNPJ</label>
                        <input
                          readOnly={isViewOnly}
                          placeholder="000.000.000-00 / 00.000.000/0000-00"
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                          value={formData.cpfCnpj}
                          onChange={e => setFormData(p => ({ ...p, cpfCnpj: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Endereço</label>
                        <input
                          readOnly={isViewOnly}
                          placeholder="Rua, nº, bairro, cidade"
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                          value={formData.endereco}
                          onChange={e => setFormData(p => ({ ...p, endereco: e.target.value }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Dados Complementares</label>
                        <input
                          readOnly={isViewOnly}
                          placeholder="Referência, ponto de encontro, etc."
                          className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                          value={formData.dadosComplementares}
                          onChange={e => setFormData(p => ({ ...p, dadosComplementares: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <ClipboardList size={13} /> Descrição dos Serviços
                      </h4>
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={addItem}
                          className="text-[11px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> Adicionar Item
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(formData.items || []).map((item, idx) => (
                        <div key={item.id} className="flex gap-2 items-center bg-white rounded-lg border p-3 shadow-sm">
                          <span className="text-xs font-black text-slate-400 w-5 shrink-0">{idx + 1}</span>
                          <input
                            readOnly={isViewOnly}
                            placeholder="Descrição do serviço..."
                            className="flex-1 text-sm border-0 outline-none bg-transparent text-slate-700 placeholder-slate-300"
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                          />
                          <div className="relative w-36 shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                            <input
                              readOnly={isViewOnly}
                              required
                              className="w-full text-right text-sm font-black border-l border-slate-200 pl-7 pr-2 py-1 outline-none bg-transparent"
                              value={formatInputCurrency(item.value)}
                              onChange={e => updateItem(item.id, 'value', parseCurrencyInput(e.target.value))}
                            />
                          </div>
                          {!isViewOnly && (formData.items?.length || 0) > 1 && (
                            <button type="button" onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200 px-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-600 uppercase text-sm">Total</span>
                        {!isViewOnly && (
                          <label className="flex items-center gap-2 cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                              checked={!!formData.ocultarTotal}
                              onChange={e => setFormData(p => ({ ...p, ocultarTotal: e.target.checked }))}
                            />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Ocultar Valor Total</span>
                          </label>
                        )}
                      </div>
                      <span className={`font-black text-2xl ${formData.ocultarTotal ? 'text-slate-300 line-through decoration-amber-500/50' : 'text-slate-900'}`}>
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>

                  {/* Campos Extras Dinâmicos (Editor) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Layout size={13} /> Detalhes Extras do Orçamento
                      </h4>
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({
                            ...p,
                            camposExtras: [...(p.camposExtras || []), { id: crypto.randomUUID(), titulo: '', descricao: '', ativo: true }]
                          }))}
                          className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> Adicionar Campo Extra
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {(formData.camposExtras || []).map((campo, index) => (
                        <div key={campo.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative group">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-[10px] font-black text-slate-300">#EXTRA 0{index + 1}</span>
                              <input
                                readOnly={isViewOnly}
                                placeholder="Título do Bloco (Ex: Cláusula 01, VALOR A PAGAR, Observação)"
                                className="flex-1 text-xs font-bold uppercase tracking-wider border-0 border-b border-transparent focus:border-blue-300 outline-none bg-transparent placeholder-slate-300 text-slate-700"
                                value={campo.titulo}
                                onChange={e => setFormData(p => ({
                                  ...p,
                                  camposExtras: p.camposExtras?.map(c => c.id === campo.id ? { ...c, titulo: e.target.value } : c)
                                }))}
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  disabled={isViewOnly}
                                  type="checkbox"
                                  className="w-3.5 h-3.5 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                                  checked={campo.ativo}
                                  onChange={e => setFormData(p => ({
                                    ...p,
                                    camposExtras: p.camposExtras?.map(c => c.id === campo.id ? { ...c, ativo: e.target.checked } : c)
                                  }))}
                                />
                                <span className="text-[10px] font-extrabold uppercase text-slate-400">Ativar</span>
                              </label>
                              {!isViewOnly && (
                                <button
                                  type="button"
                                  onClick={() => setFormData(p => ({
                                    ...p,
                                    camposExtras: p.camposExtras?.filter(c => c.id === campo.id ? false : true)
                                  }))}
                                  className="text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          <textarea
                            readOnly={isViewOnly}
                            rows={3}
                            placeholder="Descreva aqui os detalhes..."
                            className="w-full text-sm border-0 bg-slate-50/50 rounded-lg p-2 outline-none focus:bg-white focus:ring-1 focus:ring-blue-100 transition-all resize-none text-slate-600 placeholder-slate-300"
                            value={campo.descricao}
                            onChange={e => setFormData(p => ({
                              ...p,
                              camposExtras: p.camposExtras?.map(c => c.id === campo.id ? { ...c, descricao: e.target.value } : c)
                            }))}
                          />
                        </div>
                      ))}
                      
                      {(formData.camposExtras || []).length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                          <p className="text-xs text-slate-400 font-medium italic">Nenhum campo extra adicionado.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Forma de Pagamento</label>
                      <select
                        disabled={isViewOnly}
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold disabled:bg-slate-50"
                        value={formData.formaPagamento}
                        onChange={e => setFormData(p => ({ ...p, formaPagamento: e.target.value }))}
                      >
                        <option value="A Vista">À Vista</option>
                        <option value="A Prazo">A Prazo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Condições de Pagamento</label>
                      <select
                        disabled={isViewOnly}
                        className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold disabled:bg-slate-50"
                        value={formData.condicaoPagamento}
                        onChange={e => setFormData(p => ({ ...p, condicaoPagamento: e.target.value }))}
                      >
                        <option>Pix</option>
                        <option>Cartão</option>
                        <option>Boleto</option>
                        <option>Transferência</option>
                        <option>Dinheiro</option>
                        <option>Outros</option>
                      </select>
                    </div>
                  </div>

                  {/* Início dos serviços */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Início dos Serviços</label>
                    <input
                      readOnly={isViewOnly}
                      className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50"
                      value={formData.inicioServicos}
                      onChange={e => setFormData(p => ({ ...p, inicioServicos: e.target.value }))}
                    />
                  </div>

                  {/* Complementary Information (Items Editor) */}
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText size={13} /> Informações Complementares
                      </h4>
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({
                            ...p,
                            informacoesComplementares: [...(p.informacoesComplementares || []), '']
                          }))}
                          className="text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> Adicionar Informação
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {(formData.informacoesComplementares || []).map((info, index) => (
                        <div key={index} className="flex gap-2 group">
                          <div className="flex-1 bg-white rounded-lg border border-blue-100 shadow-sm overflow-hidden flex">
                            <div className="w-8 shrink-0 bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-300 border-r border-blue-100">
                              {index + 1}
                            </div>
                            <textarea
                              readOnly={isViewOnly}
                              rows={2}
                              placeholder="Observações, condições especiais, validade..."
                              className="w-full px-3 py-2 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-300 resize-none focus:bg-blue-50/20"
                              value={info}
                              onChange={e => setFormData(p => ({
                                ...p,
                                informacoesComplementares: p.informacoesComplementares?.map((item, i) => i === index ? e.target.value : item)
                              }))}
                            />
                          </div>
                          {!isViewOnly && (
                            <button
                              type="button"
                              onClick={() => setFormData(p => ({
                                ...p,
                                informacoesComplementares: p.informacoesComplementares?.filter((_, i) => i !== index)
                              }))}
                              className="text-slate-300 hover:text-rose-500 transition-colors self-center p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {(formData.informacoesComplementares || []).length === 0 && (
                        <p className="text-center py-4 text-xs text-blue-300 font-medium italic">Pressione "+ Adicionar Informação" para incluir detalhes.</p>
                      )}
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">
                      {isViewOnly ? 'Fechar' : 'Cancelar'}
                    </button>
                    {!isViewOnly && (
                      <button type="submit" className="px-8 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg transition-colors">
                        {editingId ? 'Salvar Alterações' : 'Salvar Orçamento'}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentoManager;
