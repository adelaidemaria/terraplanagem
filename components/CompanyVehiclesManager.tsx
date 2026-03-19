import React, { useState } from 'react';
import {
  Plus, Edit, Trash2, Car, X, Tag, FileText, Upload, Loader2, ExternalLink
} from 'lucide-react';
import { CompanyVehicle } from '../types';
import { supabase } from '../lib/supabase';

interface CompanyVehiclesManagerProps {
  vehicles: CompanyVehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<CompanyVehicle[]>>;
}

const CompanyVehiclesManager: React.FC<CompanyVehiclesManagerProps> = ({
  vehicles, setVehicles
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [form, setForm] = useState<Partial<CompanyVehicle>>({
    licensePlate: '', type: '', model: '', year: '', description: '', documentUrl: '', status: 'Ativo'
  });

  const handleOpenModal = (v?: CompanyVehicle) => {
    if (v) {
      setEditingId(v.id);
      setForm(v);
    } else {
      setEditingId(null);
      setForm({
        licensePlate: '', type: '', model: '', year: '', description: '', documentUrl: '', status: 'Ativo'
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(filePath);

      setForm({ ...form, documentUrl: publicUrl });
    } catch (error: any) {
      alert('Erro ao fazer upload: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Criamos uma cópia limpa para evitar referências circulares ou problemas de estado
    const vehicleData = { ...form };

    if (editingId) {
      setVehicles(prev => prev.map(v => v.id === editingId ? { ...v, ...vehicleData } as CompanyVehicle : v));
    } else {
      // Deixamos o ID por conta do banco/sync para evitar duplicidade de UUIDs gerados localmente e remotamente
      const newVehicle = { 
        ...vehicleData, 
        id: crypto.randomUUID(), 
        createdAt: Date.now() 
      } as CompanyVehicle;
      setVehicles(prev => [newVehicle, ...prev]);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      setVehicles(prev => prev.filter(v => v.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
          Veículos da Empresa
        </h3>
        <button onClick={() => handleOpenModal()} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md transition-all">
          <Plus size={18} /> <span>Novo Veículo</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Placa / Tipo</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Modelo / Ano</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Documento / NF</th>
              <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.length > 0 ? vehicles.map(v => (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 uppercase tracking-widest">{v.licensePlate || 'S/ PLACA'}</span>
                    <span className="text-xs font-black text-slate-400 uppercase">{v.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{v.model}</span>
                    <div className="flex items-center space-x-2">
                       <span className="text-xs text-slate-500 font-bold">Ano: {v.year || 'N/A'}</span>
                       <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${v.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                         {v.status || 'Ativo'}
                       </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {v.documentUrl ? (
                    <a href={v.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100 hover:bg-amber-500 hover:text-white transition-all">
                      <FileText size={12} className="mr-1.5" /> Abrir Documento
                    </a>
                  ) : (
                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Nenhum anexo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-1">
                    <button onClick={() => handleOpenModal(v)} className="p-2 text-slate-400 hover:text-amber-500" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(v.id)} className="p-2 text-slate-400 hover:text-rose-500" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">Nenhum veículo cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-150 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Editar Veículo' : 'Cadastrar Veículo'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 flex items-center"><Tag size={14} className="mr-1" /> Placa</label>
                  <input required placeholder="Ex: ABC-1234" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none uppercase font-bold" value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 flex items-center"><Car size={14} className="mr-1" /> Tipo Veículo</label>
                  <input required placeholder="Ex: Caminhão, Picape, Passeio..." className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Modelo Veículo</label>
                  <input required placeholder="Ex: Hilux, F-4000..." className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none font-bold" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Ano</label>
                  <input placeholder="Ex: 2020/2021" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Status do Veículo</label>
                <select 
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 outline-none font-bold ${form.status === 'Ativo' ? 'text-emerald-600 focus:ring-emerald-500/20' : 'text-slate-500 focus:ring-slate-500/20'}`}
                  value={form.status} 
                  onChange={e => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="Ativo" className="text-emerald-600 font-bold">🟢 ATIVO</option>
                  <option value="Vendido" className="text-slate-500 font-bold">⚪ VENDIDO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Descrição Complementar</label>
                <textarea rows={2} placeholder="Cor, chassi, observações adicionais..." className="w-full px-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                <label className="block text-xs font-black text-slate-800 uppercase mb-3 flex items-center">
                  <Upload size={14} className="mr-2 text-amber-500" /> Anexar Documento ou Nota Fiscal
                </label>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      id="doc-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label 
                      htmlFor="doc-upload" 
                      className={`flex items-center justify-center px-4 py-3 border-2 border-slate-300 rounded-xl cursor-pointer hover:bg-white hover:border-amber-500 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isUploading ? (
                        <span className="flex items-center text-xs font-black text-slate-500 uppercase">
                          <Loader2 size={16} className="animate-spin mr-2" /> Enviando Arquivo...
                        </span>
                      ) : (
                        <span className="flex items-center text-xs font-black text-slate-600 uppercase">
                          <Plus size={16} className="mr-2" /> Clique para selecionar arquivo
                        </span>
                      )}
                    </label>
                  </div>
                  
                  {form.documentUrl && (
                    <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-emerald-600 uppercase leading-none">Arquivo Pronto</span>
                        <a href={form.documentUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center">
                          Ver Anexo <ExternalLink size={10} className="ml-1" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 mt-2 pl-1 italic">* Suporta PDF, JPG e PNG. O arquivo será saved com segurança no sistema.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                <button disabled={isUploading} type="submit" className="px-10 py-3 bg-amber-500 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-amber-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                  {isUploading ? 'Aguarde...' : editingId ? 'Salvar Alterações' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600">Excluir Veículo?</h3>
            <p className="text-sm text-slate-600 mb-6">Esta ação removerá permanentemente este veículo e não poderá ser desfeita.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={handleDelete} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyVehiclesManager;
