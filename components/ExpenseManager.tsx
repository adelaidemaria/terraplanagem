
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, FileText, Eye, AlertTriangle, BookOpen, CheckCircle, CreditCard, Building2
} from 'lucide-react';
import { Expense, Vendor, AccountPlan, ExpenseItem, BankAccount } from '../types';

interface ExpenseManagerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  vendors: Vendor[];
  accountPlan: AccountPlan[];
  bankAccounts: BankAccount[];
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, setExpenses, vendors, accountPlan, bankAccounts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'pay'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Payment State
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState<Partial<Expense>>({
    vendorId: '',
    accountPlanId: '',
    items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
    docNumber: '',
    paymentMethod: 'Boleto',
    paymentCondition: 'A Prazo',
    date: new Date().toISOString().split('T')[0],
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
    return expenses.filter(e => 
      e.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.docNumber?.includes(searchTerm)
    );
  }, [expenses, searchTerm]);

  const handleOpenAdd = () => {
    if (vendors.length === 0) return alert('Cadastre um fornecedor primeiro.');
    setEditingId(null);
    setModalMode('add');
    setFormData({ 
      vendorId: '', accountPlanId: '', items: [{ id: crypto.randomUUID(), description: '', value: 0 }], 
      docNumber: '', paymentMethod: 'Boleto', paymentCondition: 'A Prazo', 
      date: new Date().toISOString().split('T')[0],
      dueDate: '', status: 'Pendente'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense, mode: 'edit' | 'view' | 'pay') => {
    setEditingId(expense.id);
    setModalMode(mode);
    setFormData({ ...expense });
    if (mode === 'pay') {
      setPayDate(new Date().toISOString().split('T')[0]);
      setPayBankId('');
    }
    setIsModalOpen(true);
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

    if (modalMode === 'pay') {
      if (!payBankId) return alert('Selecione a conta bancária.');
      setExpenses(prev => prev.map(exp => exp.id === editingId ? { 
        ...exp, 
        status: 'Pago', 
        bankAccountId: payBankId, 
        paymentDate: payDate 
      } : exp));
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
      paymentMethod: formData.paymentMethod || 'Boleto',
      paymentCondition: formData.paymentCondition || 'A Prazo',
      dueDate: formData.dueDate,
      status: formData.status as any || 'Pendente',
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar despesas (Fornecedor ou Doc)..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={handleOpenAdd} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg">
          <Plus size={18} /> <span>Lançar Despesa</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Documento / Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Fornecedor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Plano de Contas</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Valor Total</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">Doc: {expense.docNumber || 'S/N'}</span>
                    <span className="text-xs text-slate-500">{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{expense.vendorName}</td>
                <td className="px-6 py-4 text-xs text-slate-500 italic">
                  {accountPlan.find(p => p.id === expense.accountPlanId)?.subcategory || 'Diversos'}
                </td>
                <td className="px-6 py-4 font-black text-rose-600">{formatCurrency(expense.totalValue)}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    expense.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {expense.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    {expense.status === 'Pendente' && (
                      <button onClick={() => handleOpenEdit(expense, 'pay')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Pagar"><CheckCircle size={18} /></button>
                    )}
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
                {modalMode === 'view' ? 'Detalhes da Despesa' : modalMode === 'pay' ? 'Baixa de Pagamento' : editingId ? 'Editar Despesa' : 'Novo Lançamento de Despesa'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {modalMode === 'pay' ? (
                <div className="space-y-4 max-w-md mx-auto py-4">
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">A Pagar Para</p>
                    <p className="font-bold text-slate-800 text-lg">{formData.vendorName}</p>
                    <p className="text-xl font-black text-rose-600 mt-1">{formatCurrency(calculateTotal())}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">Pagar Com (Conta Banco) *</label>
                    <select 
                      autoFocus
                      required className="w-full px-4 py-2 border rounded-lg bg-white" 
                      value={payBankId} onChange={(e) => setPayBankId(e.target.value)}
                    >
                      <option value="">Selecione a conta de saída...</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} / {b.accountNumber}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700">Data do Pagamento</label>
                    <input type="date" className="w-full px-4 py-2 border rounded-lg" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor *</label>
                      <select 
                        autoFocus
                        disabled={modalMode === 'view'}
                        required 
                        className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50" 
                        value={formData.vendorId} 
                        onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                      >
                        <option value="">Selecione o Fornecedor...</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Plano de Contas (Despesas) *</label>
                      <select 
                        disabled={modalMode === 'view'}
                        required
                        className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50" 
                        value={formData.accountPlanId} 
                        onChange={(e) => setFormData({ ...formData, accountPlanId: e.target.value })}
                      >
                        <option value="">Selecione a Categoria de Despesa...</option>
                        {accountPlan.filter(p => p.type === 'Despesa').map(p => (
                          <option key={p.id} value={p.id}>{p.category} / {p.subcategory}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nº Documento / Boleto</label>
                        <input 
                          readOnly={modalMode === 'view'}
                          type="text" className="w-full px-4 py-2 border rounded-lg bg-white" 
                          value={formData.docNumber} onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Data Competência</label>
                        <input 
                          readOnly={modalMode === 'view'}
                          required type="date" className="w-full px-4 py-2 border rounded-lg bg-white" 
                          value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Método Sugerido</label>
                        <select 
                          disabled={modalMode === 'view'}
                          className="w-full px-4 py-2 border rounded-lg bg-white" 
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
                          type="date" className="w-full px-4 py-2 border rounded-lg bg-white" 
                          value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Status Inicial</label>
                      <select 
                        disabled={modalMode === 'view'}
                        className="w-full px-4 py-2 border rounded-lg bg-white" 
                        value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      >
                        <option value="Pendente">A Pagar</option>
                        <option value="Pago">Pago (Baixado)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List (only if not in simple payment mode) */}
              {modalMode !== 'pay' && (
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
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className={`px-10 py-2 text-white font-bold rounded-lg shadow-xl transition-all ${
                    modalMode === 'pay' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                  }`}>
                    {modalMode === 'pay' ? 'Confirmar Pagamento' : editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
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
