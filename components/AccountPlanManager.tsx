
import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, X, Edit, AlertTriangle } from 'lucide-react';
import { AccountPlan } from '../types';

interface AccountPlanManagerProps {
  accountPlan: AccountPlan[];
  setAccountPlan: React.Dispatch<React.SetStateAction<AccountPlan[]>>;
}

const AccountPlanManager: React.FC<AccountPlanManagerProps> = ({ accountPlan, setAccountPlan }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<AccountPlan>>({
    type: 'Receita',
    category: '',
    subcategory: '',
    description: ''
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
    } else {
      const newPlan: AccountPlan = {
        id: crypto.randomUUID(),
        type: formData.type as any,
        category: formData.category!,
        subcategory: formData.subcategory!,
        description: formData.description || ''
      };
      setAccountPlan(prev => [...prev, newPlan]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <BookOpen size={20} className="mr-2 text-amber-500" /> Estrutura do Plano de Contas
        </h3>
        <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md">
          <Plus size={18} /> <span>Novo Lançamento</span>
        </button>
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
            {accountPlan.length > 0 ? accountPlan.sort((a, b) => a.type.localeCompare(b.type)).map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                    plan.type === 'Receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">Defina aqui os detalhes de onde vêm suas receitas e para onde vão suas despesas.</td></tr>
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
                  autoFocus
                  required className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-500" 
                  value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="Receita">RECEITA</option>
                  <option value="Despesa">DESPESA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Categoria Principal *</label>
                <input required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Ex: Operacional, Administrativo, Pessoal..." />
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
    </div>
  );
};

export default AccountPlanManager;
