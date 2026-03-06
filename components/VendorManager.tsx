
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, Search, Edit, Trash2, Truck, X, AlertTriangle, User, CreditCard, Tag
} from 'lucide-react';
import { Vendor, AccountPlan, Expense } from '../types';

interface VendorManagerProps {
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  accountPlan: AccountPlan[];
  expenses: Expense[];
  onNavigateToReports?: () => void;
}

const VendorManager: React.FC<VendorManagerProps> = ({ vendors, setVendors, accountPlan, expenses, onNavigateToReports }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativos' | 'Inativos'>('Ativos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '', personType: 'PJ', categoryId: '', document: '', address: '', contactPerson: '', phone: '', email: '', notes: '', isActive: true
  });

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
    const search = accountSearchTerm.toLowerCase();
    return sortedExpenseAccounts.filter(p =>
      p.category.toLowerCase().includes(search) ||
      p.subcategory.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search)
    );
  }, [sortedExpenseAccounts, accountSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.document.includes(searchTerm) ||
        v.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'Todos' ||
        (statusFilter === 'Ativos' && v.isActive !== false) ||
        (statusFilter === 'Inativos' && v.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

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
    setFormData({ name: '', personType: 'PJ', categoryId: '', document: '', address: '', contactPerson: '', phone: '', email: '', notes: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setFormData(vendor);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.document) return alert('Nome e Documento são obrigatórios.');

    if (editingId) {
      setVendors(prev => prev.map(v => v.id === editingId ? { ...v, ...formData, categoryId: formData.categoryId || null } as Vendor : v));
      setIsModalOpen(false);
    } else {
      const newVendor: Vendor = {
        id: crypto.randomUUID(),
        name: formData.name!,
        personType: formData.personType || 'PJ',
        categoryId: formData.categoryId || null,
        document: formData.document!,
        address: formData.address || '',
        contactPerson: formData.contactPerson || '',
        phone: formData.phone || '',
        email: formData.email || '',
        notes: formData.notes || '',
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        createdAt: Date.now()
      };
      setVendors(prev => [newVendor, ...prev]);
      setFormData({ name: '', personType: 'PJ', categoryId: '', document: '', address: '', contactPerson: '', phone: '', email: '', notes: '', isActive: true });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar fornecedor..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
              className="flex-1 sm:flex-none bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 font-bold transition-all shadow-sm"
            >
              <Truck size={18} className="text-amber-500" />
              <span>Relatórios</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 font-bold shadow-lg">
            <Truck size={18} /> <span>Novo Fornecedor</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Fornecedor / Documento</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Responsável</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Fone</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredVendors.length > 0 ? filteredVendors.map(vendor => (
              <tr key={vendor.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{vendor.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${vendor.isActive !== false ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {vendor.isActive !== false ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {vendor.personType === 'PF' ? 'CPF: ' : 'CNPJ: '}{vendor.document}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${vendor.personType === 'PJ' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                    {vendor.personType || 'PJ'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{vendor.contactPerson || '---'}</td>
                <td className="px-6 py-4 text-sm text-slate-700 font-bold">{vendor.phone || '---'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenEdit(vendor)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(vendor.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">Nenhum fornecedor cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-150">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-slate-700">Nome / Razão Social *</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, personType: 'PF', document: '' })}
                        className={`px-3 py-0.5 rounded-md text-[10px] font-black transition-all ${formData.personType === 'PF' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                      >
                        PESSOA FÍSICA
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, personType: 'PJ', document: '' })}
                        className={`px-3 py-0.5 rounded-md text-[10px] font-black transition-all ${formData.personType === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        PESSOA JURÍDICA
                      </button>
                    </div>
                  </div>
                  <input
                    ref={nameInputRef}
                    autoFocus
                    required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium text-lg uppercase"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
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
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Nome do Responsável</label>
                  <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Telefone Contato</label>
                  <input
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                    placeholder="(00) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">E-mail</label>
                  <input type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1 font-black uppercase text-[10px] text-amber-600">Vincular a uma Conta do Plano de Contas (Opcional)</label>
                  <div className="relative" ref={accountDropdownRef}>
                    <div
                      className="w-full px-4 py-2 border rounded-lg bg-white border-slate-200 outline-none focus-within:ring-2 focus-within:ring-amber-500 cursor-pointer"
                      onClick={() => {
                        setIsAccountDropdownOpen(!isAccountDropdownOpen);
                        setAccountSearchTerm('');
                      }}
                    >
                      <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
                        <span className={`truncate ${!formData.categoryId ? 'text-slate-500' : 'text-slate-800 font-bold'}`}>
                          {formData.categoryId ? sortedExpenseAccounts.find(p => p.id === formData.categoryId) ? `${sortedExpenseAccounts.find(p => p.id === formData.categoryId)?.category} / ${sortedExpenseAccounts.find(p => p.id === formData.categoryId)?.subcategory} (${sortedExpenseAccounts.find(p => p.id === formData.categoryId)?.description})` : 'Conta selecionada não encontrada' : 'Nenhuma conta vinculada...'}
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
                          {filteredExpenseAccountsForDropdown.length > 0 ? filteredExpenseAccountsForDropdown.map(p => (
                            <div
                              key={p.id}
                              className={`px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm truncate ${formData.categoryId === p.id ? 'bg-amber-100 font-bold text-amber-700' : 'text-slate-700'}`}
                              onClick={() => {
                                setFormData({ ...formData, categoryId: p.id });
                                setIsAccountDropdownOpen(false);
                              }}
                            >
                              {p.category} / {p.subcategory} ({p.description})
                            </div>
                          )) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center italic">Nenhuma conta encontrada.</div>
                          )}
                          {formData.categoryId && (
                            <div
                              className="px-4 py-2 hover:bg-rose-50 cursor-pointer text-sm text-rose-600 font-bold border-t italic"
                              onClick={() => {
                                setFormData({ ...formData, categoryId: '' });
                                setIsAccountDropdownOpen(false);
                              }}
                            >
                              Remover vínculo de conta
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Endereço Completo</label>
                  <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Anotações / Observações</label>
                  <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Instruções de faturamento, prazos de pagamento, horário de atendimento..." />
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
                    <span className="text-sm font-bold text-slate-700 select-none">Fornecedor Ativo</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-1">Fornecedores inativos são ocultados de alguns relatórios e telas de seleção.</p>
                </div>
                <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                  <button type="submit" className="px-10 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-xl shadow-amber-200">Salvar Fornecedor</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            {expenses.some(e => e.vendorId === deleteConfirmId) ? (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> EXCLUSÃO NÃO AUTORIZADA</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Existem lançamentos para esse fornecedor, entre no cadastro e mude para INATIVO.</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-300">Voltar</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Fornecedor?</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão deste fornecedor?</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Excluir Agora</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManager;
