
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, X, Eye, AlertTriangle, Printer,
  DollarSign, Calendar, User, Building2, FileText, CheckCircle,
  CreditCard, Banknote, ChevronDown, ChevronUp, Hash
} from 'lucide-react';
import { EmprestimoFuncionario, EmprestimoParcela, Funcionario, BankAccount, AccountPlan } from '../types';

interface EmployeeLoanManagerProps {
  loans: EmprestimoFuncionario[];
  setLoans: React.Dispatch<React.SetStateAction<EmprestimoFuncionario[]>>;
  employees: Funcionario[];
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

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const maskCurrency = (val: string | number | undefined | null) => {
  if (val === undefined || val === null) return "0,00";
  let v = typeof val === 'number' ? val.toFixed(2).replace('.', '') : String(val).replace(/\D/g, "");
  if (!v) return "0,00";
  let n = (Number(v) / 100).toFixed(2);
  let parts = n.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(',');
};

const parseCurrency = (val: string) => {
  return Number(val.replace(/\D/g, "")) / 100;
};

const EmployeeLoanManager: React.FC<EmployeeLoanManagerProps> = ({
  loans, setLoans, employees, bankAccounts, accountPlan, onNavigateToReports
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), 0, 1).toLocaleDateString('en-CA');
  });
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Baixa Modal
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [selectedLoanForBaixa, setSelectedLoanForBaixa] = useState<EmprestimoFuncionario | null>(null);
  const [baixaParcelaId, setBaixaParcelaId] = useState<string | null>(null);
  const [baixaValorPago, setBaixaValorPago] = useState(0);
  const [baixaDataPagamento, setBaixaDataPagamento] = useState(new Date().toLocaleDateString('en-CA'));
  const [baixaTipo, setBaixaTipo] = useState<'Banco' | 'Desconto Salário'>('Banco');
  const [baixaBancoId, setBaixaBancoId] = useState('');

  // Employee dropdown
  const [empSearchTerm, setEmpSearchTerm] = useState('');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const empDropdownRef = useRef<HTMLDivElement>(null);

  // Account Plan dropdown
  const [accSearchTerm, setAccSearchTerm] = useState('');
  const [isAccDropdownOpen, setIsAccDropdownOpen] = useState(false);
  const accDropdownRef = useRef<HTMLDivElement>(null);

  // Expanded rows for viewing installments
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target as Node)) {
        setIsEmpDropdownOpen(false);
      }
      if (accDropdownRef.current && !accDropdownRef.current.contains(event.target as Node)) {
        setIsAccDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState<Partial<EmprestimoFuncionario>>({
    funcionarioId: '',
    funcionarioNome: '',
    dataEmprestimo: new Date().toLocaleDateString('en-CA'),
    valorEmprestimo: 0,
    bancoSaidaId: '',
    accountPlanId: '',
    descricao: '',
    qtdParcelas: 1,
    parcelas: []
  });

  const filteredEmployeesForDropdown = useMemo(() => {
    const sorted = [...employees].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
    if (!empSearchTerm) return sorted;
    const search = empSearchTerm.toLowerCase();
    return sorted.filter(e => e.nomeCompleto.toLowerCase().includes(search));
  }, [employees, empSearchTerm]);

  const sortedRevenueAccounts = useMemo(() => {
    return [...accountPlan]
      .filter(p => p.accountNumber === '1.09.01.01')
      .sort((a, b) => {
        const textA = `${a.accountNumber} - ${a.description}`;
        const textB = `${b.accountNumber} - ${b.description}`;
        return textA.localeCompare(textB);
      });
  }, [accountPlan]);

  const filteredAccountsForDropdown = useMemo(() => {
    if (!accSearchTerm) return sortedRevenueAccounts;
    return sortedRevenueAccounts.filter(p => {
      const text = `${p.subcategory} / ${p.description}`.toLowerCase();
      return text.includes(accSearchTerm.toLowerCase());
    });
  }, [sortedRevenueAccounts, accSearchTerm]);

  const filteredLoans = useMemo(() => {
    return loans
      .filter(l => {
        const matchesSearch = l.funcionarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (l.descricao && l.descricao.toLowerCase().includes(searchTerm.toLowerCase()));
        const d = l.dataEmprestimo;
        const matchesDate = (!startDate || d >= startDate) && (!endDate || d <= endDate);
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.dataEmprestimo).getTime() - new Date(a.dataEmprestimo).getTime());
  }, [loans, searchTerm, startDate, endDate]);

  const generateParcelas = (valor: number, qtd: number, dataEmprestimo: string): EmprestimoParcela[] => {
    if (qtd <= 0 || valor <= 0) return [];
    const valorParcela = Math.round((valor / qtd) * 100) / 100;
    const parcelas: EmprestimoParcela[] = [];

    const baseDate = new Date(dataEmprestimo + 'T12:00:00');
    let nextMonth = baseDate.getMonth() + 1;
    let nextYear = baseDate.getFullYear();

    for (let i = 0; i < qtd; i++) {
      const month = (nextMonth + i) % 12;
      const year = nextYear + Math.floor((nextMonth + i) / 12);
      // Dia 10 do próximo mês
      const venc = new Date(year, month, 10);

      let valorEsta = valorParcela;
      // última parcela ajusta arredondamento
      if (i === qtd - 1) {
        const soma = parcelas.reduce((acc, p) => acc + p.valor, 0);
        valorEsta = Math.round((valor - soma) * 100) / 100;
      }

      parcelas.push({
        id: crypto.randomUUID(),
        numero: i + 1,
        vencimento: venc.toLocaleDateString('en-CA'),
        valor: valorEsta,
        status: 'Pendente',
        valorPago: 0,
      });
    }
    return parcelas;
  };

  const handleOpenAdd = () => {
    if (employees.length === 0) return alert('Cadastre um funcionário primeiro.');
    setEditingId(null);
    setIsSubmitting(false);
    setModalMode('add');
    setFormData({
      funcionarioId: '',
      funcionarioNome: '',
      dataEmprestimo: new Date().toLocaleDateString('en-CA'),
      valorEmprestimo: 0,
      bancoSaidaId: '',
      accountPlanId: '',
      descricao: '',
      qtdParcelas: 1,
      parcelas: []
    });
    setIsModalOpen(true);
  };

  const handleOpenView = (loan: EmprestimoFuncionario) => {
    setEditingId(loan.id);
    setModalMode('view');
    setFormData({ ...loan });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loan: EmprestimoFuncionario) => {
    setEditingId(loan.id);
    setModalMode('edit');
    setFormData({ ...loan });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (modalMode === 'view') { setIsModalOpen(false); return; }

    if (!formData.funcionarioId || !formData.valorEmprestimo || formData.valorEmprestimo <= 0 || !formData.qtdParcelas || formData.qtdParcelas <= 0) {
      return alert('Preencha os campos obrigatórios: Funcionário, Valor e Quantidade de Parcelas.');
    }
    if (!formData.bancoSaidaId) {
      return alert('Selecione o Banco de Saída do Dinheiro.');
    }

    setIsSubmitting(true);

    const emp = employees.find(e => e.id === formData.funcionarioId);
    const parcelas = editingId
      ? (formData.parcelas || [])
      : generateParcelas(formData.valorEmprestimo!, formData.qtdParcelas!, formData.dataEmprestimo!);

    const loanData: EmprestimoFuncionario = {
      id: editingId || crypto.randomUUID(),
      funcionarioId: formData.funcionarioId!,
      funcionarioNome: emp?.nomeCompleto || formData.funcionarioNome || '---',
      dataEmprestimo: formData.dataEmprestimo!,
      valorEmprestimo: formData.valorEmprestimo!,
      bancoSaidaId: formData.bancoSaidaId || undefined,
      accountPlanId: formData.accountPlanId || undefined,
      descricao: formData.descricao || '',
      qtdParcelas: formData.qtdParcelas!,
      parcelas: parcelas,
      createdAt: editingId ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editingId) {
      setLoans(prev => prev.map(l => l.id === editingId ? loanData : l));
    } else {
      setLoans(prev => [loanData, ...prev]);
    }

    setIsModalOpen(false);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleDelete = (id: string) => {
    setLoans(prev => prev.filter(l => l.id !== id));
    setDeleteConfirmId(null);
  };

  // --- Baixa logic ---
  const handleOpenBaixa = (loan: EmprestimoFuncionario) => {
    setSelectedLoanForBaixa(loan);
    setBaixaParcelaId(null);
    setIsBaixaModalOpen(true);
  };

  const handleSelectParcelaBaixa = (parcela: EmprestimoParcela) => {
    setBaixaParcelaId(parcela.id);
    setBaixaValorPago(parcela.valor);
    setBaixaDataPagamento(new Date().toLocaleDateString('en-CA'));
    setBaixaTipo('Banco');
    setBaixaBancoId('');
  };

  const handleConfirmBaixa = () => {
    if (!selectedLoanForBaixa || !baixaParcelaId) return;
    if (baixaValorPago <= 0) return alert('Informe o valor pago.');
    if (baixaTipo === 'Banco' && !baixaBancoId) return alert('Selecione o banco de saída.');

    const updatedParcelas = selectedLoanForBaixa.parcelas.map(p => {
      if (p.id === baixaParcelaId) {
        return {
          ...p,
          status: 'Pago' as const,
          valorPago: baixaValorPago,
          dataPagamento: baixaDataPagamento,
          tipoBaixa: baixaTipo,
          bancoId: baixaTipo === 'Banco' ? baixaBancoId : undefined
        };
      }
      return p;
    });

    const updatedLoan = { ...selectedLoanForBaixa, parcelas: updatedParcelas };
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    setSelectedLoanForBaixa(updatedLoan);
    setBaixaParcelaId(null);
  };

  const handleEstornarParcela = (loan: EmprestimoFuncionario, parcelaId: string) => {
    const updatedParcelas = loan.parcelas.map(p => {
      if (p.id === parcelaId) {
        return {
          ...p,
          status: 'Pendente' as const,
          valorPago: 0,
          dataPagamento: undefined,
          tipoBaixa: undefined,
          bancoId: undefined
        };
      }
      return p;
    });
    const updatedLoan = { ...loan, parcelas: updatedParcelas };
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    if (selectedLoanForBaixa?.id === loan.id) {
      setSelectedLoanForBaixa(updatedLoan);
    }
  };

  const getLoanStatus = (loan: EmprestimoFuncionario) => {
    const totalParcelas = loan.parcelas.length;
    const pagas = loan.parcelas.filter(p => p.status === 'Pago').length;
    if (pagas === 0) return { label: 'Pendente', color: 'bg-rose-100 text-rose-700' };
    if (pagas === totalParcelas) return { label: 'Quitado', color: 'bg-emerald-100 text-emerald-700' };
    return { label: `${pagas}/${totalParcelas} Pagas`, color: 'bg-amber-100 text-amber-700' };
  };

  const totalEmprestado = filteredLoans.reduce((acc, l) => acc + l.valorEmprestimo, 0);
  const totalRecebido = filteredLoans.reduce((acc, l) =>
    acc + l.parcelas.filter(p => p.status === 'Pago').reduce((s, p) => s + p.valorPago, 0), 0);
  const totalPendente = filteredLoans.reduce((acc, l) =>
    acc + l.parcelas.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-xs font-black uppercase tracking-widest">Total Emprestado</span>
            <DollarSign size={20} className="text-blue-200" />
          </div>
          <div className="text-2xl font-black">{formatCurrency(totalEmprestado)}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-100 text-xs font-black uppercase tracking-widest">Total Recebido</span>
            <CheckCircle size={20} className="text-emerald-200" />
          </div>
          <div className="text-2xl font-black">{formatCurrency(totalRecebido)}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-100 text-xs font-black uppercase tracking-widest">Saldo a Receber</span>
            <AlertTriangle size={20} className="text-amber-200" />
          </div>
          <div className="text-2xl font-black">{formatCurrency(totalPendente)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar funcionário..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400 hidden sm:inline">até</span>
            <input
              type="date"
              className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-4 xl:mt-0">
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center justify-center space-x-2 font-bold hover:bg-slate-700 transition-colors shadow-md w-full sm:w-auto"
          >
            <Printer size={18} /> <span>Relatórios</span>
          </button>
          <button onClick={handleOpenAdd} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg whitespace-nowrap w-full sm:w-auto justify-center">
            <Plus size={18} /> <span>Novo Empréstimo</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase w-8"></th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Funcionário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Data Empréstimo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-center">Parcelas</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  Nenhum empréstimo encontrado.
                </td>
              </tr>
            ) : filteredLoans.map(loan => {
              const status = getLoanStatus(loan);
              const isExpanded = expandedLoanId === loan.id;
              const acc = accountPlan.find(p => p.id === loan.accountPlanId);
              const bank = bankAccounts.find(b => b.id === loan.bancoSaidaId);

              return (
                <React.Fragment key={loan.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{loan.funcionarioNome}</span>
                        {loan.descricao && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{loan.descricao}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {formatDateDisplay(loan.dataEmprestimo)}
                    </td>
                    <td className="px-6 py-4 font-black text-blue-600 text-right">
                      {formatCurrency(loan.valorEmprestimo)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-700">{loan.qtdParcelas}x</span>
                      <span className="text-xs text-slate-400 ml-1">de {formatCurrency(loan.valorEmprestimo / loan.qtdParcelas)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => handleOpenBaixa(loan)} className="p-2 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors" title="Baixar Parcelas">
                          <Banknote size={18} />
                        </button>
                        <button onClick={() => handleOpenView(loan)} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg transition-colors" title="Ver Detalhes">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleOpenEdit(loan)} className="p-2 text-slate-400 hover:text-amber-500 rounded-lg transition-colors" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => setDeleteConfirmId(loan.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors" title="Excluir">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded installments */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-0 py-0">
                        <div className="bg-slate-50 border-y border-slate-200 px-8 py-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Hash size={14} className="text-blue-500" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Parcelas do Empréstimo</span>
                            {bank && <span className="text-[10px] font-bold text-slate-400 ml-auto">Banco Saída: {bank.bankName}</span>}
                            {acc && <span className="text-[10px] font-bold text-slate-400 ml-2">Conta: {acc.description}</span>}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {loan.parcelas.map(p => (
                              <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${p.status === 'Pago'
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-white border-slate-200'}`}>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">Parcela {p.numero}/{loan.qtdParcelas}</span>
                                  <span className="text-[10px] text-slate-400">Venc: {formatDateDisplay(p.vencimento)}</span>
                                  {p.status === 'Pago' && (
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                                      {p.tipoBaixa === 'Desconto Salário' ? '💰 DESC. SALÁRIO' : '🏦 BANCO'}
                                      {p.dataPagamento ? ` — ${formatDateDisplay(p.dataPagamento)}` : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`font-black ${p.status === 'Pago' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                    {formatCurrency(p.status === 'Pago' ? p.valorPago : p.valor)}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {p.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Atenção!</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Deseja excluir definitivamente este empréstimo e todas as suas parcelas? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit/View Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl p-6 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {modalMode === 'view' ? 'Detalhes do Empréstimo' : editingId ? 'Editar Empréstimo' : 'Novo Empréstimo a Funcionário'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Funcionário */}
              <div className="relative z-20" ref={empDropdownRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Funcionário *</label>
                <div
                  tabIndex={modalMode === 'view' ? -1 : 0}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                  onClick={() => { if (modalMode !== 'view') { setIsEmpDropdownOpen(!isEmpDropdownOpen); setEmpSearchTerm(''); } }}
                >
                  <div className="flex justify-between items-center">
                    <span className={`truncate ${!formData.funcionarioId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                      {formData.funcionarioId ? employees.find(e => e.id === formData.funcionarioId)?.nomeCompleto || 'Funcionário não encontrado' : 'Selecione o Funcionário...'}
                    </span>
                    <User size={16} className="text-slate-400 ml-2 flex-shrink-0" />
                  </div>
                </div>
                {isEmpDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                    <div className="p-2 border-b">
                      <input autoFocus type="text" placeholder="Pesquisar funcionário..." className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={empSearchTerm} onChange={(e) => setEmpSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div className="overflow-y-auto flex-1 max-h-48">
                      {filteredEmployeesForDropdown.length > 0 ? filteredEmployeesForDropdown.map(emp => (
                        <div key={emp.id} className={`px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm truncate ${formData.funcionarioId === emp.id ? 'bg-blue-100 font-bold text-blue-700' : 'text-slate-700'}`}
                          onClick={() => { setFormData({ ...formData, funcionarioId: emp.id, funcionarioNome: emp.nomeCompleto }); setIsEmpDropdownOpen(false); }}>
                          <span className="font-bold">{emp.nomeCompleto}</span>
                          <span className="text-xs text-slate-400 ml-2">{emp.funcao}</span>
                        </div>
                      )) : (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center italic">Nenhum funcionário encontrado.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Data + Valor + Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data do Empréstimo *</label>
                  <input
                    readOnly={modalMode === 'view'}
                    required type="date"
                    className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.dataEmprestimo}
                    onChange={(e) => setFormData({ ...formData, dataEmprestimo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Valor do Empréstimo *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                    <input
                      readOnly={modalMode === 'view'}
                      required
                      className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-right font-bold"
                      value={maskCurrency(formData.valorEmprestimo || 0)}
                      onChange={(e) => setFormData({ ...formData, valorEmprestimo: parseCurrency(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Qtd Parcelas *</label>
                  <input
                    readOnly={modalMode === 'view'}
                    required type="number" min="1" max="120"
                    className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center"
                    value={formData.qtdParcelas || 1}
                    onChange={(e) => setFormData({ ...formData, qtdParcelas: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Row 3: Banco de Saída */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Banco de Saída do Dinheiro *</label>
                <select
                  disabled={modalMode === 'view'}
                  required
                  className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.bancoSaidaId || ''}
                  onChange={(e) => setFormData({ ...formData, bancoSaidaId: e.target.value })}
                >
                  <option value="">Selecione o Banco...</option>
                  {bankAccounts.filter(b => !b.isBlocked).map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>
                  ))}
                </select>
              </div>

              {/* Row 4: Conta Plano de Contas */}
              <div className="relative z-10" ref={accDropdownRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Conta do Plano de Contas (Receita)</label>
                <div
                  tabIndex={modalMode === 'view' ? -1 : 0}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-white ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                  onClick={() => { if (modalMode !== 'view') { setIsAccDropdownOpen(!isAccDropdownOpen); setAccSearchTerm(''); } }}
                >
                  <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
                    <span className={`truncate ${!formData.accountPlanId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                      {formData.accountPlanId
                        ? sortedRevenueAccounts.find(p => p.id === formData.accountPlanId)
                          ? `${sortedRevenueAccounts.find(p => p.id === formData.accountPlanId)?.accountNumber} - ${sortedRevenueAccounts.find(p => p.id === formData.accountPlanId)?.description}`
                          : 'Conta não encontrada'
                        : 'Selecione a Conta específica (1.09.01.01)...'}
                    </span>
                  </div>
                </div>
                {isAccDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                    <div className="p-2 border-b">
                      <input autoFocus type="text" placeholder="Pesquisar conta..." className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={accSearchTerm} onChange={(e) => setAccSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div className="overflow-y-auto flex-1 max-h-48">
                      {filteredAccountsForDropdown.length > 0 ? filteredAccountsForDropdown.map(p => (
                        <div key={p.id}
                          className={`px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm truncate ${formData.accountPlanId === p.id ? 'bg-blue-100 font-bold text-blue-700' : 'text-slate-700'}`}
                          onClick={() => { setFormData({ ...formData, accountPlanId: p.id }); setIsAccDropdownOpen(false); }}>
                          {p.accountNumber} - {p.description}
                        </div>
                      )) : (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center italic">Nenhuma conta encontrada.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: Descrição */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição / Observações</label>
                <textarea
                  readOnly={modalMode === 'view'}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Empréstimo pessoal para emergência..."
                />
              </div>

              {/* Preview parcelas (somente em adição/edição se valor e qtd definidos) */}
              {!editingId && formData.valorEmprestimo && formData.valorEmprestimo > 0 && formData.qtdParcelas && formData.qtdParcelas > 0 && formData.dataEmprestimo && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={14} /> Prévia das Parcelas
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {generateParcelas(formData.valorEmprestimo, formData.qtdParcelas, formData.dataEmprestimo).map(p => (
                      <div key={p.id} className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs">
                        <div className="font-bold text-slate-700">Parcela {p.numero}</div>
                        <div className="text-blue-600 font-bold">{formatCurrency(p.valor)}</div>
                        <div className="text-slate-400">Venc: {formatDateDisplay(p.vencimento)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visualizar parcelas existentes no modo view/edit */}
              {editingId && formData.parcelas && formData.parcelas.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <FileText size={14} /> Parcelas do Empréstimo
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {formData.parcelas.map(p => (
                      <div key={p.id} className={`border rounded-lg px-3 py-2 text-xs ${p.status === 'Pago' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                        <div className="font-bold text-slate-700">Parcela {p.numero}</div>
                        <div className={`font-bold ${p.status === 'Pago' ? 'text-emerald-600' : 'text-slate-700'}`}>{formatCurrency(p.valor)}</div>
                        <div className="text-slate-400">Venc: {formatDateDisplay(p.vencimento)}</div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                {modalMode !== 'view' && (
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
                    <Plus size={18} />
                    {editingId ? 'Salvar Alterações' : 'Registrar Empréstimo'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Baixa Modal */}
      {isBaixaModalOpen && selectedLoanForBaixa && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Baixa de Parcelas</h2>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-bold">{selectedLoanForBaixa.funcionarioNome}</span> — Empréstimo de {formatCurrency(selectedLoanForBaixa.valorEmprestimo)} em {selectedLoanForBaixa.qtdParcelas}x
                </p>
              </div>
              <button onClick={() => { setIsBaixaModalOpen(false); setSelectedLoanForBaixa(null); setBaixaParcelaId(null); }}>
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Parcelas list */}
              <div className="space-y-2">
                {selectedLoanForBaixa.parcelas.map(p => {
                  const isSelected = baixaParcelaId === p.id;
                  const bank = p.bancoId ? bankAccounts.find(b => b.id === p.bancoId) : null;
                  return (
                    <div key={p.id} className={`border-2 rounded-xl transition-all ${p.status === 'Pago'
                      ? 'border-emerald-200 bg-emerald-50'
                      : isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${p.status === 'Pago' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {p.numero}
                          </div>
                          <div>
                            <div className="font-bold text-slate-700">Parcela {p.numero}/{selectedLoanForBaixa.qtdParcelas}</div>
                            <div className="text-xs text-slate-400">Vencimento: {formatDateDisplay(p.vencimento)}</div>
                            {p.status === 'Pago' && (
                              <div className="text-[10px] font-bold text-emerald-600 uppercase mt-1 flex items-center gap-1">
                                <CheckCircle size={12} />
                                {p.tipoBaixa === 'Desconto Salário' ? 'Desc. Salário' : `Banco${bank ? `: ${bank.bankName}` : ''}`}
                                {p.dataPagamento ? ` — ${formatDateDisplay(p.dataPagamento)}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-black text-lg ${p.status === 'Pago' ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {formatCurrency(p.status === 'Pago' ? p.valorPago : p.valor)}
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {p.status}
                            </span>
                          </div>
                          {p.status === 'Pendente' && (
                            <button
                              onClick={() => handleSelectParcelaBaixa(p)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all"
                            >
                              Baixar
                            </button>
                          )}
                          {p.status === 'Pago' && (
                            <button
                              onClick={() => handleEstornarParcela(selectedLoanForBaixa, p.id)}
                              className="text-xs text-rose-500 hover:text-rose-700 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              Estornar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Baixa Form inside selected parcela */}
                      {isSelected && p.status === 'Pendente' && (
                        <div className="border-t border-blue-200 px-5 py-4 bg-blue-50/50 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Valor Pago *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">R$</span>
                                <input
                                  className="w-full pl-9 pr-4 py-2 border border-blue-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-right font-bold text-sm"
                                  value={maskCurrency(baixaValorPago)}
                                  onChange={(e) => setBaixaValorPago(parseCurrency(e.target.value))}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Data Pagamento *</label>
                              <input
                                type="date"
                                className="w-full px-4 py-2 border border-blue-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={baixaDataPagamento}
                                onChange={(e) => setBaixaDataPagamento(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Tipo da Baixa *</label>
                              <select
                                className="w-full px-4 py-2 border border-blue-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                value={baixaTipo}
                                onChange={(e) => setBaixaTipo(e.target.value as any)}
                              >
                                <option value="Banco">🏦 Banco (Sai do Banco)</option>
                                <option value="Desconto Salário">💰 Desconto Salário</option>
                              </select>
                            </div>
                          </div>

                          {baixaTipo === 'Banco' && (
                            <div>
                              <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Banco de Recebimento *</label>
                              <select
                                className="w-full px-4 py-2 border border-blue-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={baixaBancoId}
                                onChange={(e) => setBaixaBancoId(e.target.value)}
                              >
                                <option value="">Selecione o Banco...</option>
                                {bankAccounts.filter(b => !b.isBlocked).map(b => (
                                  <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {baixaTipo === 'Desconto Salário' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-700 font-medium">
                                <strong>Desconto em Salário:</strong> Esta parcela será descontada diretamente no pagamento do salário do funcionário. Nenhuma movimentação bancária será gerada.
                              </p>
                            </div>
                          )}

                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setBaixaParcelaId(null)}
                              className="px-4 py-2 text-slate-500 font-bold text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmBaixa}
                              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg text-sm flex items-center gap-2"
                            >
                              <CheckCircle size={16} />
                              Confirmar Baixa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary footer */}
              <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-500 uppercase">Resumo do Empréstimo</div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                    <div className="font-black text-slate-800">{formatCurrency(selectedLoanForBaixa.valorEmprestimo)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase">Pago</div>
                    <div className="font-black text-emerald-600">
                      {formatCurrency(selectedLoanForBaixa.parcelas.filter(p => p.status === 'Pago').reduce((s, p) => s + p.valorPago, 0))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-rose-400 uppercase">Pendente</div>
                    <div className="font-black text-rose-600">
                      {formatCurrency(selectedLoanForBaixa.parcelas.filter(p => p.status === 'Pendente').reduce((s, p) => s + p.valor, 0))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLoanManager;
