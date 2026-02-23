
import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, UserPlus, X, AlertTriangle, CreditCard, User
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', personType: 'PJ', document: '', address: '', contactPerson: '', phone: '', email: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

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
    setFormData({ name: '', personType: 'PJ', document: '', address: '', contactPerson: '', phone: '', email: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData(customer);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.document) return alert('Nome e Documento são obrigatórios.');

    if (editingId) {
      setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...formData } as Customer : c));
    } else {
      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        name: formData.name!,
        personType: formData.personType || 'PJ',
        document: formData.document!,
        address: formData.address || '',
        contactPerson: formData.contactPerson || '',
        phone: formData.phone || '',
        email: formData.email || '',
        createdAt: Date.now()
      };
      setCustomers(prev => [newCustomer, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Pesquisar cliente..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg">
          <UserPlus size={18} /> <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Cliente / Documento</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Responsável</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{customer.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{customer.document}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${customer.personType === 'PJ' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                    {customer.personType}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{customer.contactPerson || '---'}</td>
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
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Cliente?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Tem certeza que deseja remover este cliente? O histórico de vendas será preservado.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Cliente' : 'Ficha de Cliente'}</h2>
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
                <label className="block text-sm font-semibold mb-1 text-slate-700">Nome do Responsável</label>
                <input className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">Telefone Contato</label>
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
                <label className="block text-sm font-semibold mb-1 text-slate-700">Endereço Completo</label>
                <textarea className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-10 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-xl shadow-amber-200">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
