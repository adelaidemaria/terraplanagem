import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CreditCard, Plus, Search, Edit, Trash2, X, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Settings
} from 'lucide-react';
import { CorporateCard, CorporateCardPayment, Expense, Vendor, AccountPlan, BankAccount, ExpenseItem } from '../types';

interface CorporateCardManagerProps {
  corporateCards: CorporateCard[];
  setCorporateCards: React.Dispatch<React.SetStateAction<CorporateCard[]>>;
  corporateCardPayments: CorporateCardPayment[];
  setCorporateCardPayments: React.Dispatch<React.SetStateAction<CorporateCardPayment[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  vendors: Vendor[];
  accountPlan: AccountPlan[];
  bankAccounts: BankAccount[];
}

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatInputCurrency = (value: number) => {
  return (value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyInput = (val: string) => {
  const cleanValue = val.replace(/\D/g, '');
  return Number(cleanValue) / 100;
};

const CorporateCardManager: React.FC<CorporateCardManagerProps> = ({
  corporateCards, setCorporateCards,
  corporateCardPayments, setCorporateCardPayments,
  expenses, setExpenses,
  vendors, accountPlan, bankAccounts
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isManageCardsModalOpen, setIsManageCardsModalOpen] = useState(false);
  const [isLancarModalOpen, setIsLancarModalOpen] = useState(false);
  const [lancamentoTab, setLancamentoTab] = useState<'compra' | 'pagamento'>('compra');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<any | null>(null);

  // Date Filters
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [period, setPeriod] = useState<'7days' | 'current' | 'last' | 'thisYear' | 'custom'>('7days');
  
  // Manage Cards Form
  const [cardFormData, setCardFormData] = useState<Partial<CorporateCard>>({ name: '', dueDay: 10 });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Lancamento Form (Compra = Expense, Pagamento = CorporateCardPayment)
  const defaultExpenseData: Partial<Expense> = {
    vendorId: vendors.find(v => v.name === 'SEM CADASTRO (CARTÃO)')?.id || '',
    accountPlanId: '',
    items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
    docNumber: '',
    isNoDoc: true,
    paymentMethod: 'Cartão Corporativo',
    paymentCondition: 'A Vista',
    date: new Date().toLocaleDateString('en-CA'),
    dueDate: '',
    status: 'Pendente',
    cardId: corporateCards.length > 0 ? corporateCards[0].id : ''
  };

  const defaultPaymentData: Partial<CorporateCardPayment> = {
    cardId: corporateCards.length > 0 ? corporateCards[0].id : '',
    date: new Date().toLocaleDateString('en-CA'),
    amount: 0,
    bankAccountId: '',
    description: 'Pagamento de Fatura'
  };

  const [expenseFormData, setExpenseFormData] = useState<Partial<Expense>>(defaultExpenseData);
  const [paymentFormData, setPaymentFormData] = useState<Partial<CorporateCardPayment>>(defaultPaymentData);

  // Dropdowns (similar to ExpenseManager)
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  const cardSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isLancarModalOpen && cardSelectRef.current) {
      cardSelectRef.current.focus();
    }
  }, [isLancarModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setIsVendorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update default vendor when vendors load
  useEffect(() => {
    if (vendors.length > 0 && !expenseFormData.vendorId) {
      const defaultVendor = vendors.find(v => v.name === 'SEM CADASTRO (CARTÃO)');
      if (defaultVendor) {
        setExpenseFormData(prev => ({ ...prev, vendorId: defaultVendor.id }));
      }
    }
  }, [vendors, expenseFormData.vendorId]);

  const sortedExpenseAccounts = useMemo(() => {
    return [...accountPlan]
      .filter(p => p.type === 'Despesa')
      .sort((a, b) => {
        const textA = `${a.category} / ${a.subcategory}`;
        const textB = `${b.category} / ${b.subcategory}`;
        return textA.localeCompare(textB);
      });
  }, [accountPlan]);

  const filteredExpenseAccountsForDropdown = useMemo(() => {
    if (!accountSearchTerm) return sortedExpenseAccounts;
    return sortedExpenseAccounts.filter(p => {
      const text = `${p.subcategory} / ${p.description}`.toLowerCase();
      return text.includes(accountSearchTerm.toLowerCase());
    });
  }, [sortedExpenseAccounts, accountSearchTerm]);

  const filteredVendorsForDropdown = useMemo(() => {
    const activeVendors = vendors.filter(v => v.isActive !== false || v.id === expenseFormData.vendorId);
    const sorted = [...activeVendors].sort((a, b) => a.name.localeCompare(b.name));
    if (!vendorSearchTerm) return sorted;
    const search = vendorSearchTerm.toLowerCase();
    return sorted.filter(v =>
      v.name.toLowerCase().includes(search) ||
      (v.document && v.document.includes(search))
    );
  }, [vendors, vendorSearchTerm, expenseFormData.vendorId]);

  // Combined Transactions
  const cardTransactions = useMemo(() => {
    const transactions: any[] = [];
    
    // Compras
    expenses.filter(e => e.paymentMethod === 'Cartão Corporativo' && e.cardId).forEach(e => {
      if (selectedCardId === 'all' || e.cardId === selectedCardId) {
        const d = new Date(e.date).getTime();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        if (d >= start && d <= (end + 86400000)) {
          if (!searchTerm || (e.vendorName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
             (e.items && e.items.some(i => i.description.toLowerCase().includes(searchTerm.toLowerCase())))) {
               transactions.push({
                 type: 'compra',
                 id: e.id,
                 date: e.date,
                 cardId: e.cardId,
                 description: e.vendorName,
                 itemsDesc: e.items?.map(i => i.description).join(', ') || '',
                 amount: e.totalValue,
                 original: e
               });
          }
        }
      }
    });

    // Pagamentos
    corporateCardPayments.forEach(p => {
      if (selectedCardId === 'all' || p.cardId === selectedCardId) {
        const d = new Date(p.date).getTime();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        if (d >= start && d <= (end + 86400000)) {
          if (!searchTerm || (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())) {
            transactions.push({
              type: 'pagamento',
              id: p.id,
              date: p.date,
              cardId: p.cardId,
              description: p.description || 'Pagamento',
              itemsDesc: bankAccounts.find(b => b.id === p.bankAccountId)?.bankName || '',
              amount: p.amount,
              original: p
            });
          }
        }
      }
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, corporateCardPayments, selectedCardId, searchTerm, bankAccounts, startDate, endDate]);

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFormData.name || !cardFormData.dueDay) return alert('Preencha os campos obrigatórios.');
    
    if (editingCardId) {
      setCorporateCards(prev => prev.map(c => c.id === editingCardId ? { ...c, ...cardFormData } as CorporateCard : c));
    } else {
      setCorporateCards(prev => [...prev, {
        id: crypto.randomUUID(),
        name: cardFormData.name!,
        dueDay: cardFormData.dueDay!,
        createdAt: Date.now()
      }]);
    }
    setCardFormData({ name: '', dueDay: 10 });
    setEditingCardId(null);
  };

  const handleDeleteCard = (id: string) => {
    if (expenses.some(e => e.cardId === id) || corporateCardPayments.some(p => p.cardId === id)) {
      return alert('Não é possível excluir este cartão pois possui lançamentos vinculados.');
    }
    setCorporateCards(prev => prev.filter(c => c.id !== id));
  };
  
  // Lancamento Form handlers
  const handleAddItem = () => {
    setExpenseFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { id: crypto.randomUUID(), description: '', value: 0 }]
    }));
  };

  const handleRemoveItem = (id: string) => {
    if ((expenseFormData.items?.length || 0) <= 1) return;
    setExpenseFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenseFormData(prev => ({
      ...prev,
      items: prev.items?.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const calculateTotal = () => {
    return (expenseFormData.items || []).reduce((acc, item) => acc + item.value, 0);
  };

  const handleSaveLancamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (lancamentoTab === 'compra') {
      const total = calculateTotal();
      if (!expenseFormData.cardId || !expenseFormData.vendorId || !expenseFormData.accountPlanId || total <= 0) return alert('Preencha fornecedor, tipo e defina um valor.');
      
      const vendor = vendors.find(v => v.id === expenseFormData.vendorId);
      
      const newExpense: Expense = {
        id: editingTxId || crypto.randomUUID(),
        vendorId: expenseFormData.vendorId!,
        vendorName: vendor?.name || '---',
        accountPlanId: expenseFormData.accountPlanId!,
        items: expenseFormData.items || [],
        totalValue: total,
        date: expenseFormData.date!,
        docNumber: expenseFormData.docNumber || '',
        isNoDoc: expenseFormData.isNoDoc || false,
        paymentMethod: 'Cartão Corporativo',
        paymentCondition: 'A Vista', // default
        status: 'Pendente',
        cardId: expenseFormData.cardId,
        createdAt: editingTxId ? (expenses.find(e => e.id === editingTxId)?.createdAt || Date.now()) : Date.now()
      };
      
      if (editingTxId) {
        setExpenses(prev => prev.map(e => e.id === editingTxId ? newExpense : e));
        setIsLancarModalOpen(false); // Close on edit
      } else {
        setExpenses(prev => [newExpense, ...prev]);
        // reset form but KEEP OPEN for next entry
        setExpenseFormData({
          ...defaultExpenseData,
          cardId: expenseFormData.cardId,
          vendorId: vendors.find(v => v.name === 'SEM CADASTRO (CARTÃO)')?.id || '',
          items: [{ id: crypto.randomUUID(), description: '', value: 0 }]
        });
        
        // Force refocus
        setTimeout(() => {
          if (cardSelectRef.current) cardSelectRef.current.focus();
        }, 0);
      }
      
    } else {
      if (!paymentFormData.cardId || !paymentFormData.bankAccountId || !paymentFormData.amount || paymentFormData.amount <= 0) return alert('Preencha a conta bancária e o valor.');
      
      const newPayment: CorporateCardPayment = {
        id: editingTxId || crypto.randomUUID(),
        cardId: paymentFormData.cardId!,
        date: paymentFormData.date!,
        amount: paymentFormData.amount!,
        bankAccountId: paymentFormData.bankAccountId!,
        description: paymentFormData.description,
        createdAt: editingTxId ? (corporateCardPayments.find(p => p.id === editingTxId)?.createdAt || Date.now()) : Date.now()
      };
      
      if (editingTxId) {
        setCorporateCardPayments(prev => prev.map(p => p.id === editingTxId ? newPayment : p));
        setIsLancarModalOpen(false);
      } else {
        setCorporateCardPayments(prev => [newPayment, ...prev]);
        setPaymentFormData({ ...defaultPaymentData, cardId: paymentFormData.cardId, amount: 0 });
        setIsLancarModalOpen(false);
      }
    }
  };

  // handleDeleteTransaction
  const handleDeleteTransaction = (tx: any) => {
    setDeleteConfirmTx(tx);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmTx) return;
    
    if (deleteConfirmTx.type === 'compra') {
      setExpenses(prev => prev.filter(e => e.id !== deleteConfirmTx.id));
    } else {
      setCorporateCardPayments(prev => prev.filter(p => p.id !== deleteConfirmTx.id));
    }
    setDeleteConfirmTx(null);
  };

  const handleEditTransaction = (tx: any) => {
    setEditingTxId(tx.id);
    setModalMode('edit');
    if (tx.type === 'compra') {
      const exp = tx.original as Expense;
      setExpenseFormData({ ...exp });
      setLancamentoTab('compra');
    } else {
      const pay = tx.original as CorporateCardPayment;
      setPaymentFormData({ ...pay });
      setLancamentoTab('pagamento');
    }
    setIsLancarModalOpen(true);
  };

  const handlePeriodChange = (val: '7days' | 'current' | 'last' | 'thisYear' | 'custom') => {
    setPeriod(val);
    const today = new Date();
    if (val === '7days') {
      setStartDate(new Date(new Date().setDate(today.getDate() - 7)).toLocaleDateString('en-CA'));
      setEndDate(today.toLocaleDateString('en-CA'));
    } else if (val === 'current') {
      setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
      setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA'));
    } else if (val === 'last') {
      setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString('en-CA'));
      setEndDate(new Date(today.getFullYear(), today.getMonth(), 0).toLocaleDateString('en-CA'));
    } else if (val === 'thisYear') {
      setStartDate(new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
      setEndDate(new Date(today.getFullYear(), 11, 31).toLocaleDateString('en-CA'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar lançamentos..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-slate-500 whitespace-nowrap">Cartão:</span>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-rose-500/20 font-bold"
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
            >
              <option value="all">Todos os Cartões</option>
              {corporateCards.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriod('custom'); }}
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
            />
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-rose-500/20 font-bold"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="current">Mês Atual</option>
              <option value="last">Mês Anterior</option>
              <option value="thisYear">Ano Atual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-4 xl:mt-0">
          <button
            onClick={() => setIsManageCardsModalOpen(true)}
            className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center justify-center space-x-2 font-bold hover:bg-slate-200 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Settings size={18} /> <span>Gerenciar Cartões</span>
          </button>
          <button 
            onClick={() => {
              if (corporateCards.length === 0) return alert('Cadastre um cartão corporativo primeiro.');
              const defaultVendorId = vendors.find(v => v.name === 'SEM CADASTRO (CARTÃO)')?.id || '';
              setModalMode('add');
              setEditingTxId(null);
              setExpenseFormData({
                ...defaultExpenseData,
                vendorId: defaultVendorId,
                cardId: selectedCardId !== 'all' ? selectedCardId : (corporateCards[0]?.id || ''),
                items: [{ id: crypto.randomUUID(), description: '', value: 0 }]
              });
              
              setPaymentFormData({
                ...defaultPaymentData,
                cardId: selectedCardId !== 'all' ? selectedCardId : (corporateCards[0]?.id || '')
              });
              
              setIsLancarModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Plus size={18} /> <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Cartão</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Descrição / Local</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Itens / Observação</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cardTransactions.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 italic">Nenhum lançamento no cartão.</td></tr>
            ) : cardTransactions.map((tx, idx) => {
              const card = corporateCards.find(c => c.id === tx.cardId);
              return (
                <tr key={`${tx.type}-${tx.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-800 font-semibold">{formatDateDisplay(tx.date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{card?.name || '---'}</td>
                  <td className="px-6 py-4">
                    {tx.type === 'compra' ? (
                      <span className="inline-flex items-center px-2 py-1 bg-rose-50 text-rose-700 rounded text-xs font-bold"><ArrowUpCircle size={14} className="mr-1"/> Compra</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold"><ArrowDownCircle size={14} className="mr-1"/> Pagamento Fatura</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{tx.description}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{tx.itemsDesc}</td>
                  <td className={`px-6 py-4 font-black text-right ${tx.type === 'compra' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {tx.type === 'compra' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleEditTransaction(tx)} className="p-2 text-slate-400 hover:text-indigo-500 rounded-lg" title="Editar"><Edit size={18} /></button>
                      <button onClick={() => handleDeleteTransaction(tx)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Gerenciar Cartões */}
      {isManageCardsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center"><CreditCard className="mr-2 text-indigo-500"/> Cartões Corporativos</h2>
              <button onClick={() => setIsManageCardsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSaveCard} className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-3">{editingCardId ? 'Editar Cartão' : 'Novo Cartão'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Cartão (Ex: Nubank, Itaú)</label>
                  <input required type="text" className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={cardFormData.name} onChange={e => setCardFormData({...cardFormData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dia de Vencimento da Fatura</label>
                  <input required type="number" min="1" max="31" className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={cardFormData.dueDay} onChange={e => setCardFormData({...cardFormData, dueDay: Number(e.target.value)})} />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow uppercase text-xs">Salvar Cartão</button>
                </div>
              </div>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {corporateCards.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-indigo-300">
                  <div>
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-500 font-medium">Vencimento: Dia {c.dueDay}</div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => {setEditingCardId(c.id); setCardFormData(c);}} className="p-1.5 text-slate-400 hover:text-amber-500 rounded"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteCard(c.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {corporateCards.length === 0 && <p className="text-xs text-center text-slate-500 italic py-4">Nenhum cartão cadastrado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Lançamento */}
      {isLancarModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800 border-l-4 border-indigo-500 pl-3">
                {modalMode === 'edit' ? 'Editar Lançamento' : 'Novo Lançamento'} - Cartão
              </h2>
              <button onClick={() => setIsLancarModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <div className="flex border-b mb-6">
              <button 
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${lancamentoTab === 'compra' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setLancamentoTab('compra')}
              >
                Registrar Compra
              </button>
              <button 
                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${lancamentoTab === 'pagamento' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setLancamentoTab('pagamento')}
              >
                Registrar Pagamento de Fatura
              </button>
            </div>

            <form onSubmit={handleSaveLancamento}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cartão *</label>
                <select
                  required
                  ref={cardSelectRef}
                  className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  value={lancamentoTab === 'compra' ? expenseFormData.cardId : paymentFormData.cardId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setExpenseFormData(prev => ({...prev, cardId: id}));
                    setPaymentFormData(prev => ({...prev, cardId: id}));
                  }}
                >
                  {corporateCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {lancamentoTab === 'compra' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Data da Compra *</label>
                      <input type="date" required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={expenseFormData.date} onChange={e => setExpenseFormData({...expenseFormData, date: e.target.value})} />
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={expenseFormData.isNoDoc} onChange={e => setExpenseFormData({...expenseFormData, isNoDoc: e.target.checked})} />
                        <span className="text-sm font-semibold text-slate-700">Despesa S/N</span>
                      </label>
                    </div>
                  </div>

                  {/* Fornecedor Dropdown */}
                  <div className="relative z-20" ref={vendorDropdownRef}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor *</label>
                    <div tabIndex={0} className="w-full px-4 py-2 border rounded-lg bg-white cursor-pointer border-slate-200 focus:ring-2 focus:ring-indigo-500" onClick={() => { setIsVendorDropdownOpen(!isVendorDropdownOpen); setVendorSearchTerm(''); }}>
                      <span className={`truncate ${!expenseFormData.vendorId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                        {expenseFormData.vendorId ? vendors.find(v => v.id === expenseFormData.vendorId)?.name || 'Fornecedor não encontrado' : 'Selecione o Fornecedor...'}
                      </span>
                    </div>
                    {isVendorDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                        <div className="p-2 border-b">
                          <input autoFocus type="text" placeholder="Pesquisar..." className="w-full px-3 py-1.5 border rounded-md outline-none" value={vendorSearchTerm} onChange={(e) => setVendorSearchTerm(e.target.value)} onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredVendorsForDropdown.map(v => (
                            <div key={v.id} className={`px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm truncate ${expenseFormData.vendorId === v.id ? 'bg-indigo-50 font-bold' : ''}`} onClick={() => { setExpenseFormData({...expenseFormData, vendorId: v.id, accountPlanId: v.categoryId || expenseFormData.accountPlanId}); setIsVendorDropdownOpen(false); }}>
                              <span className="font-bold">{v.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tipo de Despesa Dropdown */}
                  <div className="relative z-10" ref={accountDropdownRef}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Despesa *</label>
                    <div tabIndex={0} className="w-full px-4 py-2 border rounded-lg bg-white cursor-pointer border-slate-200 focus:ring-2 focus:ring-indigo-500" onClick={() => { setIsAccountDropdownOpen(!isAccountDropdownOpen); setAccountSearchTerm(''); }}>
                      <span className={`truncate ${!expenseFormData.accountPlanId ? 'text-slate-500' : 'text-slate-800'}`}>
                        {expenseFormData.accountPlanId ? sortedExpenseAccounts.find(p => p.id === expenseFormData.accountPlanId) ? `${sortedExpenseAccounts.find(p => p.id === expenseFormData.accountPlanId)?.subcategory} / ${sortedExpenseAccounts.find(p => p.id === expenseFormData.accountPlanId)?.description}` : 'Conta não encontrada' : 'Selecione...'}
                      </span>
                    </div>
                    {isAccountDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                        <div className="p-2 border-b">
                          <input autoFocus type="text" placeholder="Pesquisar conta..." className="w-full px-3 py-1.5 border rounded-md outline-none" value={accountSearchTerm} onChange={(e) => setAccountSearchTerm(e.target.value)} onClick={e => e.stopPropagation()} />
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredExpenseAccountsForDropdown.map(p => (
                            <div key={p.id} className={`px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm truncate ${expenseFormData.accountPlanId === p.id ? 'bg-indigo-50 font-bold' : ''}`} onClick={() => { setExpenseFormData({...expenseFormData, accountPlanId: p.id}); setIsAccountDropdownOpen(false); }}>
                              {p.subcategory} / {p.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800 text-sm">Descrição da Compra</h4>
                    </div>
                    <div className="space-y-3">
                      {(expenseFormData.items || []).map((item) => (
                        <div key={item.id} className="flex gap-3 bg-white p-3 rounded-lg border">
                          <div className="flex-1">
                            <input required placeholder="Descreva o que foi comprado..." className="w-full text-sm font-medium border-b border-transparent focus:border-indigo-500 outline-none" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                          </div>
                          <div className="w-32 relative">
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                            <input required className="w-full text-right text-sm font-black border-b border-transparent focus:border-indigo-500 outline-none pl-6 text-rose-600" value={formatInputCurrency(item.value)} onChange={(e) => updateItem(item.id, 'value', parseCurrencyInput(e.target.value))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Data do Pagamento *</label>
                      <input type="date" required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={paymentFormData.date} onChange={e => setPaymentFormData({...paymentFormData, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Pago *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                        <input type="text" required className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-600 text-right" value={formatInputCurrency(paymentFormData.amount || 0)} onChange={e => setPaymentFormData({...paymentFormData, amount: parseCurrencyInput(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pago em (Conta Origem) *</label>
                    <select required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={paymentFormData.bankAccountId} onChange={e => setPaymentFormData({...paymentFormData, bankAccountId: e.target.value})}>
                      <option value="">Selecione o banco de onde saiu o valor...</option>
                      {bankAccounts.filter(b => !b.isBlocked).map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                    <input type="text" required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={paymentFormData.description} onChange={e => setPaymentFormData({...paymentFormData, description: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button type="button" onClick={() => setIsLancarModalOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className={`px-6 py-2.5 text-white font-bold rounded-lg shadow-lg ${lancamentoTab === 'compra' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {lancamentoTab === 'compra' ? 'Registrar Compra' : 'Registrar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Exclusion (Professional Style) */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Atenção!</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">
              Deseja excluir definitivamente este lançamento de {deleteConfirmTx.type === 'compra' ? 'compra' : 'pagamento'} do dia {formatDateDisplay(deleteConfirmTx.date)}? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setDeleteConfirmTx(null)} 
                className="px-4 py-2 text-slate-500 font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg hover:bg-rose-600 transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorporateCardManager;
