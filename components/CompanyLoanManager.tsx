import React, { useState, useMemo } from 'react';
import {
  Plus, X, Edit, Trash2, AlertTriangle, Banknote, Building2, ChevronDown, ChevronUp,
  FileText, ArrowDownCircle, RotateCcw, Calendar, CreditCard
} from 'lucide-react';
import { CompanyLoan, CompanyLoanParcela, BankAccount, AccountPlan, FinancialYield } from '../types';

interface CompanyLoanManagerProps {
  loans: CompanyLoan[];
  setLoans: React.Dispatch<React.SetStateAction<CompanyLoan[]>>;
  yields: FinancialYield[];
  setYields: React.Dispatch<React.SetStateAction<FinancialYield[]>>;
  bankAccounts: BankAccount[];
  accountPlan: AccountPlan[];
  onNavigateToReports: () => void;
}

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const CompanyLoanManager: React.FC<CompanyLoanManagerProps> = ({
  loans, setLoans, yields, setYields, bankAccounts, accountPlan, onNavigateToReports
}) => {
  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Baixa states
  const [selectedLoanForBaixa, setSelectedLoanForBaixa] = useState<CompanyLoan | null>(null);
  const [baixaParcelaId, setBaixaParcelaId] = useState<string | null>(null);
  const [baixaValorPago, setBaixaValorPago] = useState(0);
  const [baixaDataPagamento, setBaixaDataPagamento] = useState(new Date().toLocaleDateString('en-CA'));
  const [baixaBancoId, setBaixaBancoId] = useState('');
  const [baixaJuros, setBaixaJuros] = useState(0);
  const [baixaAccountPlanId, setBaixaAccountPlanId] = useState('');
  const [baixaDescricao, setBaixaDescricao] = useState('');

  // Form data
  const [formData, setFormData] = useState<Partial<CompanyLoan>>({
    nomeEmprestimo: '',
    valorEmprestado: 0,
    totalTaxasContrato: 0,
    dataEmprestimo: new Date().toLocaleDateString('en-CA'),
    descricao: '',
    bancoCreditoId: '',
    qtdParcelas: 12,
    parcelas: []
  });
  const [valorParcela, setValorParcela] = useState(0);
  const [primeiroVencimento, setPrimeiroVencimento] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const maskCurrency = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const parseCurrency = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return Number(clean) / 100;
  };

  const getStatusLabel = (p: { status: string; vencimento: string }) => {
    if (p.status === 'Pago') return 'PAGO';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(p.vencimento + 'T12:00:00');
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today ? 'PENDENTE' : 'A PAGAR';
  };

  const getStatusColor = (p: { status: string; vencimento: string }) => {
    if (p.status === 'Pago') return 'bg-emerald-100 text-emerald-700';
    const label = getStatusLabel(p);
    return label === 'PENDENTE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
  };

  // Account plan items filtered by category 3.01
  const investmentAccounts = useMemo(() => {
    return accountPlan.filter(p => p.type === 'Despesa' && (p.accountNumber?.startsWith('3.01') || p.category?.toUpperCase().includes('COMPRAS')));
  }, [accountPlan]);

  // ===== HANDLERS =====

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      nomeEmprestimo: '',
      valorEmprestado: 0,
      totalTaxasContrato: 0,
      dataEmprestimo: new Date().toLocaleDateString('en-CA'),
      descricao: '',
      bancoCreditoId: '',
      qtdParcelas: 12,
      parcelas: []
    });
    setValorParcela(0);
    setPrimeiroVencimento('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loan: CompanyLoan) => {
    setEditingId(loan.id);
    setFormData({ ...loan });
    setValorParcela(loan.parcelas.length > 0 ? loan.parcelas[0].valor : 0);
    setPrimeiroVencimento(loan.parcelas.length > 0 ? loan.parcelas[0].vencimento : '');
    setIsModalOpen(true);
  };

  const handleGerarParcelas = () => {
    if (!formData.qtdParcelas || formData.qtdParcelas < 1) return alert('Informe a quantidade de parcelas.');
    if (!valorParcela || valorParcela <= 0) return alert('Informe o valor da parcela.');
    if (!primeiroVencimento) return alert('Informe a data do primeiro vencimento.');

    const parcelas: CompanyLoanParcela[] = [];
    for (let i = 0; i < formData.qtdParcelas; i++) {
      const venc = new Date(primeiroVencimento + 'T12:00:00');
      venc.setMonth(venc.getMonth() + i);
      parcelas.push({
        id: crypto.randomUUID(),
        numero: i + 1,
        vencimento: venc.toLocaleDateString('en-CA'),
        valor: valorParcela,
        status: 'Pendente',
        valorPago: 0
      });
    }
    setFormData(prev => ({ ...prev, parcelas }));
  };

  const handleUpdateParcela = (idx: number, field: 'valor' | 'vencimento', value: any) => {
    const updated = [...(formData.parcelas || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData(prev => ({ ...prev, parcelas: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeEmprestimo) return alert('Informe o nome do empréstimo.');
    if (!formData.valorEmprestado || formData.valorEmprestado <= 0) return alert('Informe o valor emprestado.');
    if (!formData.bancoCreditoId) return alert('Selecione o banco onde o dinheiro entrou.');
    if (!formData.parcelas || formData.parcelas.length === 0) return alert('Gere as parcelas antes de salvar.');

    const loanData: CompanyLoan = {
      id: editingId || crypto.randomUUID(),
      nomeEmprestimo: formData.nomeEmprestimo!,
      valorEmprestado: formData.valorEmprestado!,
      totalTaxasContrato: formData.totalTaxasContrato || 0,
      dataEmprestimo: formData.dataEmprestimo!,
      descricao: formData.descricao || '',
      bancoCreditoId: formData.bancoCreditoId!,
      qtdParcelas: formData.qtdParcelas!,
      parcelas: formData.parcelas!,
      createdAt: editingId ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editingId) {
      setLoans(prev => prev.map(l => l.id === editingId ? loanData : l));
    } else {
      setLoans(prev => [loanData, ...prev]);
    }

    // Gerenciar Lançamento de Crédito (Yield)
    // Procuramos por qualquer yield que contenha o ID do empréstimo no Ref: id
    const existingYieldIdx = yields.findIndex(y => y.description.includes(`(Ref: ${loanData.id})`) && y.description.includes('CRÉDITO EMPRÉSTIMO'));

    if (existingYieldIdx !== -1) {
      // Atualiza o existente
      const updatedYields = [...yields];
      updatedYields[existingYieldIdx] = {
        ...updatedYields[existingYieldIdx],
        amount: loanData.valorEmprestado,
        date: loanData.dataEmprestimo,
        bankAccountId: loanData.bancoCreditoId,
        description: `CRÉDITO EMPRÉSTIMO BANCOS: ${loanData.nomeEmprestimo} (Ref: ${loanData.id})`
      };
      setYields(updatedYields);
    } else {
      // Cria novo yield se não existir (evita falhas de internet/criação parcial)
      const newYield: FinancialYield = {
        id: crypto.randomUUID(),
        bankAccountId: loanData.bancoCreditoId,
        accountPlanId: null,
        amount: loanData.valorEmprestado,
        date: loanData.dataEmprestimo,
        description: `CRÉDITO EMPRÉSTIMO BANCOS: ${loanData.nomeEmprestimo} (Ref: ${loanData.id})`,
        createdAt: Date.now()
      };
      setYields(prev => [newYield, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setLoans(prev => prev.filter(l => l.id !== id));
    setYields(prev => prev.filter(y => !y.description.includes(id)));
    setDeleteConfirmId(null);
  };

  // ===== BAIXA =====
  const handleOpenBaixa = (loan: CompanyLoan) => {
    setSelectedLoanForBaixa(loan);
    setBaixaParcelaId(null);
    setBaixaValorPago(0);
    setBaixaDataPagamento(new Date().toLocaleDateString('en-CA'));
    setBaixaBancoId('');
    setBaixaJuros(0);
    setBaixaAccountPlanId(investmentAccounts.length > 0 ? investmentAccounts[0].id : '');
    setBaixaDescricao('');
  };

  const handleOpenEditBaixa = (loan: CompanyLoan, parcela: CompanyLoanParcela) => {
    setSelectedLoanForBaixa(loan);
    setBaixaParcelaId(parcela.id);
    setBaixaValorPago(parcela.valorPago);
    setBaixaDataPagamento(parcela.dataPagamento || new Date().toLocaleDateString('en-CA'));
    setBaixaBancoId(parcela.bancoDebitoId || '');
    setBaixaJuros(parcela.juros || 0);
    setBaixaAccountPlanId(parcela.accountPlanId || (investmentAccounts.length > 0 ? investmentAccounts[0].id : ''));
    setBaixaDescricao(parcela.descricao || '');
  };

  const handleSelectParcelaForBaixa = (parcela: CompanyLoanParcela) => {
    setBaixaParcelaId(parcela.id);
    setBaixaValorPago(parcela.valor);
    setBaixaJuros(0);
  };

  const handleConfirmBaixa = () => {
    if (!selectedLoanForBaixa || !baixaParcelaId) return;
    if (!baixaBancoId) return alert('Selecione o banco de débito.');
    if (!baixaAccountPlanId) return alert('Selecione a conta do plano de contas.');
    if (baixaValorPago <= 0) return alert('Informe o valor pago.');

    const updatedParcelas = selectedLoanForBaixa.parcelas.map(p => {
      if (p.id === baixaParcelaId) {
        return {
          ...p,
          status: 'Pago' as const,
          valorPago: baixaValorPago,
          dataPagamento: baixaDataPagamento,
          bancoDebitoId: baixaBancoId,
          juros: baixaJuros,
          accountPlanId: baixaAccountPlanId,
          descricao: baixaDescricao
        };
      }
      return p;
    });

    const updatedLoan = { ...selectedLoanForBaixa, parcelas: updatedParcelas };
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));

    // Create or Update debit yield in bank
    const parcela = updatedParcelas.find(p => p.id === baixaParcelaId);
    const totalDebito = baixaValorPago + baixaJuros;
    const yieldDescription = `PGTO PARCELA EMPRÉSTIMO: ${selectedLoanForBaixa.nomeEmprestimo} – Parc ${parcela?.numero}/${selectedLoanForBaixa.qtdParcelas}${baixaJuros > 0 ? ` (Juros: ${formatCurrency(baixaJuros)})` : ''} (Ref: ${baixaParcelaId})`;

    const existingYieldIdx = yields.findIndex(y => y.description.includes(`(Ref: ${baixaParcelaId})`));

    if (existingYieldIdx !== -1) {
      // Update existing yield
      const updatedYields = [...yields];
      updatedYields[existingYieldIdx] = {
        ...updatedYields[existingYieldIdx],
        bankAccountId: baixaBancoId,
        accountPlanId: baixaAccountPlanId,
        amount: totalDebito,
        date: baixaDataPagamento,
        description: yieldDescription
      };
      setYields(updatedYields);
    } else {
      // Create new yield
      const newYield: FinancialYield = {
        id: crypto.randomUUID(),
        bankAccountId: baixaBancoId,
        accountPlanId: baixaAccountPlanId,
        amount: totalDebito,
        date: baixaDataPagamento,
        description: yieldDescription,
        createdAt: Date.now()
      };
      setYields(prev => [newYield, ...prev]);
    }

    setSelectedLoanForBaixa(updatedLoan);
    setBaixaParcelaId(null);
  };

  const handleEstornarParcela = (loan: CompanyLoan, parcelaId: string) => {
    const updatedParcelas = loan.parcelas.map(p => {
      if (p.id === parcelaId) {
        return {
          ...p,
          status: 'Pendente' as const,
          valorPago: 0,
          dataPagamento: undefined,
          bancoDebitoId: undefined,
          juros: undefined,
          accountPlanId: undefined,
          descricao: undefined
        };
      }
      return p;
    });
    const updatedLoan = { ...loan, parcelas: updatedParcelas };
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    setYields(prev => prev.filter(y => !y.description.includes(parcelaId)));
    if (selectedLoanForBaixa?.id === loan.id) {
      setSelectedLoanForBaixa(updatedLoan);
    }
  };

  // ===== CALCULATIONS =====
  const getLoanSummary = (loan: CompanyLoan) => {
    const pagas = loan.parcelas.filter(p => p.status === 'Pago');
    const totalPago = pagas.reduce((s, p) => s + p.valorPago + (p.juros || 0), 0);
    const totalPendente = loan.parcelas.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0);
    const totalJuros = pagas.reduce((s, p) => s + (p.juros || 0), 0);
    return { pagas: pagas.length, totalPago, totalPendente, totalJuros };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-3 rounded-xl shadow-lg">
            <Banknote size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Empréstimos Bancos</h2>
            <p className="text-xs text-slate-400 font-medium">Gerencie os empréstimos que a empresa contraiu</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onNavigateToReports} className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center space-x-2">
            <FileText size={16} className="text-violet-500" /> <span>Relatórios</span>
          </button>
          <button onClick={handleOpenAdd} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-violet-200 transition-all">
            <Plus size={18} /> <span>Novo Empréstimo</span>
          </button>
        </div>
      </div>

      {/* Loan Cards */}
      {loans.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Banknote size={48} className="mx-auto text-slate-300 mb-4" />
          <h4 className="text-slate-500 font-bold text-lg">Nenhum empréstimo cadastrado</h4>
          <p className="text-slate-400 text-sm mt-2">Clique em "Novo Empréstimo" para cadastrar um financiamento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.sort((a, b) => new Date(b.dataEmprestimo).getTime() - new Date(a.dataEmprestimo).getTime()).map(loan => {
            const bank = bankAccounts.find(b => b.id === loan.bancoCreditoId);
            const summary = getLoanSummary(loan);
            const isExpanded = expandedLoanId === loan.id;
            const isBaixaOpen = selectedLoanForBaixa?.id === loan.id;

            return (
              <div key={loan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Card Header */}
                <div className="p-5 cursor-pointer" onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-black uppercase">{loan.nomeEmprestimo}</span>
                        <span className="text-[10px] text-slate-400 font-bold">📅 {formatDateDisplay(loan.dataEmprestimo)}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs font-bold">Valor Emprestado</span>
                          <p className="text-lg font-black text-violet-600">{formatCurrency(loan.valorEmprestado)}</p>
                        </div>
                        {loan.totalTaxasContrato > 0 && (
                          <div>
                            <span className="text-slate-400 text-xs font-bold">Taxas Contrato</span>
                            <p className="text-lg font-black text-rose-500">{formatCurrency(loan.totalTaxasContrato)}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 text-xs font-bold">Saldo Devedor</span>
                          <p className="text-lg font-black text-amber-600">{formatCurrency(summary.totalPendente)}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-bold">Total Pago</span>
                          <p className="text-lg font-black text-emerald-600">{formatCurrency(summary.totalPago)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-bold uppercase">
                        <span className="flex items-center"><Building2 size={12} className="mr-1" /> {bank?.bankName || '---'}</span>
                        <span>{summary.pagas}/{loan.qtdParcelas} pagas</span>
                        {summary.totalJuros > 0 && <span className="text-rose-400">Juros pagos: {formatCurrency(summary.totalJuros)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleOpenBaixa(loan)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-colors">
                        <ArrowDownCircle size={14} className="mr-1" /> Pagar Parcela
                      </button>
                      <button onClick={() => handleOpenEdit(loan)} className="p-2 text-slate-400 hover:text-violet-500 transition-colors"><Edit size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(loan.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(summary.pagas / loan.qtdParcelas) * 100}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Expanded: Parcelas */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                    {loan.descricao && <p className="text-sm text-slate-500 mb-4 italic">📝 {loan.descricao}</p>}
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Parcelas do Empréstimo</h4>
                    <div className="space-y-2">
                      {loan.parcelas.map(p => {
                        const bankParcela = p.bancoDebitoId ? bankAccounts.find(b => b.id === p.bancoDebitoId) : null;
                        const apParcela = p.accountPlanId ? accountPlan.find(a => a.id === p.accountPlanId) : null;
                        return (
                          <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.status === 'Pago' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${p.status === 'Pago' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {p.numero}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">Parcela {String(p.numero).padStart(2, '0')}/{loan.qtdParcelas}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Vencimento: {formatDateDisplay(p.vencimento)}</p>
                                {p.status === 'Pago' && (
                                  <p className="text-[10px] text-emerald-600 font-bold">
                                    ✅ Pago em {formatDateDisplay(p.dataPagamento)} • {bankParcela?.bankName || '---'}
                                    {p.juros && p.juros > 0 ? ` • Juros: ${formatCurrency(p.juros)}` : ''}
                                    {apParcela ? ` • ${apParcela.description}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-black text-slate-800">{formatCurrency(p.valor)}</p>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(p)}`}>
                                  {getStatusLabel(p)}
                                </span>
                              </div>
                              {p.status === 'Pago' && (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleOpenEditBaixa(loan, p)} className="text-violet-500 hover:text-violet-700 text-[10px] font-bold flex items-center transition-colors">
                                    <Edit size={12} className="mr-1" /> Editar
                                  </button>
                                  <button onClick={() => handleEstornarParcela(loan, p.id)} className="text-rose-400 hover:text-rose-600 text-[10px] font-bold flex items-center transition-colors">
                                    <RotateCcw size={12} className="mr-1" /> Estornar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Baixa Panel */}
                {isBaixaOpen && (
                  <div className="border-t-2 border-violet-200 bg-violet-50/50 p-5">
                    <h4 className="text-sm font-black text-violet-800 uppercase mb-4 flex items-center">
                      <ArrowDownCircle size={16} className="mr-2" /> 
                      {selectedLoanForBaixa.parcelas.find(p => p.id === baixaParcelaId)?.status === 'Pago' 
                        ? 'Alterar Pagamento de Parcela' 
                        : 'Pagamento de Parcela'} 
                      — {selectedLoanForBaixa.nomeEmprestimo}
                    </h4>

                    {/* Parcela Selector */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-5">
                      {selectedLoanForBaixa.parcelas.map(p => (
                        <button
                          key={p.id}
                          disabled={p.status === 'Pago'}
                          onClick={() => handleSelectParcelaForBaixa(p)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            baixaParcelaId === p.id
                              ? 'border-violet-500 bg-violet-100 shadow-md'
                              : p.status === 'Pago'
                              ? 'border-emerald-200 bg-emerald-50 opacity-60 cursor-not-allowed'
                              : 'border-slate-200 bg-white hover:border-violet-300 cursor-pointer'
                          }`}
                        >
                          <p className="text-xs font-black">{p.numero}/{loan.qtdParcelas}</p>
                          <p className="text-[10px] text-slate-500">{formatDateDisplay(p.vencimento)}</p>
                          <p className="text-xs font-bold text-slate-700 mt-1">{formatCurrency(p.valor)}</p>
                          <span className={`text-[8px] font-black uppercase ${getStatusLabel(p) === 'PAGO' ? 'text-emerald-600' : getStatusLabel(p) === 'PENDENTE' ? 'text-rose-600' : 'text-amber-600'}`}>{getStatusLabel(p)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Baixa Form */}
                    {baixaParcelaId && (
                      <div className="bg-white rounded-xl border border-violet-200 p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-violet-800 mb-1 uppercase">Valor Pago *</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-400">R$</span>
                              <input className="w-full pl-9 pr-4 py-2 border border-violet-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-violet-500 text-right font-bold text-sm"
                                value={maskCurrency(baixaValorPago)} onChange={e => setBaixaValorPago(parseCurrency(e.target.value))} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-violet-800 mb-1 uppercase">Data Pagamento *</label>
                            <input type="date" className="w-full px-4 py-2 border border-violet-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                              value={baixaDataPagamento} onChange={e => setBaixaDataPagamento(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-violet-800 mb-1 uppercase">Juros s/ Parcela</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400">R$</span>
                              <input className="w-full pl-9 pr-4 py-2 border border-violet-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-rose-400 text-right font-bold text-sm"
                                value={maskCurrency(baixaJuros)} onChange={e => setBaixaJuros(parseCurrency(e.target.value))} />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-violet-800 mb-1 uppercase">Banco Debitado *</label>
                            <select className="w-full px-4 py-2 border border-violet-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-violet-500 text-sm font-bold"
                              value={baixaBancoId} onChange={e => setBaixaBancoId(e.target.value)}>
                              <option value="">Selecione o banco...</option>
                              {bankAccounts.filter(b => !b.isBlocked).map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-violet-800 mb-1 uppercase">Conta Plano de Contas *</label>
                            <select className="w-full px-4 py-2 border border-violet-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-violet-500 text-sm font-bold"
                              value={baixaAccountPlanId} onChange={e => setBaixaAccountPlanId(e.target.value)}>
                              <option value="">Selecione a conta...</option>
                              {investmentAccounts.map(a => (
                                <option key={a.id} value={a.id}>{a.accountNumber} - {a.description}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-violet-800 mb-1 uppercase">Descrição (opcional)</label>
                          <input className="w-full px-4 py-2 border border-violet-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                            value={baixaDescricao} onChange={e => setBaixaDescricao(e.target.value)} placeholder="Descrição do pagamento..." />
                        </div>
                        {baixaJuros > 0 && (
                          <p className="text-xs text-rose-500 font-bold bg-rose-50 px-4 py-2 rounded-lg">⚠️ Total debitado do banco: {formatCurrency(baixaValorPago + baixaJuros)} (Parcela: {formatCurrency(baixaValorPago)} + Juros: {formatCurrency(baixaJuros)})</p>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => { setSelectedLoanForBaixa(null); setBaixaParcelaId(null); }} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancelar</button>
                          <button onClick={handleConfirmBaixa} className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg text-sm">
                            {selectedLoanForBaixa.parcelas.find(p => p.id === baixaParcelaId)?.status === 'Pago' 
                              ? 'Salvar Alterações' 
                              : 'Confirmar Pagamento'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL: Cadastro/Edição ===== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl z-10 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">{editingId ? 'Editar Empréstimo' : 'Novo Empréstimo Banco'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Nome do Empréstimo *</label>
                <input required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none font-bold"
                  value={formData.nomeEmprestimo} onChange={e => setFormData(f => ({ ...f, nomeEmprestimo: e.target.value }))}
                  placeholder="Ex: Financiamento Caminhão, Capital de Giro..." />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Valor Emprestado *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-400">R$</span>
                    <input required className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-right font-bold"
                      value={maskCurrency(formData.valorEmprestado || 0)} onChange={e => setFormData(f => ({ ...f, valorEmprestado: parseCurrency(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Taxas Contrato</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400">R$</span>
                    <input className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-right font-bold"
                      value={maskCurrency(formData.totalTaxasContrato || 0)} onChange={e => setFormData(f => ({ ...f, totalTaxasContrato: parseCurrency(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Data do Empréstimo *</label>
                  <input type="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                    value={formData.dataEmprestimo} onChange={e => setFormData(f => ({ ...f, dataEmprestimo: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Banco (Onde entrou o dinheiro) *</label>
                <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none font-bold"
                  value={formData.bancoCreditoId} onChange={e => setFormData(f => ({ ...f, bancoCreditoId: e.target.value }))}>
                  <option value="">Selecione o banco...</option>
                  {bankAccounts.filter(b => !b.isBlocked).map(b => (
                    <option key={b.id} value={b.id}>🏦 {b.bankName} / {b.accountNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Descrição (Opcional)</label>
                <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                  value={formData.descricao || ''} onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Observações sobre o empréstimo..." />
              </div>

              {/* Parcelas Generator */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-black text-slate-700 uppercase mb-3 flex items-center"><Calendar size={16} className="mr-2 text-violet-500" /> Geração de Parcelas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Qtd Parcelas</label>
                    <input type="number" min="1" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none font-bold text-center"
                      value={formData.qtdParcelas} onChange={e => setFormData(f => ({ ...f, qtdParcelas: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Valor Parcela</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                      <input className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-right font-bold"
                        value={maskCurrency(valorParcela)} onChange={e => setValorParcela(parseCurrency(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">1º Vencimento</label>
                    <input type="date" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                      value={primeiroVencimento} onChange={e => setPrimeiroVencimento(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={handleGerarParcelas} className="w-full bg-violet-100 text-violet-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-violet-200 transition-colors">
                      Gerar Parcelas
                    </button>
                  </div>
                </div>

                {/* Parcelas List (editable) */}
                {formData.parcelas && formData.parcelas.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto border rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-600">Nº</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-600">Vencimento</th>
                          <th className="px-4 py-2 text-right text-xs font-bold text-slate-600">Valor</th>
                          <th className="px-4 py-2 text-center text-xs font-bold text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.parcelas.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-bold text-slate-600">{p.numero}</td>
                            <td className="px-4 py-2">
                              <input type="date" className="px-2 py-1 border rounded text-sm outline-none focus:ring-1 focus:ring-violet-400 w-full"
                                value={p.vencimento} onChange={e => handleUpdateParcela(idx, 'vencimento', e.target.value)} disabled={p.status === 'Pago'} />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input className="px-2 py-1 border rounded text-sm text-right font-bold outline-none focus:ring-1 focus:ring-violet-400 w-24"
                                value={maskCurrency(p.valor)} onChange={e => handleUpdateParcela(idx, 'valor', parseCurrency(e.target.value))} disabled={p.status === 'Pago'} />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2">
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-xs font-black text-slate-600 uppercase">Total das Parcelas:</td>
                          <td className="px-4 py-2 text-right font-black text-violet-600">{formatCurrency(formData.parcelas.reduce((s, p) => s + p.valor, 0))}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-lg shadow-lg">{editingId ? 'Salvar Alterações' : 'Cadastrar Empréstimo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Empréstimo?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Esta ação removerá o empréstimo e todos os lançamentos financeiros associados. Tem certeza?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyLoanManager;
