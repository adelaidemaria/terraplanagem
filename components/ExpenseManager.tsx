
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, X, FileText, Eye, AlertTriangle, BookOpen, CheckCircle, CreditCard, Building2, Printer
} from 'lucide-react';
import { Expense, Vendor, AccountPlan, ExpenseItem, BankAccount } from '../types';
import { supabase } from '../lib/supabase';

interface ExpenseManagerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  vendors: Vendor[];
  accountPlan: AccountPlan[];
  bankAccounts: BankAccount[];
  onNavigateToReports: () => void;
}

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const getStatusLabel = (expense: Expense) => {
  if (expense.status === 'Pago') return 'PAGO';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const refDate = expense.dueDate || expense.date;
  const dueDate = new Date(refDate + 'T12:00:00');
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today ? 'PENDENTE' : 'A PAGAR';
};

const getStatusColor = (expense: Expense) => {
  if (expense.status === 'Pago') return 'bg-emerald-100 text-emerald-700';
  const label = getStatusLabel(expense);
  return label === 'PENDENTE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
};

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, setExpenses, vendors, accountPlan, bankAccounts, onNavigateToReports }) => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA');

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [period, setPeriod] = useState<'7days' | 'current' | 'last' | 'thisYear' | 'custom'>('7days');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nfFilter, setNfFilter] = useState<'all' | 'noNf' | 'withNf' | 'Pago' | 'Pendente' | 'Importado' | 'Card'>('all');

  const isExpenseImported = (expense: Expense) => {
    return expense.items?.some(i => i.description.includes('[IMPORTADO]')) || expense.bankTransId != null;
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [focusedAccountIndex, setFocusedAccountIndex] = useState(0);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const [focusedVendorIndex, setFocusedVendorIndex] = useState(0);
  const [newVendorsCache, setNewVendorsCache] = useState<Vendor[]>([]);
  const [isQuickVendorModalOpen, setIsQuickVendorModalOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorDoc, setQuickVendorDoc] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

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

  // Payment State
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toLocaleDateString('en-CA'));

  const [formData, setFormData] = useState<Partial<Expense>>({
    vendorId: '',
    accountPlanId: '',
    items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
    docNumber: '',
    isNoDoc: false,
    paymentMethod: 'Boleto',
    paymentCondition: 'A Vista',
    installments: 1,
    installmentsList: [],
    date: new Date().toLocaleDateString('en-CA'),
    dueDate: '',
    status: 'Pendente'
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatInputCurrency = (value: number) => {
    return (value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

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
    const allVendors = [...vendors, ...newVendorsCache];
    const uniqueVendors = Array.from(new Map(allVendors.map(v => [v.id, v])).values());
    const activeVendors = uniqueVendors.filter(v => v.isActive !== false || v.id === formData.vendorId);
    const sorted = [...activeVendors].sort((a, b) => a.name.localeCompare(b.name));
    if (!vendorSearchTerm) return sorted;
    const search = vendorSearchTerm.toLowerCase();
    return sorted.filter(v =>
      v.name.toLowerCase().includes(search) ||
      (v.document && v.document.includes(search))
    );
  }, [vendors, newVendorsCache, vendorSearchTerm, formData.vendorId]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const docDate = e.date;
        const matchesSearch = e.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.docNumber && e.docNumber.includes(searchTerm));
        const matchesDate = (!startDate || docDate >= startDate) && (!endDate || docDate <= endDate);

        const matchesNf = nfFilter === 'all' ||
          (nfFilter === 'noNf' && e.isNoDoc) ||
          (nfFilter === 'withNf' && !e.isNoDoc) ||
          (nfFilter === 'Pago' && e.status === 'Pago' && e.paymentMethod !== 'Cartão Corporativo') ||
          (nfFilter === 'Pendente' && e.status === 'Pendente') ||
          (nfFilter === 'Importado' && isExpenseImported(e)) ||
          (nfFilter === 'Card' && e.paymentMethod === 'Cartão Corporativo');

        return matchesSearch && matchesDate && matchesNf;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, startDate, endDate, nfFilter]);

  const handleOpenAdd = () => {
    if (vendors.length === 0) return alert('Cadastre um fornecedor primeiro.');
    setEditingId(null);
    setIsSubmitting(false);
    setModalMode('add');
    setFormData({
      vendorId: '', accountPlanId: '', items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
      docNumber: '', isNoDoc: false, paymentMethod: 'Boleto', paymentCondition: 'A Vista', installments: 1, installmentsList: [],
      date: new Date().toLocaleDateString('en-CA'),
      dueDate: '', status: 'Pendente'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense, mode: 'edit' | 'view') => {
    setEditingId(expense.id);
    setIsSubmitting(false);
    setModalMode(mode);
    setFormData({ ...expense });
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`; // Changed to avoid nested folders since not required

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, receiptUrl: publicUrl }));
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadError(error.message || 'Erro ao enviar o arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setDeleteConfirmId(null);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { id: crypto.randomUUID(), description: '', value: 0 }]
    }));
  };

  const handleRemoveItem = (id: string) => {
    if ((formData.items?.length || 0) <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== id)
    }));
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const calculateTotal = () => {
    return (formData.items || []).reduce((acc, item) => acc + item.value, 0);
  };

  const generateInstallments = () => {
    if (!formData.installments || formData.installments < 1) return;
    const total = calculateTotal();
    const instValue = Number((total / formData.installments).toFixed(2));
    const list: any[] = [];
    const baseDate = formData.dueDate || formData.date || new Date().toLocaleDateString('en-CA');
    const [yearStr, monthStr, dayStr] = baseDate.split('-');
    let lastDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

    let sum = 0;
    for (let i = 1; i <= formData.installments; i++) {
        let value = instValue;
        if (i === formData.installments) {
            value = Number((total - sum).toFixed(2));
        } else {
            sum += value;
        }

        const date = new Date(lastDate);
        if (i > 1) {
            date.setMonth(date.getMonth() + 1);
        }

        list.push({
            id: crypto.randomUUID(),
            number: i,
            dueDate: date.toLocaleDateString('en-CA'),
            value: value,
            status: 'Pendente'
        });
        
        if (i > 1) {
            lastDate = date;
        }
    }
    setFormData(prev => ({ ...prev, installmentsList: list }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (modalMode === 'view') {
      setIsModalOpen(false);
      return;
    }

    const total = calculateTotal();
    if (!formData.vendorId || !formData.accountPlanId || total <= 0) return alert('Preencha os campos obrigatórios.');
    if (formData.status === 'Pago' && !formData.bankAccountId) return alert('Selecione uma conta bancária para o pagamento.');

    setIsSubmitting(true);

    const vendor = vendors.find(v => v.id === formData.vendorId);
    let expensesToSave: Expense[] = [];

    // Se estiver no form 'A Prazo' com lista de parcelas geradas no modo INSERIR
    if (!editingId && formData.paymentCondition === 'A Prazo' && formData.installmentsList && formData.installmentsList.length > 0) {
      expensesToSave = formData.installmentsList.map(inst => ({
        id: crypto.randomUUID(),
        vendorId: formData.vendorId!,
        vendorName: vendor?.name || '---',
        accountPlanId: formData.accountPlanId!,
        // Prorrateia o valor dos itens para que o total de itens case com o total da parcela
        items: (formData.items || []).map(item => ({
          ...item,
          id: crypto.randomUUID(),
          description: `Parcela ${inst.number}/${formData.installments} - ${item.description}`,
          value: Number(((item.value / total) * inst.value).toFixed(2))
        })),
        totalValue: inst.value,
        invoiceTotalValue: total,
        date: formData.date!,
        docNumber: `${formData.docNumber || 'S/N'} - Parcela ${inst.number}/${formData.installments}`,
        isNoDoc: formData.isNoDoc || false,
        paymentMethod: formData.paymentMethod || 'Boleto',
        paymentCondition: 'A Prazo',
        dueDate: inst.dueDate,
        status: inst.status as any || 'Pendente',
        receiptUrl: formData.receiptUrl,
        createdAt: Date.now()
      }));
    } else {
      // Criação Padrão / Vista ou Modo Edição Unitária
      expensesToSave = [{
        id: editingId || crypto.randomUUID(),
        vendorId: formData.vendorId!,
        vendorName: vendor?.name || '---',
        accountPlanId: formData.accountPlanId!,
        items: formData.items || [],
        totalValue: total,
        date: formData.date!,
        docNumber: formData.docNumber || '',
        isNoDoc: formData.isNoDoc || false,
        paymentMethod: formData.paymentMethod || 'Boleto',
        paymentCondition: formData.paymentCondition || 'A Vista',
        dueDate: formData.dueDate,
        status: formData.status as any || 'Pendente',
        receiptUrl: formData.receiptUrl,
        paymentReceiptUrl: formData.paymentReceiptUrl,
        bankAccountId: formData.status === 'Pago' ? formData.bankAccountId : undefined,
        paymentDate: formData.status === 'Pago' ? (formData.paymentDate || formData.date) : undefined,
        amountPaid: formData.status === 'Pago' ? total : undefined,
        createdAt: editingId ? (formData.createdAt || Date.now()) : Date.now()
      }];
    }

    if (editingId) {
      setExpenses(prev => prev.map(ex => ex.id === editingId ? expensesToSave[0] : ex));
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
      setIsModalOpen(false);
    } else {
      setExpenses(prev => [...expensesToSave, ...prev]);
      setFormData({

        vendorId: '', accountPlanId: '', items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
        docNumber: '', isNoDoc: false, paymentMethod: 'Boleto', paymentCondition: 'A Vista', installments: 1, installmentsList: [],
        date: new Date().toLocaleDateString('en-CA'),
        dueDate: '', status: 'Pendente'
      });
      setTimeout(() => {
        setIsSubmitting(false);
        setEditingId(null);
        setModalMode('add');
        const dateInput = document.getElementById('data-documento-input');
        if (dateInput) {
          dateInput.focus();
        }
      }, 500);
    }
  };

  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVendorName) return;
    setIsAddingVendor(true);
    
    const newVendor: Vendor = {
      id: crypto.randomUUID(),
      name: quickVendorName.toUpperCase(),
      personType: quickVendorDoc.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF',
      document: quickVendorDoc,
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
      isActive: true,
      createdAt: Date.now()
    };
    
    try {
      const dbVendor = {
        id: newVendor.id,
        name: newVendor.name,
        person_type: newVendor.personType,
        document: newVendor.document,
        address: newVendor.address,
        contact_person: newVendor.contactPerson,
        phone: newVendor.phone,
        email: newVendor.email,
        is_active: newVendor.isActive,
        created_at: newVendor.createdAt
      };
      
      const { error } = await supabase.from('vendors').insert([dbVendor]);
      if (error) throw error;
      
      setNewVendorsCache(prev => [...prev, newVendor]);
      setFormData(prev => ({ ...prev, vendorId: newVendor.id }));
      setIsQuickVendorModalOpen(false);
      setQuickVendorName('');
      setQuickVendorDoc('');
      setTimeout(() => document.getElementById('status-pg-select')?.focus(), 100);
    } catch (err: any) {
      alert('Erro ao cadastrar fornecedor: ' + err.message);
    } finally {
      setIsAddingVendor(false);
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
              placeholder="Pesquisar fornecedor ou documento..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-slate-500 whitespace-nowrap">Filtro:</span>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-rose-500/20 font-bold"
              value={nfFilter}
              onChange={(e) => setNfFilter(e.target.value as any)}
            >
              <option value="all">Todas Despesas</option>
              <option value="noNf">Despesas S/N</option>
              <option value="withNf">Despesas com NF</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendentes</option>
              <option value="Importado">Importados</option>
              <option value="Card">PG CARTÃO</option>
            </select>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Data Inicial"
            />
            <span className="text-slate-400 hidden sm:inline">até</span>
            <input
              type="date"
              className="px-4 py-2 border border-slate-200 rounded-lg outline-none text-sm w-full sm:w-auto text-slate-600"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
              title="Data Final"
            />
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 font-bold focus:ring-2 focus:ring-rose-500/20"
              value={period}
              onChange={(e) => {
                const val = e.target.value as any;
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
              }}
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
            onClick={onNavigateToReports}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center justify-center space-x-2 font-bold hover:bg-slate-700 transition-colors shadow-md w-full sm:w-auto"
          >
            <Printer size={18} /> <span>Relatórios</span>
          </button>
          <button onClick={handleOpenAdd} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg whitespace-nowrap w-full sm:w-auto justify-center">
            <Plus size={18} /> <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Documento / Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Fornecedor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Tipo de Despesa</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Vencimento</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Valor Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Status PG</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Importado</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map((expense) => {
              const isCardExpense = expense.paymentMethod === 'Cartão Corporativo';
              return (
                <tr 
                  key={expense.id} 
                  className="hover:bg-slate-200/70 transition-colors cursor-pointer"
                  onClick={() => handleOpenEdit(expense, isCardExpense ? 'view' : 'edit')}
                >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`font-bold ${expense.isNoDoc ? 'text-rose-600' : 'text-slate-800'}`}>
                      Doc: {expense.isNoDoc ? 'S/N' : (expense.docNumber || 'S/N')}
                    </span>
                    <span className="text-xs text-slate-500">Data Doc: {formatDateDisplay(expense.date)}</span>
                    {expense.receiptUrl && (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center mt-1">
                        <FileText size={12} className="mr-1" /> VER ANEXO
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{expense.vendorName}</td>
                <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                  {accountPlan.find(p => p.id === expense.accountPlanId)?.description || 'Diversos'}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                  {formatDateDisplay(expense.dueDate)}
                </td>
                <td className="px-6 py-4 font-black text-rose-600 text-right">{formatCurrency(expense.totalValue)}</td>
                <td className="px-6 py-4">
                  {expense.status === 'Pago' && expense.paymentMethod === 'Cartão Corporativo' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-700">
                      PG CARTÃO
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(expense)}`}>
                      {getStatusLabel(expense)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isExpenseImported(expense) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-700">Sim</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-600">Não</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleOpenEdit(expense, 'view')} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg" title="Ver Detalhes"><Eye size={18} /></button>
                    {!isCardExpense && (
                      <>
                        <button onClick={() => handleOpenEdit(expense, 'edit')} className="p-2 text-slate-400 hover:text-amber-500 rounded-lg" title="Editar"><Edit size={18} /></button>
                        <button onClick={() => setDeleteConfirmId(expense.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg" title="Excluir"><Trash2 size={18} /></button>
                      </>
                    )}
                    {isCardExpense && (
                      <div className="group relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <div className="p-2 text-blue-400/60 hover:text-blue-500 transition-colors cursor-help">
                          <CreditCard size={18} />
                        </div>
                        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none shadow-2xl z-50 text-center font-bold leading-tight border border-slate-700">
                          <div className="text-blue-400 mb-1 uppercase tracking-widest">Atenção</div>
                          Este lançamento é gerenciado exclusivamente pela tela de Cartão Corporativo.
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-slate-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Atenção!</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Deseja excluir definitivamente este lançamento de despesa? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {modalMode === 'view' ? 'Detalhes da Despesa' : editingId ? 'Editar Despesa' : 'Novo Lançamento de Despesa'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            {modalMode === 'view' && formData.paymentMethod === 'Cartão Corporativo' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-xl flex items-center gap-4 shadow-sm">
                <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-wide">Registro de Cartão Corporativo</h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Para garantir a segurança dos dados, este lançamento só pode ser alterado ou excluído através do menu <span className="font-bold underline">Cartão Corporativo</span>.
                  </p>
                </div>
              </div>
            )}

            {formData.docNumber?.includes('Parcela') && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-lg text-white">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Esta é uma despesa parcelada</h4>
                    <p className="text-xs text-emerald-700">Documento: <span className="font-bold underline">{formData.docNumber}</span></p>
                  </div>
                </div>
                {formData.invoiceTotalValue && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Total da Nota Fiscal</p>
                    <p className="text-lg font-black text-emerald-800">{formatCurrency(formData.invoiceTotalValue)}</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Row 1: Data Documento, Nº DOC, Despesas S/N */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-5">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Data Documento</label>
                    <input
                      id="data-documento-input"
                      autoFocus
                      readOnly={modalMode === 'view'}
                      required type="date" className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.date} onChange={(e) => {
                        const newDate = e.target.value;
                        const updates: any = { date: newDate };
                        if (formData.status === 'Pago' && !formData.dueDate) {
                          updates.dueDate = newDate;
                        }
                        setFormData({ ...formData, ...updates });
                      }}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nº DOC</label>
                    <input
                      readOnly={modalMode === 'view' || formData.isNoDoc}
                      type="text" className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.isNoDoc ? 'S/N' : formData.docNumber} onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3 flex items-center mt-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-rose-500 rounded border-slate-300 focus:ring-rose-500"
                        checked={formData.isNoDoc || false}
                        onChange={(e) => setFormData({ ...formData, isNoDoc: e.target.checked })}
                        disabled={modalMode === 'view'}
                      />
                      <span className={`text-sm font-semibold whitespace-nowrap ${formData.isNoDoc ? 'text-rose-600' : 'text-slate-700'}`}>
                        Despesas S/N
                      </span>
                    </label>
                  </div>
                </div>

                {/* Row 2: Fornecedor */}
                <div className="relative z-20" ref={vendorDropdownRef}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor *</label>
                  <div
                    tabIndex={modalMode === 'view' ? -1 : 0}
                    className={`w-full px-4 py-2 border rounded-lg bg-white ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} border-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-none focus-within:ring-2 focus-within:ring-rose-500`}
                    onClick={() => {
                      if (modalMode !== 'view') {
                        setIsVendorDropdownOpen(!isVendorDropdownOpen);
                        setVendorSearchTerm('');
                        setFocusedVendorIndex(0);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'F2') {
                        e.preventDefault();
                        if (modalMode !== 'view') {
                          setIsVendorDropdownOpen(true);
                          setVendorSearchTerm('');
                          setFocusedVendorIndex(0);
                        }
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (modalMode !== 'view') {
                          setIsVendorDropdownOpen(!isVendorDropdownOpen);
                          setVendorSearchTerm('');
                          setFocusedVendorIndex(0);
                        }
                      }
                    }}
                  >
                    <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
                      <span className={`truncate ${!formData.vendorId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                        {formData.vendorId ? [...vendors, ...newVendorsCache].find(v => v.id === formData.vendorId)?.name || 'Fornecedor não encontrado' : 'Selecione o Fornecedor (F2 para pesquisar)...'}
                      </span>
                    </div>
                  </div>
                  {isVendorDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                      <div className="p-2 border-b">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Pesquisar fornecedor..."
                          className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                          value={vendorSearchTerm}
                          onChange={(e) => {
                            setVendorSearchTerm(e.target.value);
                            setFocusedVendorIndex(0);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setFocusedVendorIndex(prev => Math.min(prev + 1, filteredVendorsForDropdown.length - 1));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setFocusedVendorIndex(prev => Math.max(prev - 1, 0));
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (focusedVendorIndex >= 0 && focusedVendorIndex < filteredVendorsForDropdown.length) {
                                const v = filteredVendorsForDropdown[focusedVendorIndex];
                                const newFormData = { ...formData, vendorId: v.id };
                                if (v.categoryId) {
                                  newFormData.accountPlanId = v.categoryId;
                                }
                                setFormData(newFormData);
                                setIsVendorDropdownOpen(false);
                                setTimeout(() => document.getElementById('expense-item-desc-0')?.focus(), 100);
                              }
                            } else if (e.key === 'Escape') {
                              setIsVendorDropdownOpen(false);
                            }
                          }}
                        />
                      </div>
                      <div className="overflow-y-auto overflow-x-hidden flex-1 max-h-48 drop-scrollbar">
                        {filteredVendorsForDropdown.length > 0 ? filteredVendorsForDropdown.map((v, index) => (
                          <div
                            key={v.id}
                            ref={(el) => {
                              if (focusedVendorIndex === index && el) {
                                el.scrollIntoView({ block: 'nearest' });
                              }
                            }}
                            className={`px-4 py-2 hover:bg-rose-50 cursor-pointer text-sm truncate ${formData.vendorId === v.id || focusedVendorIndex === index ? 'bg-rose-100 font-bold text-rose-700' : 'text-slate-700'}`}
                            onClick={() => {
                              const newFormData = { ...formData, vendorId: v.id };
                              // Se o fornecedor tiver uma categoria vinculada, preencher automaticamente
                              if (v.categoryId) {
                                newFormData.accountPlanId = v.categoryId;
                              }
                              setFormData(newFormData);
                              setIsVendorDropdownOpen(false);
                              setTimeout(() => document.getElementById('expense-item-desc-0')?.focus(), 100);
                            }}
                          >
                            <span className="font-bold">{v.name}</span>
                          </div>
                        )) : (
                          <div className="p-3 text-center">
                            <p className="text-sm text-slate-500 italic mb-2">Nenhum fornecedor encontrado.</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickVendorName(vendorSearchTerm.toUpperCase());
                                setIsQuickVendorModalOpen(true);
                                setIsVendorDropdownOpen(false);
                              }}
                              className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold rounded text-xs w-full transition-colors"
                            >
                              + Cadastrar Fornecedor
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List - Moved below Fornecedor */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center">
                      <CreditCard size={16} className="mr-2 text-rose-500" /> Itens da Despesa
                    </h4>
                    {modalMode !== 'view' && (
                      <button type="button" onClick={handleAddItem} className="text-rose-600 hover:text-rose-700 font-bold text-xs uppercase">+ Adicionar Item</button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(formData.items || []).map((item, index) => (
                      <div key={item.id} className="flex gap-3 bg-white p-3 rounded-lg shadow-sm border">
                        <div className="flex-1">
                          <input
                            id={`expense-item-desc-${index}`}
                            readOnly={modalMode === 'view'}
                            required placeholder="Ex: Combustível, Manutenção de Escavadeira, Aluguel..."
                            className="w-full text-sm font-medium border-b border-transparent focus:border-rose-500 outline-none"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <div className="relative">
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                            <input
                              readOnly={modalMode === 'view'}
                              required className="w-full text-right text-sm font-black border-b border-transparent focus:border-rose-500 outline-none pl-6 text-rose-600"
                              value={formatInputCurrency(item.value)}
                              onChange={(e) => updateItem(item.id, 'value', parseCurrencyInput(e.target.value))}
                            />
                          </div>
                        </div>
                        {modalMode !== 'view' && (formData.items?.length || 0) > 1 && (
                          <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-rose-500"><X size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center px-2">
                    <span className="font-bold text-slate-500 uppercase text-xs">Valor Total da Despesa</span>
                    <span className="font-black text-2xl text-rose-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Row 3: Condição PG, Status PG, Forma Pagto, VENCIMENTO */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Condição PG</label>
                    <select
                      id="condicao-pg-select"
                      disabled={modalMode === 'edit'}
                      className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 disabled:bg-slate-50"
                      value={formData.paymentCondition} onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value as any })}
                    >
                      <option value="A Vista">À Vista</option>
                      <option value="A Prazo">A Prazo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status PG</label>
                    <select
                      id="status-pg-select"
                      disabled={modalMode === 'view' || (modalMode === 'add' && formData.paymentCondition === 'A Prazo')}
                      className={`w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 ${(modalMode === 'view' || (modalMode === 'add' && formData.paymentCondition === 'A Prazo')) && 'opacity-50 bg-slate-50'}`}
                      value={formData.status} onChange={(e) => {
                        const newStatus = e.target.value as any;
                        const updates: any = { status: newStatus };
                        if (newStatus === 'Pago' && formData.date) {
                          updates.dueDate = formData.date;
                        }
                        setFormData({ ...formData, ...updates });
                      }}
                    >
                      <option value="Pendente">A Pagar</option>
                      <option value="Pago">Pago (Baixado)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Forma Pagto</label>
                    <select
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="Boleto">Boleto</option>
                      <option value="PIX">PIX</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Cartão Corporativo">Cartão Corporativo</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Débito">Débito</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {formData.paymentCondition === 'A Prazo' ? 'Vencimento (1ª)' : 'VENCIMENTO'}
                    </label>
                    <input
                      readOnly={modalMode === 'view'}
                      type="date" className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sub Row: Parcelamento */}
                {formData.paymentCondition === 'A Prazo' && !editingId && (
                  <div className="animate-in fade-in zoom-in border-l-4 border-rose-500 pl-4 bg-slate-50 p-4 rounded-r-xl mt-4">
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                      <div className="w-full sm:w-48">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Qtd Parcelas</label>
                        <input
                          readOnly={modalMode === 'view'}
                          type="number" min="1" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                          value={formData.installments} 
                          onChange={(e) => {
                            const num = Number(e.target.value);
                            const itemsToCalculate = formData.items || [];
                            const total = itemsToCalculate.reduce((acc, item) => acc + item.value, 0);
                            const instValue = Number((total / (num || 1)).toFixed(2));
                            const list: any[] = [];
                            const baseDate = formData.dueDate || formData.date || new Date().toLocaleDateString('en-CA');
                            const [yearStr, monthStr, dayStr] = baseDate.split('-');
                            let lastDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));

                            let sum = 0;
                            for (let i = 1; i <= num; i++) {
                                let value = instValue;
                                if (i === num) value = Number((total - sum).toFixed(2));
                                else sum += value;
                                
                                const date = new Date(lastDate);
                                if (i > 1) date.setMonth(date.getMonth() + 1);
                                list.push({ id: crypto.randomUUID(), number: i, dueDate: date.toLocaleDateString('en-CA'), value, status: 'Pendente' });
                                if (i > 1) lastDate = date;
                            }
                            setFormData({ ...formData, installments: num, installmentsList: list });
                          }}
                        />
                      </div>
                      {modalMode !== 'view' && (
                        <button type="button" onClick={generateInstallments} className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-white font-bold text-sm rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap">
                          Gerar Parcelas
                        </button>
                      )}
                    </div>

                    {formData.installmentsList && formData.installmentsList.length > 0 && (
                      <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Nrº</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Vencimento</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Valor R$</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.installmentsList.map((inst, idx) => (
                              <tr key={inst.id} className="border-b last:border-0 border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-700">{inst.number} / {formData.installments}</td>
                                <td className="px-4 py-3">
                                  <input
                                    readOnly={modalMode === 'view'}
                                    type="date"
                                    className="w-full px-2 py-1 text-sm border-b border-transparent focus:border-rose-500 outline-none bg-transparent"
                                    value={inst.dueDate}
                                    onChange={(e) => {
                                      const newList = [...(formData.installmentsList || [])];
                                      newList[idx].dueDate = e.target.value;
                                      setFormData({ ...formData, installmentsList: newList });
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3 font-black text-rose-600">
                                  <div className="relative">
                                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-rose-400 font-bold">R$</span>
                                    <input
                                      readOnly={modalMode === 'view'}
                                      type="text"
                                      className="w-full text-right text-sm font-black border-b border-transparent focus:border-rose-500 outline-none pl-6 text-rose-600 bg-transparent"
                                      value={formatInputCurrency(inst.value)}
                                      onChange={(e) => {
                                        const cleanValue = e.target.value.replace(/\D/g, '');
                                        const newList = [...(formData.installmentsList || [])];
                                        newList[idx].value = Number(cleanValue) / 100;
                                        setFormData({ ...formData, installmentsList: newList });
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-rose-100 text-rose-700 uppercase tracking-widest">{inst.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}


                {/* Sub Row: Details when Status is Pago */}
                {formData.status === 'Pago' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div>
                      <label className="block text-sm font-semibold text-emerald-800 mb-1">Conta Bancária (Pago) *</label>
                      <select
                        disabled={modalMode === 'view'}
                        required
                        className="w-full px-4 py-2 border rounded-lg bg-white border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={formData.bankAccountId || ''}
                        onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                      >
                        <option value="">Selecione a Conta Origem...</option>
                        {bankAccounts
                          .filter(b => !b.isBlocked || b.id === formData.bankAccountId)
                          .map(b => (
                            <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-emerald-800 mb-1">Data de Pagamento *</label>
                      <input
                        disabled={modalMode === 'view'}
                        required
                        type="date"
                        className="w-full px-4 py-2 border rounded-lg bg-white border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={formData.paymentDate || formData.date || ''}
                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* Row 4: Tipo de Despesa e Anexo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative z-10" ref={accountDropdownRef}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Despesa *</label>
                    <div
                      tabIndex={modalMode === 'view' ? -1 : 0}
                      className={`w-full px-4 py-2 border rounded-lg bg-white ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} border-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-none focus-within:ring-2 focus-within:ring-rose-500`}
                      onClick={() => {
                        if (modalMode !== 'view') {
                          setIsAccountDropdownOpen(!isAccountDropdownOpen);
                          setAccountSearchTerm('');
                          setFocusedAccountIndex(0);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'F2') {
                          e.preventDefault();
                          if (modalMode !== 'view') {
                            setIsAccountDropdownOpen(true);
                            setAccountSearchTerm('');
                            setFocusedAccountIndex(0);
                          }
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (modalMode !== 'view') {
                            setIsAccountDropdownOpen(!isAccountDropdownOpen);
                            setAccountSearchTerm('');
                            setFocusedAccountIndex(0);
                          }
                        }
                      }}
                    >
                      <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
                        <span className={`truncate ${!formData.accountPlanId ? 'text-slate-500' : 'text-slate-800'}`}>
                          {formData.accountPlanId ? sortedExpenseAccounts.find(p => p.id === formData.accountPlanId) ? `${sortedExpenseAccounts.find(p => p.id === formData.accountPlanId)?.subcategory} / ${sortedExpenseAccounts.find(p => p.id === formData.accountPlanId)?.description}` : 'Conta selecionada não encontrada' : 'Selecione a Conta de Despesa (F2 para pesquisar)...'}
                        </span>
                      </div>
                    </div>
                    {isAccountDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                        <div className="p-2 border-b">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Pesquisar conta..."
                            className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                            value={accountSearchTerm}
                            onChange={(e) => {
                              setAccountSearchTerm(e.target.value);
                              setFocusedAccountIndex(0);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setFocusedAccountIndex(prev => Math.min(prev + 1, filteredExpenseAccountsForDropdown.length - 1));
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setFocusedAccountIndex(prev => Math.max(prev - 1, 0));
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (focusedAccountIndex >= 0 && focusedAccountIndex < filteredExpenseAccountsForDropdown.length) {
                                  const p = filteredExpenseAccountsForDropdown[focusedAccountIndex];
                                  setFormData({ ...formData, accountPlanId: p.id });
                                  setIsAccountDropdownOpen(false);
                                  setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder^="Ex: Combustível"]')?.focus(), 100);
                                }
                              } else if (e.key === 'Escape') {
                                setIsAccountDropdownOpen(false);
                              }
                            }}
                          />
                        </div>
                        <div className="overflow-y-auto overflow-x-hidden flex-1 max-h-48 drop-scrollbar">
                          {filteredExpenseAccountsForDropdown.length > 0 ? filteredExpenseAccountsForDropdown.map((p, index) => (
                            <div
                              key={p.id}
                              ref={(el) => {
                                if (focusedAccountIndex === index && el) {
                                  el.scrollIntoView({ block: 'nearest' });
                                }
                              }}
                              className={`px-4 py-2 hover:bg-rose-50 cursor-pointer text-sm truncate ${formData.accountPlanId === p.id || focusedAccountIndex === index ? 'bg-rose-100 font-bold text-rose-700' : 'text-slate-700'}`}
                              onClick={() => {
                                setFormData({ ...formData, accountPlanId: p.id });
                                setIsAccountDropdownOpen(false);
                                setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder^="Ex: Combustível"]')?.focus(), 100);
                              }}
                            >
                              {p.subcategory} / {p.description}
                            </div>
                          )) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center italic">Nenhuma conta encontrada.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Anexo (NF / Recibo)</span>
                      {isUploading && <span className="text-[10px] text-rose-500 font-bold animate-pulse">Enviando...</span>}
                    </label>
                    <div className="flex items-center gap-3 w-full px-4 py-2 border rounded-lg bg-slate-50 border-slate-200">
                      {formData.receiptUrl ? (
                        <div className="flex items-center justify-between w-full">
                          <a href={formData.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-bold flex items-center truncate max-w-[200px]" title="Ver Anexo">
                            <FileText size={16} className="mr-1 flex-shrink-0" /> Documento Anexado
                          </a>
                          {modalMode !== 'view' && (
                            <button type="button" onClick={() => setFormData({ ...formData, receiptUrl: undefined })} className="text-rose-500 hover:text-rose-700 p-1 rounded-full hover:bg-rose-100 transition-colors" title="Remover Documento">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 w-full">
                          <input
                            type="file"
                            disabled={modalMode === 'view' || isUploading}
                            onChange={handleFileUpload}
                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 disabled:opacity-50 outline-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                    {uploadError && <p className="text-[10px] text-rose-500 mt-1 font-bold">{uploadError}</p>}
                  </div>
                </div>
              </div>

              {/* Items List foi movido para o topo, abaixo de Fornecedor */}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" disabled={isUploading || isSubmitting} className={`px-10 py-2 text-white font-bold rounded-lg shadow-xl transition-all shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? 'bg-rose-400' : 'bg-rose-500 hover:bg-rose-600'}`}>
                    {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Confirmar Lançamento')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isQuickVendorModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center"><Building2 className="mr-2 text-rose-500" /> Cadastro Rápido</h3>
            <p className="text-xs text-slate-500 mb-4">Adicione o fornecedor sem sair do lançamento atual.</p>
            <form onSubmit={handleQuickAddVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Fornecedor *</label>
                <input
                  autoFocus
                  required
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-rose-500 uppercase font-bold"
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF/CNPJ (Opcional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  value={quickVendorDoc}
                  onChange={(e) => setQuickVendorDoc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" disabled={isAddingVendor} onClick={() => setIsQuickVendorModalOpen(false)} className="px-4 py-2 text-slate-500 text-sm font-bold">Cancelar</button>
                <button disabled={isAddingVendor} type="submit" className={`px-6 py-2 text-white text-sm font-bold rounded-lg shadow-lg flex items-center ${isAddingVendor ? 'bg-rose-400' : 'bg-rose-500 hover:bg-rose-600'}`}>
                  {isAddingVendor ? 'Salvando...' : 'Cadastrar e Usar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
