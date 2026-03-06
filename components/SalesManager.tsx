
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, X, FileText, Eye, AlertTriangle, Printer, ScrollText, FileX
} from 'lucide-react';
import { Sale, Customer, Payment, AccountPlan, SaleItem, SaleInstallment } from '../types';
import RentalInvoice from './RentalInvoice';
import { supabase } from '../lib/supabase';

interface SalesManagerProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  payments: Payment[];
  accountPlan: AccountPlan[];
  onNavigateToReports: () => void;
}

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const SalesManager: React.FC<SalesManagerProps> = ({ sales, setSales, customers, payments, accountPlan, onNavigateToReports }) => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA');

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [period, setPeriod] = useState<'7days' | 'current' | 'last' | 'currentYear' | 'custom'>('7days');
  const [isNoNf, setIsNoNf] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'print'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nfFilter, setNfFilter] = useState<'all' | 'noNf' | 'withNf'>('all');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen && (modalMode === 'add' || modalMode === 'edit')) {
      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [isModalOpen, modalMode]);

  const [formData, setFormData] = useState<Partial<Sale>>({
    customerId: '',
    accountPlanId: '',
    items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
    nfNumber: '',
    isNoNf: false,
    saleType: 'Serviço',
    paymentMethod: 'PIX',
    paymentCondition: 'A Vista',
    installments: 1,
    date: new Date().toLocaleDateString('en-CA'),
    dueDate: '',
    observations: '',
    deductions: 0
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const formatInputCurrency = (value: number) => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const sortedRevenueAccounts = useMemo(() => {
    return [...accountPlan]
      .filter(p => p.type === 'Receita' && (!p.category || !p.category.includes('1.02')))
      .sort((a, b) => {
        const textA = `${a.subcategory} / ${a.description}`;
        const textB = `${b.subcategory} / ${b.description}`;
        return textA.localeCompare(textB);
      });
  }, [accountPlan]);

  const filteredRevenueAccountsForDropdown = useMemo(() => {
    if (!accountSearchTerm) return sortedRevenueAccounts;
    return sortedRevenueAccounts.filter(p => {
      const text = `${p.subcategory} / ${p.description}`.toLowerCase();
      return text.includes(accountSearchTerm.toLowerCase());
    });
  }, [sortedRevenueAccounts, accountSearchTerm]);

  const filteredCustomersForDropdown = useMemo(() => {
    const activeCustomers = customers.filter(c => c.isActive !== false || c.id === formData.customerId);
    const sorted = [...activeCustomers].sort((a, b) => a.name.localeCompare(b.name));
    if (!customerSearchTerm) return sorted;
    const search = customerSearchTerm.toLowerCase();
    return sorted.filter(c =>
      c.name.toLowerCase().includes(search) ||
      (c.document && c.document.includes(search))
    );
  }, [customers, customerSearchTerm, formData.customerId]);

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const saleDate = s.date;
        const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || (s.nfNumber && s.nfNumber.includes(searchTerm));
        const matchesDate = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);

        const matchesNf = nfFilter === 'all' ||
          (nfFilter === 'noNf' && s.isNoNf) ||
          (nfFilter === 'withNf' && !s.isNoNf);

        return matchesSearch && matchesDate && matchesNf;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, startDate, endDate, nfFilter]);

  const handleOpenAdd = () => {
    if (customers.length === 0) return alert('Cadastre um cliente primeiro.');
    setEditingId(null);
    setModalMode('add');
    setFormData({
      customerId: '', customerName: '', accountPlanId: '', items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
      nfNumber: '', isNoNf: false, saleType: 'Serviço', paymentMethod: 'PIX', paymentCondition: 'A Vista',
      installments: 1, date: new Date().toLocaleDateString('en-CA'),
      dueDate: new Date().toLocaleDateString('en-CA'), observations: '', deductions: 0
    });
    setIsNoNf(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sale: Sale, mode: 'edit' | 'view' | 'print') => {
    setEditingId(sale.id);
    setModalMode(mode);
    setFormData({ ...sale });
    setIsNoNf(!!sale.isNoNf);
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
      const filePath = `receipts/${fileName}`;

      const { error } = await supabase.storage
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
    const associatedPayments = payments.filter(p => p.saleId === id);
    if (associatedPayments.length > 0) return alert('Exclua os pagamentos desta venda primeiro.');
    setSales(prev => prev.filter(s => s.id !== id));
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

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const calculateTotal = () => {
    return (formData.items || []).reduce((acc, item) => acc + item.value, 0);
  };

  const generateInstallments = () => {
    const total = calculateTotal();
    const qty = formData.installments || 1;
    const firstDueDate = formData.dueDate || new Date().toLocaleDateString('en-CA');
    if (total <= 0) return alert('Adicione valor aos serviços/locação para calcular as parcelas.');
    if (qty <= 0) return alert('A quantidade de parcelas deve ser maior que zero.');

    const list: SaleInstallment[] = [];
    const baseValue = Number((total / qty).toFixed(2));
    let currentSum = 0;

    for (let i = 0; i < qty; i++) {
      const d = new Date(firstDueDate);
      d.setUTCMonth(d.getUTCMonth() + i);

      let val = baseValue;
      if (i === qty - 1) {
        val = Number((total - currentSum).toFixed(2));
      } else {
        currentSum += baseValue;
      }

      list.push({
        id: crypto.randomUUID(),
        number: i + 1,
        dueDate: d.toISOString().split('T')[0],
        value: val,
        status: 'Pendente'
      });
    }
    setFormData(prev => ({ ...prev, installmentsList: list }));
  };

  const updateInstallment = (id: string, field: keyof SaleInstallment, value: any) => {
    setFormData(prev => ({
      ...prev,
      installmentsList: prev.installmentsList?.map(inst => inst.id === id ? { ...inst, [field]: value } : inst)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') {
      setIsModalOpen(false);
      return;
    }

    if (modalMode === 'print') {
      window.print();
      return;
    }

    const total = calculateTotal();
    if (!formData.customerId || !formData.accountPlanId || total <= 0) return alert('Preencha os campos obrigatórios.');

    if (formData.paymentCondition === 'A Prazo' && formData.installmentsList) {
      const installmentsTotal = formData.installmentsList.reduce((acc, i) => acc + (Number(i.value) || 0), 0);
      if (Math.abs(installmentsTotal - total) > 0.05) {
        return alert(`O total das parcelas (${formatCurrency(installmentsTotal)}) não coincide com o total da venda (${formatCurrency(total)}). Por favor, ajuste os valores.`);
      }
    }

    const customer = customers.find(c => c.id === formData.customerId);

    const saleData: Sale = {
      id: editingId || crypto.randomUUID(),
      customerId: formData.customerId!,
      customerName: customer?.name || '---',
      accountPlanId: formData.accountPlanId!,
      items: formData.items || [],
      totalValue: total,
      deductions: formData.deductions || 0,
      date: formData.date!,
      nfNumber: isNoNf ? '' : (formData.nfNumber || ''),
      isNoNf: isNoNf,
      saleType: formData.saleType || 'Serviço',
      paymentMethod: formData.paymentMethod || 'PIX',
      paymentCondition: formData.paymentCondition || 'A Vista',
      installments: formData.installments || 1,
      installmentsList: formData.paymentCondition === 'A Prazo' ? formData.installmentsList : undefined,
      dueDate: formData.dueDate,
      status: editingId ? (sales.find(s => s.id === editingId)?.status || 'Pendente') : 'Pendente',
      observations: formData.observations || '',
      receiptUrl: formData.receiptUrl,
      createdAt: Date.now()
    };

    if (editingId) {
      setSales(prev => prev.map(s => s.id === editingId ? saleData : s));
    } else {
      setSales(prev => [saleData, ...prev]);
    }

    // Resetar formulário e manter aberto
    setEditingId(null);
    setModalMode('add');
    setFormData({
      customerId: '', 
      customerName: '',
      accountPlanId: '', 
      items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
      nfNumber: '', 
      isNoNf: false, 
      saleType: 'Serviço', 
      paymentMethod: 'PIX', 
      paymentCondition: 'A Vista',
      installments: 1, 
      date: new Date().toLocaleDateString('en-CA'),
      dueDate: new Date().toLocaleDateString('en-CA'), 
      observations: '', 
      deductions: 0
    });
    setIsNoNf(false);
    
    setTimeout(() => dateInputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar por cliente ou NF..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-amber-500/20"
              value={nfFilter}
              onChange={(e) => setNfFilter(e.target.value as any)}
            >
              <option value="all">Todos Serviços</option>
              <option value="noNf">Serviços S/N</option>
              <option value="withNf">Serviços com NF</option>
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
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 font-bold focus:ring-2 focus:ring-amber-500/20"
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
                } else if (val === 'currentYear') {
                  setStartDate(new Date(today.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
                  setEndDate(new Date(today.getFullYear(), 11, 31).toLocaleDateString('en-CA'));
                }
              }}
            >
              <option value="7days">Últimos 7 dias</option>
              <option value="current">Mês Atual</option>
              <option value="last">Mês Anterior</option>
              <option value="currentYear">Ano Atual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center justify-center space-x-2 font-bold hover:bg-slate-700 transition-colors shadow-md w-full sm:w-auto"
          >
            <Printer size={18} /> <span>Relatórios</span>
          </button>
          <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg whitespace-nowrap w-full sm:w-auto justify-center">
            <Plus size={18} /> <span>Lançar Venda</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto print:hidden">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">NF / Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Condições PG</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Vencimento</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Valor Total</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${sale.isNoNf ? 'text-rose-500' : 'text-slate-800'}`}>
                        {sale.isNoNf ? 'S/NF' : (sale.nfNumber || 'S/N')}
                      </span>
                      {sale.isNoNf && <FileX size={12} className="text-rose-500" />}
                      {!sale.isNoNf && sale.receiptUrl && (
                        <a href={sale.receiptUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 font-bold flex items-center transition-colors">
                          <FileText size={10} className="mr-1" /> VER ANEXO
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">Emissão: {formatDateDisplay(sale.date)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{sale.customerName}</td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-slate-700">{sale.paymentCondition} ({sale.paymentMethod})</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-slate-600">
                    {formatDateDisplay(sale.dueDate)}
                  </span>
                </td>
                <td className="px-6 py-4 font-normal text-slate-900 text-right">{formatCurrency(sale.totalValue)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    {sale.saleType === 'Locação' && (
                      <button onClick={() => handleOpenEdit(sale, 'print')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg flex items-center" title="Emitir Fatura de Locação"><Printer size={18} className="mr-1" /><span className="text-[10px] font-bold">FATURA</span></button>
                    )}
                    <button onClick={() => handleOpenEdit(sale, 'view')} className="p-2 text-slate-400 hover:text-slate-600" title="Ver Detalhes"><Eye size={18} /></button>
                    <button onClick={() => handleOpenEdit(sale, 'edit')} className="p-2 text-slate-400 hover:text-amber-500" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(sale.id)} className="p-2 text-slate-400 hover:text-rose-500" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Atenção!</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Você confirma a exclusão definitiva desta venda? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className={`bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 overflow-y-auto max-h-[95vh] print:shadow-none print:max-h-none print:w-full print:p-0`}>
            <div className="flex items-center justify-between mb-6 border-b pb-4 print:hidden">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                {modalMode === 'print' && <ScrollText className="mr-2 text-blue-500" />}
                {modalMode === 'view' ? 'Ficha de Venda' : modalMode === 'print' ? 'Fatura de Locação (Impressão)' : editingId ? 'Editar Venda' : 'Lançar Nova Venda'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            {modalMode === 'print' ? (
              <div className="space-y-6">
                <RentalInvoice
                  sale={formData as Sale}
                  customer={customers.find(c => c.id === formData.customerId)}
                />
                <div className="flex justify-end space-x-3 pt-6 border-t print:hidden">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Fechar</button>
                  <button type="button" onClick={() => window.print()} className="px-10 py-2 bg-slate-900 text-white font-bold rounded-lg shadow-xl flex items-center">
                    <Printer size={18} className="mr-2" /> Imprimir Documento
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 print:hidden">
                <div className="space-y-4">
                  {/* Linha 1: Data, NF e Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Data Emissão *</label>
                      <input
                        ref={dateInputRef}
                        autoFocus
                        readOnly={modalMode === 'view'}
                        required type="date" className="w-full px-4 py-2 border rounded-lg bg-white"
                        value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nº Fatura / Nota</label>
                      <input
                        readOnly={modalMode === 'view' || isNoNf}
                        disabled={isNoNf}
                        placeholder={isNoNf ? "S/NF" : ""}
                        type="text"
                        className={`w-full px-4 py-2 border rounded-lg bg-white ${isNoNf ? 'bg-slate-50 opacity-50 cursor-not-allowed' : ''}`}
                        value={isNoNf ? '' : (formData.nfNumber || '')}
                        onChange={(e) => setFormData({ ...formData, nfNumber: e.target.value })}
                      />
                    </div>
                    <div className="pb-3">
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          disabled={modalMode === 'view'}
                          checked={isNoNf}
                          onChange={(e) => setIsNoNf(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-500 border-slate-300 focus:ring-rose-500"
                        />
                        <span className="text-xs font-black text-rose-500 uppercase tracking-tighter group-hover:text-rose-600 transition-colors">Venda S/NF</span>
                      </label>
                    </div>
                  </div>



                  {/* Linha 2: Tipo e Categoria */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Venda *</label>
                      <select
                        disabled={modalMode === 'view'}
                        required
                        className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50"
                        value={formData.saleType}
                        onChange={(e) => setFormData({ ...formData, saleType: e.target.value as any })}
                      >
                        <option value="Serviço">Serviço</option>
                        <option value="Locação">Locação</option>
                      </select>
                    </div>
                    <div className="relative z-30" ref={accountDropdownRef}>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Conta de Receitas *</label>
                      <div
                        tabIndex={modalMode === 'view' ? -1 : 0}
                        className={`w-full px-4 py-2 border rounded-lg bg-white ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none focus-within:ring-2 focus-within:ring-amber-500`}
                        onClick={() => {
                          if (modalMode !== 'view') {
                            setIsAccountDropdownOpen(!isAccountDropdownOpen);
                            setAccountSearchTerm('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (modalMode !== 'view') {
                              setIsAccountDropdownOpen(!isAccountDropdownOpen);
                              setAccountSearchTerm('');
                            }
                          }
                        }}
                      >
                        <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
                          <span className={`truncate ${!formData.accountPlanId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                            {formData.accountPlanId ? sortedRevenueAccounts.find(p => p.id === formData.accountPlanId) ? `${sortedRevenueAccounts.find(p => p.id === formData.accountPlanId)?.subcategory} / ${sortedRevenueAccounts.find(p => p.id === formData.accountPlanId)?.description}` : 'Conta selecionada não encontrada' : 'Selecione a Conta de Receita...'}
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
                              className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                              value={accountSearchTerm}
                              onChange={(e) => setAccountSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="overflow-y-auto overflow-x-hidden flex-1 max-h-48 drop-scrollbar">
                            {filteredRevenueAccountsForDropdown.length > 0 ? filteredRevenueAccountsForDropdown.map(p => (
                              <div
                                key={p.id}
                                className={`px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm truncate ${formData.accountPlanId === p.id ? 'bg-amber-100 font-bold text-amber-700' : 'text-slate-700'}`}
                                onClick={() => {
                                  setFormData({ ...formData, accountPlanId: p.id });
                                  setIsAccountDropdownOpen(false);
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
                  </div>

                  {/* Linha 3: Cliente */}
                  <div className="relative z-20" ref={customerDropdownRef}>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Cliente *</label>
                    <div
                      tabIndex={modalMode === 'view' ? -1 : 0}
                      className={`w-full px-4 py-2 border rounded-lg bg-white ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none focus-within:ring-2 focus-within:ring-amber-500`}
                      onClick={() => {
                        if (modalMode !== 'view') {
                          setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                          setCustomerSearchTerm('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (modalMode !== 'view') {
                            setIsCustomerDropdownOpen(!isCustomerDropdownOpen);
                            setCustomerSearchTerm('');
                          }
                        }
                      }}
                    >
                      <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
                        <span className={`truncate ${!formData.customerId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                          {formData.customerId ? customers.find(c => c.id === formData.customerId)?.name || 'Cliente não encontrado' : 'Pesquise o Cliente...'}
                        </span>
                      </div>
                    </div>
                    {isCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col overflow-hidden">
                        <div className="p-2 border-b">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Pesquisar cliente..."
                            className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="overflow-y-auto overflow-x-hidden flex-1 max-h-48 drop-scrollbar">
                          {filteredCustomersForDropdown.length > 0 ? filteredCustomersForDropdown.map(c => (
                            <div
                              key={c.id}
                              className={`px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm truncate ${formData.customerId === c.id ? 'bg-amber-100 font-bold text-amber-700' : 'text-slate-700'}`}
                              onClick={() => {
                                setFormData({ ...formData, customerId: c.id, customerName: c.name });
                                setIsCustomerDropdownOpen(false);
                              }}
                            >
                              <span className="font-bold">{c.name}</span>
                            </div>
                          )) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center italic">Nenhum cliente encontrado.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center">
                      <FileText size={16} className="mr-2 text-amber-500" /> Descritivo dos Serviços de Locação
                    </h4>
                    {modalMode !== 'view' && (
                      <button type="button" onClick={handleAddItem} className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-colors flex items-center border border-amber-200 shadow-sm">
                        <Plus size={12} className="mr-1" /> Adicionar Novo Item
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(formData.items || []).map((item, index) => (
                      <div key={item.id} className="flex gap-3 bg-white p-3 rounded-lg shadow-sm border">
                        <div className="flex-1">
                          <input
                            readOnly={modalMode === 'view'}
                            required placeholder="Ex: Diária de Maquina Bobcat, Caminhão Basculante..."
                            className="w-full text-sm font-medium border-b border-transparent focus:border-amber-500 outline-none"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <div className="relative">
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                            <input
                              readOnly={modalMode === 'view'}
                              required className="w-full text-right text-sm font-black border-b border-transparent focus:border-amber-500 outline-none pl-6"
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
                    <span className="font-bold text-slate-500 uppercase text-xs">Valor Bruto</span>
                    <span className="font-black text-2xl text-slate-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Linha 4: Condição, Forma e Vencimento */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Condições PG</label>
                      <select
                        disabled={modalMode === 'view'}
                        className="w-full px-4 py-2 border rounded-lg bg-white transition-all focus:ring-2 focus:ring-amber-500 outline-none"
                        value={formData.paymentCondition} onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value as any })}
                      >
                        <option value="A Vista">À Vista</option>
                        <option value="A Prazo">A Prazo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Forma Pagamento</label>
                      <select
                        disabled={modalMode === 'view'}
                        className="w-full px-4 py-2 border rounded-lg bg-white transition-all focus:ring-2 focus:ring-amber-500 outline-none"
                        value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      >
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência (TED/DOC)</option>
                        <option value="Cartão de Crédito">Cartão Crédito</option>
                        <option value="Cartão de Débito">Cartão Débito</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        {formData.paymentCondition === 'A Prazo' ? 'Vencimento (1ª)' : 'Vencimento'}
                      </label>
                      <input
                        readOnly={modalMode === 'view'}
                        type="date"
                        className="w-full px-4 py-2 border rounded-lg bg-white transition-all focus:ring-2 focus:ring-amber-500 outline-none"
                        value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {formData.paymentCondition === 'A Prazo' && (
                    <div className="animate-in fade-in zoom-in border-l-4 border-amber-500 pl-4 bg-slate-50 p-4 rounded-r-xl mt-4">
                      <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="w-full sm:w-48">
                          <label className="block text-sm font-bold text-slate-700 mb-1">Qtd Parcelas</label>
                          <input
                            readOnly={modalMode === 'view'}
                            type="number" min="1" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                            value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: Number(e.target.value) })}
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
                              <tr className="bg-slate-100/50 border-b border-slate-200">
                                <th className="p-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 w-20">Parcela</th>
                                <th className="p-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Vencimento</th>
                                <th className="p-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Valor (R$)</th>
                                {modalMode !== 'view' && <th className="p-3 w-10"></th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {formData.installmentsList.map((inst, idx) => (
                                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3">
                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                                      {inst.number}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <input
                                      type="date"
                                      disabled={modalMode === 'view'}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm bg-transparent outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-75"
                                      value={inst.dueDate}
                                      onChange={(e) => updateInstallment(inst.id, 'dueDate', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                                      <input
                                        type="text"
                                        disabled={modalMode === 'view'}
                                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded text-sm bg-transparent outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-75 font-medium"
                                        value={formatInputCurrency(inst.value)}
                                        onChange={(e) => updateInstallment(inst.id, 'value', parseCurrencyInput(e.target.value))}
                                      />
                                    </div>
                                  </td>
                                  {modalMode !== 'view' && (
                                    <td className="p-3">
                                      {/* Reserved for future remove action if necessary */}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-600 uppercase text-[10px]">Total Parcelado:</span>
                            <span className={`font-black ${Math.abs((formData.installmentsList.reduce((acc, i) => acc + (Number(i.value) || 0), 0)) - calculateTotal()) > 0.05 ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {formatCurrency(formData.installmentsList.reduce((acc, i) => acc + (Number(i.value) || 0), 0))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Descritivo dos Serviços de Locação foi movido para cima */}

                  {/* Anexo da Nota Fiscal (Aparece apenas se NÃO for S/NF) */}
                  {!isNoNf && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 mb-4">
                      <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center text-sm font-bold text-slate-700"><FileText size={14} className="mr-1" /> Anexo (Nota Fiscal / Fatura)</span>
                        {isUploading && <span className="text-[10px] text-amber-500 font-bold animate-pulse">Enviando...</span>}
                      </label>
                      <div className="flex items-center gap-3 w-full">
                        {formData.receiptUrl ? (
                          <div className="flex items-center justify-between w-full bg-white px-4 py-2 rounded-lg border border-slate-200">
                            <a href={formData.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-bold flex items-center truncate max-w-[300px]" title="Ver Anexo">
                              <FileText size={16} className="mr-1 flex-shrink-0" /> {formData.receiptUrl.split('/').pop()?.substring(0, 20)}... Anexado
                            </a>
                            {modalMode !== 'view' && (
                              <button type="button" onClick={() => setFormData({ ...formData, receiptUrl: undefined })} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-full hover:bg-rose-50 transition-colors" title="Remover Documento">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 w-full bg-white px-3 py-2 rounded-lg border border-slate-200">
                            <input
                              type="file"
                              disabled={modalMode === 'view' || isUploading}
                              onChange={handleFileUpload}
                              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50 outline-none cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                      {uploadError && <p className="text-[10px] text-rose-500 mt-1 font-bold">{uploadError}</p>}
                    </div>
                  )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Observações Técnicas / Faturamento (Saem na Fatura de Locação)</label>
                  <textarea
                    readOnly={modalMode === 'view'}
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs leading-relaxed"
                    rows={4}
                    placeholder={`FORMA DE PAGAMENTO: 15 DIAS \nBOLETO ANEXO: vencimento dia XX/XX/XXXX`}
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button type="button" onClick={() => { setIsNoNf(false); setIsModalOpen(false); }} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">
                    {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                  </button>
                  {modalMode !== 'view' && (
                    <button type="submit" disabled={isUploading} className="px-10 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-xl shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
                      {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManager;
