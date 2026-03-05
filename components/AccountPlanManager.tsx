
import React, { useState, useRef, useMemo } from 'react';
import { Plus, Trash2, BookOpen, X, Edit, AlertTriangle, Printer, Settings, Search, Filter } from 'lucide-react';
import { AccountPlan, AccountCategory, AccountSubcategory, Sale, Expense } from '../types';

interface AccountPlanManagerProps {
  accountPlan: AccountPlan[];
  setAccountPlan: React.Dispatch<React.SetStateAction<AccountPlan[]>>;
  accountCategories?: AccountCategory[];
  setAccountCategories?: React.Dispatch<React.SetStateAction<AccountCategory[]>>;
  accountSubcategories?: AccountSubcategory[];
  setAccountSubcategories?: React.Dispatch<React.SetStateAction<AccountSubcategory[]>>;
  sales?: Sale[];
  expenses?: Expense[];
  onNavigateToReports?: () => void;
}

const AccountPlanManager: React.FC<AccountPlanManagerProps> = ({
  accountPlan,
  setAccountPlan,
  accountCategories = [],
  setAccountCategories,
  accountSubcategories = [],
  setAccountSubcategories,
  sales = [],
  expenses = [],
  onNavigateToReports
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmCategoryId, setDeleteConfirmCategoryId] = useState<string | null>(null);
  const [deleteConfirmSubcategoryId, setDeleteConfirmSubcategoryId] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);
  const [invalidPatternAlert, setInvalidPatternAlert] = useState<{ provided: string, expectedPrefix: string } | null>(null);
  const typeSelectRef = useRef<HTMLSelectElement>(null);
  const lastAddedRef = useRef({ type: 'Despesa', category: '', subcategory: '' });


  // Filter States
  const [filterType, setFilterType] = useState<'Todos' | 'Receita' | 'Despesa'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<AccountPlan>>({
    type: 'Despesa',
    category: '',
    subcategory: '',
    description: '',
    accountNumber: ''
  });

  const [categoryFormData, setCategoryFormData] = useState<Partial<AccountCategory>>({
    type: 'Receita',
    name: '',
    accountNumber: ''
  });

  const [subcategoryFormData, setSubcategoryFormData] = useState<Partial<AccountSubcategory>>({
    categoryId: '',
    name: '',
    accountNumber: ''
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ ...lastAddedRef.current, description: '', accountNumber: '' });
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

    if (formData.accountNumber) {
      const selectedCat = accountCategories.find(c => c.name === formData.category && c.type === formData.type);
      const selectedSub = selectedCat ? accountSubcategories.find(s => s.name === formData.subcategory && s.categoryId === selectedCat.id) : null;

      if (selectedSub && selectedSub.accountNumber) {
        const expectedPrefix = selectedSub.accountNumber + '.';
        if (!formData.accountNumber.startsWith(expectedPrefix) || formData.accountNumber.length !== 10) {
          setInvalidPatternAlert({ provided: formData.accountNumber, expectedPrefix: selectedSub.accountNumber });
          return;
        }
      }

      const exists = accountPlan.some(p => p.accountNumber === formData.accountNumber && p.id !== editingId);
      if (exists) {
        setDuplicateAlert(formData.accountNumber);
        return;
      }
    }

    if (editingId) {
      setAccountPlan(prev => prev.map(p => p.id === editingId ? { ...p, ...formData } as AccountPlan : p));
      setIsModalOpen(false);
    } else {
      const newPlan: AccountPlan = {
        id: crypto.randomUUID(),
        type: formData.type as any,
        category: formData.category!,
        subcategory: formData.subcategory!,
        description: formData.description || '',
        accountNumber: formData.accountNumber || ''
      };
      setAccountPlan(prev => [...prev, newPlan]);
      lastAddedRef.current = { type: formData.type as any, category: formData.category!, subcategory: formData.subcategory! };
      setFormData({ ...lastAddedRef.current, description: '', accountNumber: '' });
      setTimeout(() => {
        if (document.getElementById('conta-textarea')) {
          document.getElementById('conta-textarea')?.focus();
        } else {
          typeSelectRef.current?.focus();
        }
      }, 0);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name || !setAccountCategories) return alert('Preencha os campos obrigatórios.');

    if (editingCategoryId) {
      const oldCat = accountCategories.find(c => c.id === editingCategoryId);
      if (oldCat && oldCat.name !== categoryFormData.name) {
        setAccountPlan(prev => prev.map(p =>
          (p.type === oldCat.type && p.category === oldCat.name)
            ? { ...p, category: categoryFormData.name! }
            : p
        ));
      }

      setAccountCategories(prev => prev.map(cat =>
        cat.id === editingCategoryId ? { ...cat, type: categoryFormData.type as any, name: categoryFormData.name!, accountNumber: categoryFormData.accountNumber || '' } : cat
      ));
      setEditingCategoryId(null);
    } else {
      const newCat: AccountCategory = {
        id: crypto.randomUUID(),
        type: categoryFormData.type as any,
        name: categoryFormData.name,
        accountNumber: categoryFormData.accountNumber || ''
      };
      setAccountCategories(prev => [...prev, newCat]);
    }
    setCategoryFormData({ type: categoryFormData.type, name: '', accountNumber: '' });
  };

  const handleCategoryEdit = (cat: AccountCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryFormData({ type: cat.type, name: cat.name, accountNumber: cat.accountNumber || '' });
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCategoryFormData({ type: 'Receita', name: '', accountNumber: '' });
  };

  const handleCategoryDelete = (id: string) => {
    setDeleteConfirmCategoryId(id);
  };

  const confirmCategoryDelete = (id: string) => {
    if (setAccountCategories) {
      setAccountCategories(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmCategoryId(null);
    }
  };

  const handleSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryFormData.name || !subcategoryFormData.categoryId || !setAccountSubcategories) return alert('Preencha os campos obrigatórios.');

    if (editingSubcategoryId) {
      const oldSub = accountSubcategories.find(s => s.id === editingSubcategoryId);
      if (oldSub) {
        const oldCat = accountCategories.find(c => c.id === oldSub.categoryId);
        const newCat = accountCategories.find(c => c.id === subcategoryFormData.categoryId);

        if (oldSub.name !== subcategoryFormData.name || oldSub.categoryId !== subcategoryFormData.categoryId) {
          setAccountPlan(prev => prev.map(p =>
            (p.subcategory === oldSub.name && (!oldCat || p.category === oldCat.name))
              ? {
                ...p,
                subcategory: subcategoryFormData.name!,
                category: newCat ? newCat.name : p.category,
                type: newCat ? newCat.type : p.type
              }
              : p
          ));
        }
      }

      setAccountSubcategories(prev => prev.map(sub =>
        sub.id === editingSubcategoryId ? { ...sub, categoryId: subcategoryFormData.categoryId!, name: subcategoryFormData.name!, accountNumber: subcategoryFormData.accountNumber || '' } : sub
      ));
      setEditingSubcategoryId(null);
    } else {
      const newSub: AccountSubcategory = {
        id: crypto.randomUUID(),
        categoryId: subcategoryFormData.categoryId!,
        name: subcategoryFormData.name!,
        accountNumber: subcategoryFormData.accountNumber || ''
      };
      setAccountSubcategories(prev => [...prev, newSub]);
    }
    setSubcategoryFormData({ ...subcategoryFormData, name: '', accountNumber: '' });
  };

  const handleSubcategoryEdit = (sub: AccountSubcategory) => {
    setEditingSubcategoryId(sub.id);
    setSubcategoryFormData({ categoryId: sub.categoryId, name: sub.name, accountNumber: sub.accountNumber || '' });
  };

  const handleSubcategoryDelete = (id: string) => {
    setDeleteConfirmSubcategoryId(id);
  };

  const confirmSubcategoryDelete = (id: string) => {
    if (setAccountSubcategories) {
      setAccountSubcategories(prev => prev.filter(s => s.id !== id));
      setDeleteConfirmSubcategoryId(null);
    }
  };

  const handleCancelSubcategoryEdit = () => {
    setEditingSubcategoryId(null);
    setSubcategoryFormData({ categoryId: subcategoryFormData.categoryId, name: '', accountNumber: '' });
  };

  const lastAccountNumber = useMemo(() => {
    let relevantPlans = accountPlan;
    if (formData.type) relevantPlans = relevantPlans.filter(p => p.type === formData.type);
    if (formData.category) relevantPlans = relevantPlans.filter(p => p.category === formData.category);
    if (formData.subcategory) relevantPlans = relevantPlans.filter(p => p.subcategory === formData.subcategory);
    const plansWithNumbers = relevantPlans.filter(p => p.accountNumber);
    if (plansWithNumbers.length === 0) return null;
    const sorted = [...plansWithNumbers].sort((a, b) => a.accountNumber!.localeCompare(b.accountNumber!, undefined, { numeric: true }));
    return sorted[sorted.length - 1].accountNumber;
  }, [accountPlan, formData.type, formData.category, formData.subcategory]);

  const filteredPlan = useMemo(() => {
    return accountPlan.filter(plan => {
      const matchesType = filterType === 'Todos' || plan.type === filterType;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        plan.category.toLowerCase().includes(searchLower) ||
        plan.subcategory.toLowerCase().includes(searchLower) ||
        plan.description.toLowerCase().includes(searchLower);

      return matchesType && matchesSearch;
    }).sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || '', undefined, { numeric: true }));
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
              <Settings size={18} /> <span>Categorias</span>
            </button>
          )}
          {setAccountSubcategories && (
            <button onClick={() => setIsSubcategoryModalOpen(true)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md">
              <Plus size={18} /> <span>SubCategorias</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md">
            <Plus size={18} /> <span>Cadastrar Conta</span>
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
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Nº Conta</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">SubCategoria</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Conta</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPlan.length > 0 ? filteredPlan.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-200/70 transition-colors cursor-pointer">
                <td className="px-6 py-4 font-bold text-slate-800">{plan.accountNumber || '---'}</td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${plan.type === 'Receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {plan.type === 'Receita' ? 'RECEITAS' : plan.type === 'Despesa' ? 'DESPESAS' : plan.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-800">{plan.category}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{plan.subcategory}</td>
                <td className="px-6 py-4 font-medium text-slate-600">{plan.description || '---'}</td>
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
            {sales.some(s => s.accountPlanId === deleteConfirmId) || expenses.some(e => e.accountPlanId === deleteConfirmId) ? (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> EXCLUSÃO NÃO AUTORIZADA</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Existem lançamentos vinculados a esta conta. Não é possível excluir.</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-300">Voltar</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Remover do Plano?</h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão deste item do plano de contas?</p>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteConfirmCategoryId && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            {(() => {
              const cat = accountCategories.find(c => c.id === deleteConfirmCategoryId);
              const hasSubcategories = accountSubcategories.some(s => s.categoryId === deleteConfirmCategoryId);
              const hasAccounts = cat ? accountPlan.some(p => p.category === cat.name && p.type === cat.type) : false;
              if (hasSubcategories || hasAccounts) {
                return (
                  <>
                    <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> EXCLUSÃO NÃO AUTORIZADA</h3>
                    <p className="text-sm text-slate-600 mb-6 font-medium">Existem subcategorias ou contas vinculadas a esta categoria. Não é possível excluir.</p>
                    <div className="flex justify-end space-x-3">
                      <button onClick={() => setDeleteConfirmCategoryId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-300">Voltar</button>
                    </div>
                  </>
                );
              }
              return (
                <>
                  <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Remover Categoria?</h3>
                  <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão desta categoria?</p>
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => setDeleteConfirmCategoryId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                    <button onClick={() => confirmCategoryDelete(deleteConfirmCategoryId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {deleteConfirmSubcategoryId && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            {(() => {
              const sub = accountSubcategories.find(s => s.id === deleteConfirmSubcategoryId);
              const cat = sub ? accountCategories.find(c => c.id === sub.categoryId) : null;
              const hasAccounts = sub && cat ? accountPlan.some(p => p.subcategory === sub.name && p.category === cat.name && p.type === cat.type) : false;

              if (hasAccounts) {
                return (
                  <>
                    <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> EXCLUSÃO NÃO AUTORIZADA</h3>
                    <p className="text-sm text-slate-600 mb-6 font-medium">Existem contas vinculadas a esta subcategoria. Não é possível excluir.</p>
                    <div className="flex justify-end space-x-3">
                      <button onClick={() => setDeleteConfirmSubcategoryId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-300">Voltar</button>
                    </div>
                  </>
                );
              }
              return (
                <>
                  <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Remover Subcategoria?</h3>
                  <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão desta subcategoria?</p>
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => setDeleteConfirmSubcategoryId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                    <button onClick={() => confirmSubcategoryDelete(deleteConfirmSubcategoryId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Lançamento' : 'Cadastrar Conta no Plano de Contas'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Tipo *</label>
                <select
                  ref={typeSelectRef}
                  autoFocus
                  required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                  value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any, category: '' })}
                >
                  <option value="Receita">RECEITAS</option>
                  <option value="Despesa">DESPESAS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Categoria *</label>
                <select
                  required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                  value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                >
                  <option value="" disabled>Selecione uma categoria...</option>
                  {(() => {
                    const availableCats = accountCategories
                      .filter(c => c.type === formData.type)
                      .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || '', undefined, { numeric: true }));
                    const catsToRender = availableCats.map(c => c.name);
                    const isMissing = formData.category && !catsToRender.includes(formData.category);

                    return (
                      <>
                        {isMissing && <option value={formData.category}>{formData.category} (Antiga)</option>}
                        {availableCats.map(cat => (
                          <option key={cat.id} value={cat.name}>
                            {cat.accountNumber ? `${cat.accountNumber} - ${cat.name}` : cat.name}
                          </option>
                        ))}
                      </>
                    );
                  })()}
                </select>
                {accountCategories.filter(c => c.type === formData.type).length === 0 && (
                  <p className="text-xs text-rose-500 mt-1 font-medium italic">Nenhuma categoria cadastrada para este tipo.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">SubCategoria *</label>
                <select
                  required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                  value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                >
                  <option value="" disabled>Selecione uma subcategoria...</option>
                  {(() => {
                    const availableSubs = accountSubcategories
                      .filter(s => {
                        const cat = accountCategories.find(c => c.id === s.categoryId);
                        return cat && cat.name === formData.category && cat.type === formData.type;
                      })
                      .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || '', undefined, { numeric: true }));
                    const subsToRender = availableSubs.map(s => s.name);
                    const isMissing = formData.subcategory && !subsToRender.includes(formData.subcategory);

                    return (
                      <>
                        {isMissing && <option value={formData.subcategory}>{formData.subcategory} (Antiga)</option>}
                        {availableSubs.map(sub => (
                          <option key={sub.id} value={sub.name}>
                            {sub.accountNumber ? `${sub.accountNumber} - ${sub.name}` : sub.name}
                          </option>
                        ))}
                      </>
                    );
                  })()}
                </select>
                {formData.category && accountSubcategories.filter(s => {
                  const cat = accountCategories.find(c => c.id === s.categoryId);
                  return cat && cat.name === formData.category && cat.type === formData.type;
                }).length === 0 && (
                    <p className="text-xs text-rose-500 mt-1 font-medium italic">Nenhuma subcategoria cadastrada para esta categoria.</p>
                  )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">
                  Nº da Conta
                  {lastAccountNumber && (
                    <span className="normal-case text-slate-500 ml-2">
                      (Último Cadastro nº: <span className="text-rose-500 font-bold">{lastAccountNumber}</span>)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Opcional. Ex: 1.01.001"
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                  value={formData.accountNumber || ''}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Conta *</label>
                <textarea
                  id="conta-textarea"
                  required
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value.toUpperCase() })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-lg">Salvar No Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {duplicateAlert && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-amber-500 animate-in zoom-in duration-150">
            <h3 className="text-lg font-bold mb-2 flex items-center text-amber-600">
              <AlertTriangle className="mr-2" /> Número Já Existe
            </h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">
              O Nº da Conta <span className="font-bold text-slate-800">{duplicateAlert}</span> já está cadastrado no sistema. Por favor, informe uma numeração diferente para prosseguir.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setDuplicateAlert(null)}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {invalidPatternAlert && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-amber-500 animate-in zoom-in duration-150">
            <h3 className="text-lg font-bold mb-2 flex items-center text-amber-600">
              <AlertTriangle className="mr-2" /> Numeração Fora do Padrão
            </h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">
              O Nº da Conta <span className="font-bold text-slate-800">{invalidPatternAlert.provided}</span> está incompleto ou fora do formato.
              <br /><br />
              A numeração desta conta precisa começar com <span className="font-bold text-slate-800">{invalidPatternAlert.expectedPrefix}.</span> e ter um total de 10 caracteres (Ex: <span className="font-bold text-slate-800">{invalidPatternAlert.expectedPrefix}.04</span>).
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setInvalidPatternAlert(null)}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg"
              >
                Corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Settings className="mr-2 text-slate-500" /> Cadastrar Categorias
              </h2>
              <button onClick={() => setIsCategoryModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full sm:w-[160px]">
                  <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Tipo *</label>
                  <select
                    required
                    autoFocus
                    className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    value={categoryFormData.type} onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value as any })}
                  >
                    <option value="Receita">Receitas</option>
                    <option value="Despesa">Despesas</option>
                  </select>
                </div>
                <div className="w-full sm:w-[120px]">
                  <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Nº Conta</label>
                  <input
                    type="text"
                    placeholder="Ex: 1.01"
                    className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    value={categoryFormData.accountNumber || ''}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, accountNumber: e.target.value })}
                  />
                </div>
                <div className="w-full sm:flex-1">
                  <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Categoria *</label>
                  <input
                    required
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value.toUpperCase() })}
                    placeholder="Ex: OPERACIONAL"
                  />
                </div>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button type="submit" className={`px-6 py-2 text-white font-bold rounded-lg shadow-lg h-[42px] flex items-center justify-center transition-colors ${editingCategoryId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'} w-full sm:w-auto`}>
                    {editingCategoryId ? <Edit size={18} /> : <Plus size={18} />}
                  </button>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={handleCancelCategoryEdit}
                      className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 h-[42px] flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-bold text-slate-600">Tipo</th>
                    <th className="px-4 py-2 font-bold text-slate-600">Nº Conta</th>
                    <th className="px-4 py-2 font-bold text-slate-600">Categoria</th>
                    <th className="px-4 py-2 font-bold text-slate-600 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountCategories
                    .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || '', undefined, { numeric: true }))
                    .map(cat => (
                      <tr key={cat.id} className="hover:bg-slate-200/50">
                        <td className="px-4 py-2 font-medium">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${cat.type === 'Receita' ? 'bg-emerald-100 text-emerald-700' : cat.type === 'Despesa' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                            {cat.type === 'Receita' ? 'RECEITAS' : cat.type === 'Despesa' ? 'DESPESAS' : cat.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-800">{cat.accountNumber || '---'}</td>
                        <td className="px-4 py-2 font-bold text-slate-800">{cat.name}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end space-x-1">
                            <button onClick={() => handleCategoryEdit(cat)} className="p-1 text-slate-400 hover:text-amber-500 transition-colors">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleCategoryDelete(cat.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
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
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Plus className="mr-2 text-slate-500" /> Cadastrar SubCategorias
              </h2>
              <button onClick={() => setIsSubcategoryModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubcategorySubmit} className="space-y-4 mb-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Categoria Principal *</label>
                  <select
                    required
                    autoFocus
                    className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    value={subcategoryFormData.categoryId} onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, categoryId: e.target.value })}
                  >
                    <option value="" disabled>Selecione...</option>
                    {[...accountCategories]
                      .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || '', undefined, { numeric: true }))
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>[{cat.type === 'Receita' ? 'RECEITAS' : cat.type === 'Despesa' ? 'DESPESAS' : cat.type}] - {cat.accountNumber} - {cat.name}</option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-[160px]">
                    <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">Nº Conta</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                      value={subcategoryFormData.accountNumber || ''}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, accountNumber: e.target.value })}
                      placeholder="Ex: 1.01.1"
                    />
                  </div>
                  <div className="w-full sm:flex-1">
                    <label className="block text-sm font-semibold mb-1 text-slate-700 uppercase">SubCategoria *</label>
                    <input
                      required
                      className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                      value={subcategoryFormData.name}
                      onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, name: e.target.value.toUpperCase() })}
                      placeholder="Ex: COMBUSTÍVEL"
                    />
                  </div>
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <button type="submit" className={`px-6 py-2 text-white font-bold rounded-lg shadow-lg h-[42px] flex items-center justify-center transition-colors ${editingSubcategoryId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'} w-full sm:w-auto`}>
                      {editingSubcategoryId ? <Edit size={18} /> : <Plus size={18} />}
                    </button>
                    {editingSubcategoryId && (
                      <button type="button" onClick={handleCancelSubcategoryEdit} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 h-[42px] flex items-center justify-center">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-bold text-slate-600">Categoria</th>
                    <th className="px-4 py-2 font-bold text-slate-600">Nº Conta</th>
                    <th className="px-4 py-2 font-bold text-slate-600">SubCategoria</th>
                    <th className="px-4 py-2 font-bold text-slate-600 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...accountSubcategories]
                    .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || '', undefined, { numeric: true }))
                    .map(sub => {
                      const cat = accountCategories.find(c => c.id === sub.categoryId);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-200/50">
                          <td className="px-4 py-2 font-medium text-slate-600">
                            {cat ? (
                              <div className="flex flex-col">
                                <span className={cat.type === 'Receita' ? 'text-emerald-500 font-bold text-[10px]' : cat.type === 'Despesa' ? 'text-rose-500 font-bold text-[10px]' : 'text-slate-500 text-[10px]'}>
                                  [{cat.type === 'Receita' ? 'RECEITAS' : cat.type === 'Despesa' ? 'DESPESAS' : cat.type.toUpperCase()}]
                                </span>
                                <span className="text-slate-800 font-medium">{cat.name}</span>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-800">{sub.accountNumber || '---'}</td>
                          <td className="px-4 py-2 font-bold text-slate-800">{sub.name}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end space-x-1">
                              <button onClick={() => handleSubcategoryEdit(sub)} className="p-1 text-slate-400 hover:text-amber-500 transition-colors">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleSubcategoryDelete(sub.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {accountSubcategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Nenhuma subcategoria cadastrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setIsSubcategoryModalOpen(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPlanManager;
