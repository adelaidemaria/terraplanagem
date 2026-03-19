import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Edit, 
  X, 
  Printer, 
  Calendar,
  Eye,
  AlertTriangle,
  Upload,
  FileCheck
} from 'lucide-react';
import { Customer, CTR } from '../types';
import { supabase } from '../lib/supabase';

interface CTRManagerProps {
  customers: Customer[];
  ctrs: CTR[];
  setCtrs: React.Dispatch<React.SetStateAction<CTR[]>>;
  onNavigateToReports: () => void;
}

const CTRManager: React.FC<CTRManagerProps> = ({ customers, ctrs, setCtrs, onNavigateToReports }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CTR>>({
    ctrNumber: '',
    emittedAt: new Date().toLocaleDateString('en-CA'),
    clientId: '',
    clientName: '',
    observations: '',
    attachmentUrl: ''
  });

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    const active = customers.filter(c => c.isActive !== false || c.id === formData.clientId);
    const sorted = [...active].sort((a, b) => a.name.localeCompare(b.name));
    if (!customerSearchTerm) return sorted;
    return sorted.filter(c => 
      c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
      (c.document && c.document.includes(customerSearchTerm))
    );
  }, [customers, customerSearchTerm, formData.clientId]);

  const filteredCtrs = useMemo(() => {
    return ctrs
      .filter(c => 
        c.ctrNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.emittedAt).getTime() - new Date(a.emittedAt).getTime());
  }, [ctrs, searchTerm]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setModalMode('add');
    setFormData({
      ctrNumber: '',
      emittedAt: new Date().toLocaleDateString('en-CA'),
      clientId: '',
      clientName: '',
      observations: '',
      attachmentUrl: ''
    });
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ctr: CTR, mode: 'edit' | 'view') => {
    setEditingId(ctr.id);
    setModalMode(mode);
    setFormData({ ...ctr });
    setUploadError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `ctr/${fileName}`;

      // We use 'receipts' bucket as a general storage if 'ctr' doesn't exist
      // Usually the user might need to create the bucket, but we'll try 'receipts' first 
      // as it's already used in the app.
      const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, attachmentUrl: publicUrl }));
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setUploadError(error.message || 'Erro ao enviar o arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') {
      setIsModalOpen(false);
      return;
    }

    if (!formData.ctrNumber || !formData.clientId || !formData.emittedAt) {
      return alert('Preencha os campos obrigatórios (Número, Cliente e Data).');
    }

    const client = customers.find(c => c.id === formData.clientId);
    
    const ctrData: CTR = {
      id: editingId || crypto.randomUUID(),
      ctrNumber: formData.ctrNumber!,
      emittedAt: formData.emittedAt!,
      clientId: formData.clientId!,
      clientName: client?.name || '---',
      attachmentUrl: formData.attachmentUrl,
      observations: formData.observations || '',
      createdAt: Date.now()
    };

    if (editingId) {
      setCtrs(prev => prev.map(c => c.id === editingId ? ctrData : c));
    } else {
      setCtrs(prev => [ctrData, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setCtrs(prev => prev.filter(c => c.id !== id));
    setDeleteConfirmId(null);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por CTR ou Cliente..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500/20" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <button
            onClick={onNavigateToReports}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center justify-center space-x-2 font-bold hover:bg-slate-700 transition-colors shadow-md w-full sm:w-auto"
          >
            <Printer size={18} /> <span>Relatórios CTR</span>
          </button>
          <button 
            onClick={handleOpenAdd} 
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Plus size={18} /> <span>Cadastrar CTR</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">CTR Nº / Emissão</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Anexo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">Observações</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCtrs.map((ctr) => (
              <tr key={ctr.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">CTR {ctr.ctrNumber}</span>
                    <span className="text-xs text-slate-500">Emitido em: {formatDateDisplay(ctr.emittedAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">{ctr.clientName}</td>
                <td className="px-6 py-4">
                  {ctr.attachmentUrl ? (
                    <a 
                      href={ctr.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      <FileText size={14} className="mr-1" /> VER CTR
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sem anexo</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-600 truncate max-w-[200px] block">
                    {ctr.observations || '---'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    <button onClick={() => handleOpenEdit(ctr, 'view')} className="p-2 text-slate-400 hover:text-slate-600" title="Ver Detalhes"><Eye size={18} /></button>
                    <button onClick={() => handleOpenEdit(ctr, 'edit')} className="p-2 text-slate-400 hover:text-amber-500" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(ctr.id)} className="p-2 text-slate-400 hover:text-rose-500" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCtrs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  Nenhum CTR encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Atenção!</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">Você confirma a exclusão definitiva deste CTR? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <FileCheck className="mr-2 text-amber-500" />
                {modalMode === 'view' ? 'Visualizar CTR' : editingId ? 'Editar CTR' : 'Cadastrar Novo CTR'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">CTR Nº *</label>
                  <input 
                    required 
                    type="text" 
                    readOnly={modalMode === 'view'}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50" 
                    value={formData.ctrNumber} 
                    onChange={(e) => setFormData({ ...formData, ctrNumber: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Emitido em *</label>
                  <input 
                    required 
                    type="date" 
                    readOnly={modalMode === 'view'}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50" 
                    value={formData.emittedAt} 
                    onChange={(e) => setFormData({ ...formData, emittedAt: e.target.value })} 
                  />
                </div>
              </div>

              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cliente *</label>
                <div 
                  className={`w-full px-4 py-2 border rounded-lg bg-white flex justify-between items-center ${modalMode === 'view' ? 'cursor-default bg-slate-50' : 'cursor-pointer'}`}
                  onClick={() => modalMode !== 'view' && setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                >
                  <span className={formData.clientId ? 'text-slate-800 font-bold' : 'text-slate-400'}>
                    {formData.clientId ? customers.find(c => c.id === formData.clientId)?.name : 'Selecione o Cliente...'}
                  </span>
                </div>
                {isCustomerDropdownOpen && modalMode !== 'view' && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-64 flex flex-col">
                    <div className="p-2 border-b">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Pesquisar cliente..." 
                        className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-amber-500 text-sm" 
                        value={customerSearchTerm} 
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                        <div 
                          key={c.id} 
                          className={`px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm ${formData.clientId === c.id ? 'bg-amber-100 font-bold' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, clientId: c.id, clientName: c.name });
                            setIsCustomerDropdownOpen(false);
                          }}
                        >
                          {c.name}
                        </div>
                      )) : (
                        <div className="px-4 py-3 text-sm text-slate-500 italic text-center">Nenhum cliente encontrado.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Anexo CTR (Upload)</label>
                <div className="flex items-center gap-4">
                  {modalMode !== 'view' && (
                    <div className="flex-1 relative">
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        id="ctr-file-upload" 
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <label 
                        htmlFor="ctr-file-upload" 
                        className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">
                          {isUploading ? 'Enviando...' : formData.attachmentUrl ? 'Substituir Arquivo' : 'Selecionar Arquivo'}
                        </span>
                      </label>
                    </div>
                  )}
                  {formData.attachmentUrl && (
                    <a 
                      href={formData.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm border border-blue-100 flex items-center gap-2"
                    >
                      <Eye size={16} /> Ver Anexo
                    </a>
                  )}
                </div>
                {uploadError && <p className="text-xs text-rose-500 mt-1 font-bold">{uploadError}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Observações</label>
                <textarea 
                  readOnly={modalMode === 'view'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none h-32 resize-none" 
                  value={formData.observations} 
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })} 
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t font-bold">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-2 text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button 
                    disabled={isUploading}
                    type="submit" 
                    className="px-8 py-2 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? 'Aguarde...' : 'SALVAR NO BANCO DE DADOS'}
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

export default CTRManager;
