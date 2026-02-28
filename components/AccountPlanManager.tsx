
import React, { useState, useRef, useMemo } from 'react';
import { Plus, Trash2, BookOpen, X, Edit, AlertTriangle, Printer, Settings, Search, Filter } from 'lucide-react';
import { AccountPlan, AccountCategory } from '../types';

interface AccountPlanManagerProps {
  accountPlan: AccountPlan[];
  setAccountPlan: React.Dispatch<React.SetStateAction<AccountPlan[]>>;
  accountCategories?: AccountCategory[];
  setAccountCategories?: React.Dispatch<React.SetStateAction<AccountCategory[]>>;
  onNavigateToReports?: () => void;
}

const AccountPlanManager: React.FC<AccountPlanManagerProps> = ({ accountPlan, setAccountPlan, accountCategories = [], setAccountCategories, onNavigateToReports }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const typeSelectRef = useRef<HTMLSelectElement>(null);

  // Filter States
  const [filterType, setFilterType] = useState<'Todos' | 'Receita' | 'Despesa' | 'Outros'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<AccountPlan>>({
    type: 'Receita',
    category: '',
    subcategory: '',
    description: ''
  });

  const [categoryFormData, setCategoryFormData] = useState<Partial<AccountCategory>>({
    type: 'Receita',
    name: ''
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ type: 'Receita', category: '', subcategory: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: AccountPlan) => {
    setEditingId(plan.id);
    setFormData(plan);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setAccountPlan(prev => prev.filter(p => p.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subcategory) return alert('Preencha os campos obrigatórios.');

    if (editingId) {
      setAccountPlan(prev => prev.map(p => p.id === editingId ? { ...p, ...formData } as AccountPlan : p));
      setIsModalOpen(false);
    } else {
      const newPlan: AccountPlan = {
        id: crypto.randomUUID(),
        type: formData.type as any,
        category: formData.category!,
        subcategory: formData.subcategory!,
        description: formData.description || ''
      };
      setAccountPlan(prev => [...prev, newPlan]);
      setFormData({ type: 'Despesa', category: '', subcategory: '', description: '' });
      setTimeout(() => {
        typeSelectRef.current?.focus();
      }, 0);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name || !setAccountCategories) return alert('Preencha os campos obrigatórios.');

    const newCat: AccountCategory = {
      id: crypto.randomUUID(),
      type: categoryFormData.type as any,
      name: categoryFormData.name
    };

    setAccountCategories(prev => [...prev, newCat]);
    setCategoryFormData({ type: categoryFormData.type, name: '' });
  };

  const handleCategoryDelete = (id: string) => {
    if (setAccountCategories) {
      setAccountCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const filteredPlan = useMemo(() => {
    return accountPlan.filter(plan => {
      const matchesType = filterType === 'Todos' || plan.type === filterType;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        plan.category.toLowerCase().includes(searchLower) ||
        plan.subcategory.toLowerCase().includes(searchLower) ||
        plan.description.toLowerCase().includes(searchLower);

      return matchesType && matchesSearch;
    }).sort((a, b) => a.type.localeCompare(b.type));
  }, [accountPlan, filterType, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <BookOpen size={20} className="mr-2 text-amber-500" /> Estrutura do Plano de Contas
        </h3>
        <div className="flex items-center space-x-3">
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold transition-all shadow-sm"
            >
              <Printer size={18} className="text-amber-500" />
              <span>Relatórios</span>
            </button>
          )}
          {setAccountCategories && (
            <button onClick={() => setIsCategoryModalOpen(true)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md">
              <Settings size={18} /> <span>Cadastrar Categorias</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md">
            <Plus size={18} /> <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por categoria, subcategoria ou descrição..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 text-sm appearance-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Receita">Receitas</option>
            <option value="Despesa">Despesas</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Categoria Principal</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Subcategoria</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPlan.length > 0 ? filteredPlan.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${plan.type === 'Receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {plan.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">{plan.category}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{plan.subcategory}</td>
                <td className="px-6 py-4 text-slate-400 text-xs italic">{plan.description || '---'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenEdit(plan)} className="p-2 text-slate-400 hover:text-amber-500"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(plan.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Nenhum item encontrado com os filtros aplicados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Remover do Plano?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão deste item do plano de contas? Isso pode afetar a categorização de lançamentos futuros.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Lançamento' : 'Novo Item do Plano'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Tipo *</label>
                <select
                  ref={typeSelectRef}
                  autoFocus
                  required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                  value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="Receita">RECEITA</option>
                  <option value="Despesa">DESPESA</option>
                  <option value="Outros">OUTROS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Categoria Principal *</label>
                <select
                  required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                  value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" disabled>Selecione uma categoria...</option>
                  {accountCategories.filter(c => c.type === formData.type).map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {accountCategories.filter(c => c.type === formData.type).length === 0 && (
                  <p className="text-xs text-rose-500 mt-1 mt-1 font-medium italic">Nenhuma categoria cadastrada para este tipo. Cadastre em "Cadastrar Categorias".</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Subcategoria *</label>
                <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} placeholder="Ex: Terraplanagem, Aluguel, Combustível..." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Descrição Detalhada</label>
                <textarea className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-lg">Salvar No Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Settings className="mr-2 text-slate-500" /> Cadastrar Categorias
              </h2>
              <button onClick={() => setIsCategoryModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 mb-6">
              <div className="flex space-x-3">
                <div className="w-1/3">
                  <label className="block text-sm font-semibold mb-1 text-slate-700">Tipo *</label>
                  <select
                    required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    value={categoryFormData.type} onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value as any })}
                  >
                    <option value="Receita">Receitas</option>
                    <option value="Despesa">Despesas</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="w-2/3 flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-1 text-slate-700">Categoria Principal *</label>
                    <input
                      required
                      className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value.toUpperCase() })}
                      placeholder="Ex: OPERACIONAL"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg shadow-lg hover:bg-slate-700 h-[42px] flex items-center justify-center">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </form>

            <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-bold text-slate-600">Tipo</th>
                    <th className="px-4 py-2 font-bold text-slate-600">Categoria</th>
                    <th className="px-4 py-2 font-bold text-slate-600 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountCategories.sort((a, b) => a.type.localeCompare(b.type)).map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-200/50">
                      <td className="px-4 py-2 font-medium">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${cat.type === 'Receita' ? 'bg-emerald-100 text-emerald-700' : cat.type === 'Despesa' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                          {cat.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-800">{cat.name}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleCategoryDelete(cat.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {accountCategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Nenhuma categoria cadastrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPlanManager;
