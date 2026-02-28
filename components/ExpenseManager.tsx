
import React, { useState, useMemo } from 'react';
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

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, setExpenses, vendors, accountPlan, bankAccounts, onNavigateToReports }) => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA');

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [nfFilter, setNfFilter] = useState<'all' | 'noNf' | 'withNf'>('all');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pago' | 'Pendente'>('Pendente');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    paymentCondition: 'A Prazo',
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

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const docDate = e.date;
        const matchesDate = (!startDate || docDate >= startDate) && (!endDate || docDate <= endDate);

        const matchesNf = nfFilter === 'all' ||
          (nfFilter === 'noNf' && e.isNoDoc) ||
          (nfFilter === 'withNf' && !e.isNoDoc);

        const matchesStatus = statusFilter === 'Todos' || e.status === statusFilter;

        return matchesDate && matchesNf && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, startDate, endDate, nfFilter, statusFilter]);

  const handleOpenAdd = () => {
    if (vendors.length === 0) return alert('Cadastre um fornecedor primeiro.');
    setEditingId(null);
    setModalMode('add');
    setFormData({
      vendorId: '', accountPlanId: '', items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
      docNumber: '', isNoDoc: false, paymentMethod: 'Boleto', paymentCondition: 'A Prazo',
      date: new Date().toLocaleDateString('en-CA'),
      dueDate: '', status: 'Pendente'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense, mode: 'edit' | 'view') => {
    setEditingId(expense.id);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') {
      setIsModalOpen(false);
      return;
    }

    const total = calculateTotal();
    if (!formData.vendorId || !formData.accountPlanId || total <= 0) return alert('Preencha os campos obrigatórios.');

    const vendor = vendors.find(v => v.id === formData.vendorId);
    const expenseData: Expense = {
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
      paymentCondition: formData.paymentCondition || 'A Prazo',
      dueDate: formData.dueDate,
      status: formData.status as any || 'Pendente',
      receiptUrl: formData.receiptUrl,
      paymentReceiptUrl: formData.paymentReceiptUrl,
      createdAt: Date.now()
    };

    if (editingId) {
      setExpenses(prev => prev.map(ex => ex.id === editingId ? expenseData : ex));
    } else {
      setExpenses(prev => [expenseData, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-slate-500 whitespace-nowrap">Status PG:</span>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-rose-500/20 font-bold"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="Todos">Todos</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-slate-500 whitespace-nowrap">Filtro:</span>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-rose-500/20"
              value={nfFilter}
              onChange={(e) => setNfFilter(e.target.value as any)}
            >
              <option value="all">Todas Despesas</option>
              <option value="noNf">Despesas S/N</option>
              <option value="withNf">Despesas com NF</option>
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
              onChange={(e) => setEndDate(e.target.value)}
              title="Data Final"
            />
            <button
              onClick={() => {
                const today = new Date();
                setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA'));
                setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('en-CA'));
              }}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors whitespace-nowrap w-full sm:w-auto"
            >
              Mês Atual
            </button>
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
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Tipo de Despesa</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Fornecedor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Documento / Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Data Vencto</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Valor Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Status PG</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                  {accountPlan.find(p => p.id === expense.accountPlanId)?.subcategory || 'Diversos'}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{expense.vendorName}</td>
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
                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                  {formatDateDisplay(expense.dueDate)}
                </td>
                <td className="px-6 py-4 font-black text-rose-600">{formatCurrency(expense.totalValue)}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${expense.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {expense.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    <button onClick={() => handleOpenEdit(expense, 'view')} className="p-2 text-slate-400 hover:text-blue-500 rounded-lg" title="Ver"><Eye size={18} /></button>
                    <button onClick={() => handleOpenEdit(expense, 'edit')} className="p-2 text-slate-400 hover:text-amber-500 rounded-lg" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(expense.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Row 1: Nº DOC, Data, Despesas S/N */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nº DOC</label>
                    <input
                      autoFocus
                      readOnly={modalMode === 'view' || formData.isNoDoc}
                      type="text" className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.isNoDoc ? 'S/N' : formData.docNumber} onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Data Documento</label>
                    <input
                      readOnly={modalMode === 'view'}
                      required type="date" className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor *</label>
                  <select
                    disabled={modalMode === 'view'}
                    required
                    className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {vendors
                      .filter(v => v.isActive !== false || v.id === formData.vendorId)
                      .map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                    }
                  </select>
                </div>

                {/* Row 3: Forma Pagto, Vencimento, Status Inicial */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vencimento</label>
                    <input
                      readOnly={modalMode === 'view'}
                      type="date" className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status Inicial</label>
                    <select
                      disabled={modalMode === 'view'}
                      className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="Pendente">A Pagar</option>
                      <option value="Pago">Pago (Baixado)</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Tipo de Despesa e Anexo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Despesa *</label>
                    <select
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50 border-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                      value={formData.accountPlanId}
                      onChange={(e) => setFormData({ ...formData, accountPlanId: e.target.value })}
                    >
                      <option value="">Selecione a Categoria de Despesa...</option>
                      {accountPlan.filter(p => p.type === 'Despesa').map(p => (
                        <option key={p.id} value={p.id}>{p.category} / {p.subcategory}</option>
                      ))}
                    </select>
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

              {/* Items List */}
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

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" disabled={isUploading} className="px-10 py-2 text-white font-bold rounded-lg shadow-xl transition-all bg-rose-500 hover:bg-rose-600 shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
