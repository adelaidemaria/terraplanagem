
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, UserPlus, X, AlertTriangle, CreditCard, User, History
} from 'lucide-react';
import { Customer, CustomerInteraction, Sale } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  onNavigateToReports?: () => void;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, sales, onNavigateToReports }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativos' | 'Inativos'>('Ativos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newInteractionDate, setNewInteractionDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [newInteractionText, setNewInteractionText] = useState('');

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', personType: 'PJ', document: '', address: '', contactPerson: '', phone: '', email: '', interactions: [], isActive: true
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.document.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'Todos' ||
        (statusFilter === 'Ativos' && c.isActive !== false) ||
        (statusFilter === 'Inativos' && c.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  // Funções de máscara
  const maskCPF = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const maskCNPJ = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 14) v = v.substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    return v;
  };

  const maskPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);

    if (v.length > 10) {
      // (99) 99999-9999
      v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (v.length > 6) {
      // (99) 9999-9999
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length > 2) {
      // (99) 9999
      v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (v.length > 0) {
      // (99
      v = v.replace(/^(\d*)/, "($1");
    }
    return v;
  };

  const handleDocumentChange = (val: string) => {
    const masked = formData.personType === 'PF' ? maskCPF(val) : maskCNPJ(val);
    setFormData({ ...formData, document: masked });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', personType: 'PJ', document: '', address: '', contactPerson: '', phone: '', email: '', interactions: [], isActive: true });
    setNewInteractionDate(new Date().toLocaleDateString('en-CA'));
    setNewInteractionText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({ ...customer, interactions: customer.interactions || [], isActive: customer.isActive !== false });
    setNewInteractionDate(new Date().toLocaleDateString('en-CA'));
    setNewInteractionText('');
    setIsModalOpen(true);
  };

  const handleAddInteraction = () => {
    if (!newInteractionText.trim()) return;
    const interaction: CustomerInteraction = {
      id: crypto.randomUUID(),
      date: newInteractionDate,
      text: newInteractionText.trim()
    };
    setFormData(prev => ({
      ...prev,
      interactions: [interaction, ...(prev.interactions || [])]
    }));
    setNewInteractionText('');
  };

  const handleRemoveInteraction = (id: string) => {
    setFormData(prev => ({
      ...prev,
      interactions: (prev.interactions || []).filter(i => i.id !== id)
    }));
  };

  const handleDelete = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.document) return alert('Nome e Documento são obrigatórios.');

    const customerName = formData.name!.toUpperCase();

    if (editingId) {
      setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...formData, name: customerName } as Customer : c));
    } else {
      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        name: customerName,
        personType: formData.personType || 'PJ',
        document: formData.document!,
        address: formData.address || '',
        contactPerson: formData.contactPerson || '',
        phone: formData.phone || '',
        email: formData.email || '',
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        interactions: formData.interactions || [],
        createdAt: Date.now()
      };
      setCustomers(prev => [newCustomer, ...prev]);
    }

    // Limpar formulário e manter aberto para novo cadastro
    setEditingId(null);
    setFormData({ 
      name: '', 
      personType: 'PJ', 
      document: '', 
      address: '', 
      contactPerson: '', 
      phone: '', 
      email: '', 
      interactions: [], 
      isActive: true 
    });
    setNewInteractionDate(new Date().toLocaleDateString('en-CA'));
    setNewInteractionText('');
    
    // Garantir o foco no campo de nome para o próximo cadastro
    setTimeout(() => nameInputRef.current?.focus(), 100);
    // setIsModalOpen(false); // Mantém aberto conforme solicitado
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar cliente..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-slate-500 whitespace-nowrap">Status:</span>
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm bg-white text-slate-600 focus:ring-2 focus:ring-amber-500 font-bold"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="Ativos">ATIVOS</option>
              <option value="Inativos">INATIVOS</option>
              <option value="Todos">TODOS</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all shadow-sm"
            >
              <History size={18} className="text-amber-500" />
              <span>Relatórios</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg">
            <UserPlus size={18} /> <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Cliente / Documento</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Responsável</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Fone</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{customer.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${customer.isActive !== false ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {customer.isActive !== false ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {customer.personType === 'PF' ? 'CPF: ' : 'CNPJ: '}{customer.document}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${customer.personType === 'PJ' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                    {customer.personType}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{customer.contactPerson || '---'}</td>
                <td className="px-6 py-4 text-sm text-slate-700 font-bold">{customer.phone || '---'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenEdit(customer)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(customer.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
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
            {sales.some(s => s.customerId === deleteConfirmId) ? (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> EXCLUSÃO NÃO AUTORIZADA</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Existem lançamentos para esse cliente, entre no cadastro e mude para INATIVO.</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-300">Voltar</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Cliente?</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Tem certeza que deseja remover este cliente?</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-150">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Cliente' : 'Ficha de Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-bold text-slate-700">Nome / Razão Social *</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, personType: 'PF', document: '' })}
                        className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${formData.personType === 'PF' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        PESSOA FÍSICA
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, personType: 'PJ', document: '' })}
                        className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${formData.personType === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        PESSOA JURÍDICA
                      </button>
                    </div>
                  </div>
                  <input
                    ref={nameInputRef}
                    autoFocus
                    required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium uppercase"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">
                    {formData.personType === 'PF' ? 'CPF *' : 'CNPJ *'}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {formData.personType === 'PF' ? <User size={16} /> : <CreditCard size={16} />}
                    </div>
                    <input
                      required
                      placeholder={formData.personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                      value={formData.document}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">Nome do Responsável</label>
                  <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">Telefone Contato</label>
                  <input
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                    placeholder="(00) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">E-mail</label>
                  <input type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-1 text-slate-700">Endereço Completo</label>
                  <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
                </div>

                {/* Histórico / Timeline */}
                <div className="md:col-span-2 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center"><History className="mr-2 text-amber-500" size={16} /> Histórico de Interações</h3>

                  <div className="flex gap-2 mb-4">
                    <input
                      type="date"
                      className="w-32 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-600"
                      value={newInteractionDate}
                      onChange={e => setNewInteractionDate(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Nova ocorrência, lembrete ou cobrança..."
                      className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      value={newInteractionText}
                      onChange={e => setNewInteractionText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInteraction())}
                    />
                    <button type="button" onClick={handleAddInteraction} className="bg-amber-100 text-amber-700 px-3 py-2 rounded-lg font-bold hover:bg-amber-200 transition-colors text-sm flex items-center">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {(formData.interactions || []).length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium italic text-center py-4">Nenhum histórico registrado para este cliente.</p>
                    ) : (
                      (formData.interactions || []).map(interaction => {
                        const dateParts = interaction.date.split('-');
                        const displayDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : interaction.date;
                        return (
                          <div key={interaction.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-start justify-between group shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-amber-600 font-black uppercase mb-0.5">{displayDate}</span>
                              <span className="text-sm text-slate-700 font-medium">{interaction.text}</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveInteraction(interaction.id)} className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                              <X size={14} />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 mt-2">
                  <label className="flex items-center cursor-pointer space-x-3 group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.isActive !== false}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isActive !== false ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isActive !== false ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 select-none">Cliente Ativo</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-1">Clientes inativos são ocultados de alguns relatórios e telas de seleção de vendas.</p>
                </div>
                <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                  <button type="submit" className="px-10 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-xl shadow-amber-200">Salvar Cadastro</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
