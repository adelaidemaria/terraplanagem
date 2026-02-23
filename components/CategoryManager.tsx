
import React, { useState } from 'react';
import { Plus, Trash2, Tags, X, Edit, AlertTriangle } from 'lucide-react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, setCategories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name } : c));
    } else {
      setCategories(prev => [...prev, { id: crypto.randomUUID(), name }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <Tags size={20} className="mr-2 text-amber-500" /> Categorias de Receitas
        </h3>
        <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-semibold">
          <Plus size={18} /> <span>Nova Categoria</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Nome</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map(cat => (
              <tr key={cat.id}>
                <td className="px-6 py-4 font-medium">{cat.name}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenEdit(cat)} className="p-2 text-slate-400 hover:text-amber-500"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(cat.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={18} /></button>
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
            <h3 className="text-lg font-bold mb-2 flex items-center"><AlertTriangle className="mr-2 text-rose-500" /> Excluir Categoria?</h3>
            <p className="text-sm text-slate-600 mb-6">Tem certeza que deseja remover esta categoria de receitas?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-1">Nome *</label>
                <input required className="w-full px-4 py-2 border rounded-lg" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
