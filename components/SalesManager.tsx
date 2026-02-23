
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, FileText, Eye, AlertTriangle, Printer, ScrollText, FileX
} from 'lucide-react';
import { Sale, Customer, Payment, AccountPlan, SaleItem } from '../types';
import RentalInvoice from './RentalInvoice';

interface SalesManagerProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  payments: Payment[];
  accountPlan: AccountPlan[];
}

const SalesManager: React.FC<SalesManagerProps> = ({ sales, setSales, customers, payments, accountPlan }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNoNF, setIsNoNF] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'print'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Sale>>({
    customerId: '',
    accountPlanId: '',
    items: [{ id: crypto.randomUUID(), description: '', value: 0 }],
    nfNumber: '',
    isNoNF: false,
    saleType: 'Serviço',
    paymentMethod: 'PIX',
    paymentCondition: 'A Vista',
    installments: 1,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    observations: '',
    deductions: 0
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatInputCurrency = (value: number) => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nfNumber?.includes(searchTerm)
    );
  }, [sales, searchTerm]);

  const handleOpenAdd = () => {
    if (customers.length === 0) return alert('Cadastre um cliente primeiro.');
    setEditingId(null);
    setModalMode('add');
    setFormData({ 
      customerId: '', accountPlanId: '', items: [{ id: crypto.randomUUID(), description: '', value: 0 }], 
      nfNumber: '', isNoNF: false, saleType: 'Serviço', paymentMethod: 'PIX', paymentCondition: 'A Vista', 
      installments: 1, date: new Date().toISOString().split('T')[0],
      dueDate: '', observations: '', deductions: 0
    });
    setIsNoNF(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sale: Sale, mode: 'edit' | 'view' | 'print') => {
    setEditingId(sale.id);
    setModalMode(mode);
    setFormData({ ...sale });
    setIsNoNF(!!sale.isNoNF);
    setIsModalOpen(true);
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
      nfNumber: isNoNF ? '' : (formData.nfNumber || ''),
      isNoNF: isNoNF,
      saleType: formData.saleType || 'Serviço',
      paymentMethod: formData.paymentMethod || 'PIX',
      paymentCondition: formData.paymentCondition || 'A Vista',
      installments: formData.installments || 1,
      dueDate: formData.paymentCondition === 'A Prazo' ? formData.dueDate : undefined,
      status: editingId ? (sales.find(s => s.id === editingId)?.status || 'Pendente') : 'Pendente',
      observations: formData.observations || '',
      createdAt: Date.now()
    };

    if (editingId) {
      setSales(prev => prev.map(s => s.id === editingId ? saleData : s));
    } else {
      setSales(prev => [saleData, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar por cliente ou NF..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg">
          <Plus size={18} /> <span>Lançar Venda</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto print:hidden">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">NF / Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Plano de Contas</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Condição</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Valor Total</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                        <span className={`font-bold ${sale.isNoNF ? 'text-rose-500' : 'text-slate-800'}`}>
                            {sale.isNoNF ? 'S/NF' : `#${sale.nfNumber || 'S/N'}`}
                        </span>
                        {sale.isNoNF && <FileX size={12} className="text-rose-500" />}
                    </div>
                    <span className="text-xs text-slate-500">{new Date(sale.date).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{sale.customerName}</td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500 italic">
                    {accountPlan.find(p => p.id === sale.accountPlanId)?.subcategory || 'Não Categorizado'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-slate-700">{sale.paymentCondition} ({sale.paymentMethod})</span>
                </td>
                <td className="px-6 py-4 font-black text-slate-900">{formatCurrency(sale.totalValue)}</td>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Venda *</label>
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
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente *</label>
                        <select 
                        autoFocus
                        disabled={modalMode === 'view'}
                        required 
                        className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50" 
                        value={formData.customerId} 
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                        >
                        <option value="">Selecione o Cliente...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Plano de Contas *</label>
                        <select 
                        disabled={modalMode === 'view'}
                        required
                        className="w-full px-4 py-2 border rounded-lg bg-white disabled:bg-slate-50" 
                        value={formData.accountPlanId} 
                        onChange={(e) => setFormData({ ...formData, accountPlanId: e.target.value })}
                        >
                        <option value="">Selecione a Categoria de Receita...</option>
                        {accountPlan.filter(p => p.type === 'Receita').map(p => (
                            <option key={p.id} value={p.id}>{p.category} / {p.subcategory}</option>
                        ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nº Fatura / Nota</label>
                        <input 
                            readOnly={modalMode === 'view' || isNoNF}
                            disabled={isNoNF}
                            placeholder={isNoNF ? "S/NF" : ""}
                            type="text" 
                            className={`w-full px-4 py-2 border rounded-lg bg-white ${isNoNF ? 'bg-slate-50 opacity-50 cursor-not-allowed' : ''}`} 
                            value={isNoNF ? '' : (formData.nfNumber || '')} 
                            onChange={(e) => setFormData({ ...formData, nfNumber: e.target.value })} 
                        />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-semibold text-slate-700">Data Emissão</label>
                                <label className="flex items-center space-x-1.5 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        disabled={modalMode === 'view'}
                                        checked={isNoNF} 
                                        onChange={(e) => setIsNoNF(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-rose-500 border-slate-300 focus:ring-rose-500"
                                    />
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter group-hover:text-rose-600 transition-colors">Venda S/NF</span>
                                </label>
                            </div>
                            <input 
                                readOnly={modalMode === 'view'}
                                required type="date" className="w-full px-4 py-2 border rounded-lg bg-white" 
                                value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                            />
                        </div>
                    </div>
                    </div>

                    <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Pagamento</label>
                        <select 
                            disabled={modalMode === 'view'}
                            className="w-full px-4 py-2 border rounded-lg bg-white" 
                            value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        >
                            <option value="PIX">PIX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Boleto">Boleto</option>
                            <option value="Cartão de Crédito">Cartão Crédito</option>
                            <option value="Cartão de Débito">Cartão Débito</option>
                        </select>
                        </div>
                        <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Condição</label>
                        <select 
                            disabled={modalMode === 'view'}
                            className="w-full px-4 py-2 border rounded-lg bg-white" 
                            value={formData.paymentCondition} onChange={(e) => setFormData({ ...formData, paymentCondition: e.target.value as any })}
                        >
                            <option value="A Vista">À Vista</option>
                            <option value="A Prazo">A Prazo</option>
                        </select>
                        </div>
                    </div>

                    {formData.paymentCondition === 'A Prazo' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Qtd Parcelas</label>
                            <input 
                            readOnly={modalMode === 'view'}
                            type="number" min="1" className="w-full px-4 py-2 border rounded-lg" 
                            value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: Number(e.target.value) })} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Vencimento (1ª)</label>
                            <input 
                            readOnly={modalMode === 'view'}
                            type="date" className="w-full px-4 py-2 border rounded-lg" 
                            value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} 
                            />
                        </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Retenções / Descontos (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                            <input 
                                readOnly={modalMode === 'view'}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg font-bold text-rose-500"
                                value={formatInputCurrency(formData.deductions || 0)}
                                onChange={(e) => setFormData({ ...formData, deductions: parseCurrencyInput(e.target.value) })}
                            />
                        </div>
                    </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center">
                        <FileText size={16} className="mr-2 text-amber-500" /> Descritivo dos Serviços de Locação
                    </h4>
                    {modalMode !== 'view' && (
                        <button type="button" onClick={handleAddItem} className="text-amber-600 hover:text-amber-700 font-bold text-xs uppercase">+ Adicionar Novo Item</button>
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

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest text-[10px]">Observações Técnicas / Faturamento (Saem na Fatura de Locação)</label>
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
                    <button type="button" onClick={() => { setIsNoNF(false); setIsModalOpen(false); }} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">
                    {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                    </button>
                    {modalMode !== 'view' && (
                    <button type="submit" className="px-10 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-xl shadow-amber-200">
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
