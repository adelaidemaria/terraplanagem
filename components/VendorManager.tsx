
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, Truck, X, AlertTriangle, User, CreditCard, Tag
} from 'lucide-react';
import { Vendor, VendorCategory } from '../types';

interface VendorManagerProps {
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  vendorCategories: VendorCategory[];
  setVendorCategories: React.Dispatch<React.SetStateAction<VendorCategory[]>>;
}

const VendorManager: React.FC<VendorManagerProps> = ({ vendors, setVendors, vendorCategories, setVendorCategories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '', personType: 'PJ', categoryId: '', document: '', address: '', contactPerson: '', phone: '', email: ''
  });

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.document.includes(searchTerm) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

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
      // (DD) XXXXX-XXXX
      v = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (v.length > 2) {
      // (DD) XXXX-XXXX
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length > 0) {
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
    setFormData({ name: '', personType: 'PJ', categoryId: '', document: '', address: '', contactPerson: '', phone: '', email: '' });
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

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCatId) {
      setVendorCategories(prev => prev.map(c => c.id === editingCatId ? { ...c, name: catName } : c));
      setEditingCatId(null);
    } else {
      setVendorCategories(prev => [...prev, { id: crypto.randomUUID(), name: catName }]);
    }
    setCatName('');
  };

  const handleDeleteCategory = (id: string) => {
    const isUsed = vendors.some(v => v.categoryId === id);
    if (isUsed) return alert('Esta categoria está sendo usada por um fornecedor e não pode ser excluída.');
    setVendorCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.document || !formData.categoryId) return alert('Nome, Documento e Categoria são obrigatórios.');

    if (editingId) {
      setVendors(prev => prev.map(v => v.id === editingId ? { ...v, ...formData } as Vendor : v));
    } else {
      const newVendor: Vendor = {
        id: crypto.randomUUID(),
        name: formData.name!,
        personType: formData.personType || 'PJ',
        categoryId: formData.categoryId!,
        document: formData.document!,
        address: formData.address || '',
        contactPerson: formData.contactPerson || '',
        phone: formData.phone || '',
        email: formData.email || '',
        createdAt: Date.now()
      };
      setVendors(prev => [newVendor, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar fornecedor..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button onClick={() => setIsCatModalOpen(true)} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 font-bold transition-all border border-slate-200">
            <Tag size={18} /> <span>Categorias</span>
          </button>
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
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Responsável</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredVendors.length > 0 ? filteredVendors.map(vendor => (
              <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{vendor.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{vendor.document}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-slate-600">
                    {vendorCategories.find(c => c.id === vendor.categoryId)?.name || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${vendor.personType === 'PJ' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                    {vendor.personType || 'PJ'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{vendor.contactPerson || '---'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenEdit(vendor)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(vendor.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Nenhum fornecedor cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Categorias */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center"><Tag className="mr-2 text-amber-500" /> Categorias de Fornecedores</h2>
              <button onClick={() => setIsCatModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSaveCategory} className="flex gap-2 mb-6">
              <input 
                autoFocus
                className="flex-1 px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" 
                placeholder="Ex: Mecânico, Combustível..." 
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
              />
              <button type="submit" className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold">
                {editingCatId ? 'Salvar' : 'Adicionar'}
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {vendorCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  <span className="font-bold text-slate-700">{cat.name}</span>
                  <div className="flex space-x-1">
                    <button onClick={() => { setEditingCatId(cat.id); setCatName(cat.name); }} className="p-1.5 text-slate-300 hover:text-amber-500"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {vendorCategories.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhuma categoria cadastrada.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Fornecedor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Nome / Razão Social *</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                          type="button"
                          onClick={() => setFormData({...formData, personType: 'PF', document: ''})}
                          className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${formData.personType === 'PF' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
                      >
                          PESSOA FÍSICA
                      </button>
                      <button 
                          type="button"
                          onClick={() => setFormData({...formData, personType: 'PJ', document: ''})}
                          className={`px-4 py-1 rounded-md text-[10px] font-black transition-all ${formData.personType === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                          PESSOA JURÍDICA
                      </button>
                  </div>
                </div>
                <input 
                  autoFocus
                  required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium" 
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Categoria *</label>
                <select 
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium" 
                  value={formData.categoryId} 
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {vendorCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">
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
                <label className="block text-sm font-semibold mb-1 text-slate-700">Responsável Financeiro</label>
                <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Telefone</label>
                <input 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })} 
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">E-mail</label>
                <input type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-slate-700">Endereço Fiscal / Cobrança</label>
                <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-10 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-xl shadow-amber-200">Salvar Fornecedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Fornecedor?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Confirma a exclusão deste fornecedor? Despesas associadas não serão removidas automaticamente.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Excluir Agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManager;
