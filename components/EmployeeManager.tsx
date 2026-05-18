import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, UserPlus, X, FileText, Upload, 
  Loader2, Download, Paperclip, MessageSquare, Calendar, User, Briefcase, DollarSign, Printer, AlertTriangle
} from 'lucide-react';
import { Funcionario, FuncionarioDocumento, CompanyVehicle } from '../types';
import { supabase } from '../lib/supabase';

interface EmployeeManagerProps {
  employees: Funcionario[];
  setEmployees: React.Dispatch<React.SetStateAction<Funcionario[]>>;
  vehicles?: CompanyVehicle[];
  onGoToReports?: (type?: string) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, setEmployees, vehicles = [], onGoToReports }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState<Funcionario | null>(null);
  
  const [formData, setFormData] = useState<Partial<Funcionario>>({
    nomeCompleto: '',
    dataRegistro: new Date().toLocaleDateString('en-CA'),
    funcao: '',
    salarioBruto: 0,
    diferencaPf: 0,
    observacao: '',
    isOperator: false,
    linkedVehicles: [],
    documentos: []
  });

  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.funcao.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const maskCurrency = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return "0,00";
    let v = typeof val === 'number' ? val.toFixed(2).replace('.', '') : String(val).replace(/\D/g, "");
    if (!v) return "0,00";
    let n = (Number(v) / 100).toFixed(2);
    let parts = n.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
  };

  const parseCurrency = (val: string) => {
    return Number(val.replace(/\D/g, "")) / 100;
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      nomeCompleto: '',
      dataRegistro: new Date().toLocaleDateString('en-CA'),
      funcao: '',
      salarioBruto: 0,
      diferencaPf: 0,
      observacao: '',
      isOperator: false,
      linkedVehicles: [],
      documentos: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (employee: Funcionario) => {
    setEditingId(employee.id);
    setFormData({ ...employee, documentos: [] });
    setIsModalOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('funcionario_documentos')
        .select('*')
        .eq('funcionario_id', employee.id);
        
      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          documentos: data.map((d: any) => ({
             id: d.id,
             funcionarioId: d.funcionario_id,
             nome: d.nome,
             arquivoUrl: d.arquivo_url,
             createdAt: new Date(d.created_at || Date.now()).getTime()
          }))
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar anexos:', err);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !newDocName.trim()) {
      alert('Selecione um arquivo e dê um nome ao documento.');
      return;
    }

    try {
      setUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `employees/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-funcionarios')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos-funcionarios')
        .getPublicUrl(filePath);

      const newDoc: FuncionarioDocumento = {
        id: crypto.randomUUID(),
        funcionarioId: editingId || 'temp',
        nome: newDocName,
        arquivoUrl: publicUrl,
        createdAt: Date.now()
      };

      setFormData(prev => ({
        ...prev,
        documentos: [...(prev.documentos || []), newDoc]
      }));

      setNewDocName('');
      setSelectedFile(null);
      
      // Reset input file
      const fileInput = document.getElementById('employee-doc-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDoc = (docId: string) => {
    setFormData(prev => ({
      ...prev,
      documentos: (prev.documentos || []).filter(d => d.id !== docId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeCompleto || !formData.funcao) {
      alert('Nome completo e função são obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      const employeeData = {
        nome_completo: String(formData.nomeCompleto || '').toUpperCase(),
        data_registro: formData.dataRegistro,
        funcao: String(formData.funcao || ''),
        salario_bruto: formData.salarioBruto || 0,
        diferenca_pf: formData.diferencaPf || 0,
        observacao: formData.observacao || '',
        is_operator: formData.isOperator || false,
        linked_vehicles: formData.linkedVehicles || []
      };

      let funcionarioId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('funcionarios')
          .update(employeeData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('funcionarios')
          .insert([employeeData])
          .select()
          .single();
        if (error) throw error;
        funcionarioId = data.id;
      }

      // Save documents
      if (funcionarioId) {
        // Delete old docs from table and insert new list
        // Simplified approach: just replace
        await supabase.from('funcionario_documentos').delete().eq('funcionario_id', funcionarioId);
        
        if (formData.documentos && formData.documentos.length > 0) {
          const docsToInsert = formData.documentos.map(d => ({
            funcionario_id: funcionarioId,
            nome: d.nome,
            arquivo_url: d.arquivoUrl
          }));
          await supabase.from('funcionario_documentos').insert(docsToInsert);
        }
      }
      
      // Refresh local state manually to avoid wait/reload
      const { data: updatedFunc } = await supabase.from('funcionarios').select('*').eq('id', funcionarioId).single();
      if (updatedFunc) {
        const camelFunc = {
          id: updatedFunc.id,
          nomeCompleto: updatedFunc.nome_completo,
          dataRegistro: updatedFunc.data_registro,
          funcao: updatedFunc.funcao,
          salarioBruto: updatedFunc.salario_bruto,
          diferencaPf: updatedFunc.diferenca_pf,
          observacao: updatedFunc.observacao,
          isOperator: updatedFunc.is_operator,
          linkedVehicles: updatedFunc.linked_vehicles,
          createdAt: updatedFunc.created_at
        };

        setEmployees(prev => {
          if (editingId) return prev.map(p => p.id === editingId ? camelFunc as Funcionario : p);
          return [camelFunc as Funcionario, ...prev];
        });
      }

      setIsModalOpen(false);
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (employee: Funcionario) => {
    setDeleteConfirmEmployee(employee);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmEmployee) return;
    const employee = deleteConfirmEmployee;
    
    try {
      setLoading(true);
      const { error } = await supabase.from('funcionarios').delete().eq('id', employee.id);
      if (error) throw error;
      
      // Update local state
      setEmployees(prev => prev.filter(e => e.id !== employee.id));
      setDeleteConfirmEmployee(null);
      
    } catch (error: any) {
      alert('ERRO AO EXCLUIR: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar funcionário..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => onGoToReports?.('employees')}
            className="bg-slate-900 border border-slate-700 text-amber-500 px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg hover:bg-slate-800 transition-all flex-1 sm:flex-none justify-center"
          >
            <Printer size={18} /> <span>Relatório</span>
          </button>
          <button 
            onClick={handleOpenAdd} 
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-lg flex-1 sm:flex-none justify-center"
          >
            <UserPlus size={18} /> <span>Novo Funcionário</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Funcionário</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600">Função</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">S. Bruto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Diferença P/F</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Nenhum funcionário encontrado.</td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{emp.nomeCompleto || '---'}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Registrado em: {emp.dataRegistro ? new Date(emp.dataRegistro).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{emp.funcao || '---'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">{maskCurrency(emp.salarioBruto)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{maskCurrency(emp.diferencaPf)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleOpenEdit(emp)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(emp)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-150">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Funcionário' : 'Novo Cadastro de Funcionário'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Nome Completo */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nome Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        ref={nameInputRef}
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase transition-all"
                        value={formData.nomeCompleto}
                        onChange={e => setFormData({ ...formData, nomeCompleto: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>

                  {/* Data Registro */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Data do Registro *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="date"
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all"
                        value={formData.dataRegistro}
                        onChange={e => setFormData({ ...formData, dataRegistro: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Função */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Função / Cargo *</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all"
                        value={formData.funcao}
                        onChange={e => setFormData({ ...formData, funcao: e.target.value })}
                        placeholder="Ex: Operador de Máquina"
                      />
                    </div>
                  </div>

                  {/* Salário Bruto */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Salário Bruto *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-700 transition-all text-right"
                        value={maskCurrency(formData.salarioBruto || 0)}
                        onChange={e => setFormData({ ...formData, salarioBruto: parseCurrency(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Diferença P/F */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Diferença P/F</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                      <input
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 transition-all text-right"
                        value={maskCurrency(formData.diferencaPf || 0)}
                        onChange={e => setFormData({ ...formData, diferencaPf: parseCurrency(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <MessageSquare size={14} /> Observações Adicionais
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium transition-all"
                    value={formData.observacao}
                    onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Informações relevantes sobre o funcionário..."
                  />
                </div>

                {/* Configurações de Operador */}
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 space-y-4 mt-6">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isOperator"
                      checked={formData.isOperator || false}
                      onChange={e => setFormData({ ...formData, isOperator: e.target.checked })}
                      className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                    />
                    <label htmlFor="isOperator" className="text-sm font-black text-amber-900 cursor-pointer uppercase tracking-widest flex items-center gap-2">
                      Este funcionário é um Operador de Equipamento?
                    </label>
                  </div>

                  {formData.isOperator && (
                    <div className="pt-4 border-t border-amber-200/50 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-black text-amber-800 uppercase tracking-widest mb-3">Equipamentos Vinculados</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vehicles.map(vehicle => {
                          const isLinked = (formData.linkedVehicles || []).includes(vehicle.id);
                          return (
                            <label key={vehicle.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isLinked ? 'bg-white border-amber-500 shadow-sm' : 'bg-white/50 border-amber-100 hover:border-amber-300'}`}>
                              <input 
                                type="checkbox"
                                className="mt-1 accent-amber-600"
                                checked={isLinked}
                                onChange={(e) => {
                                  const list = formData.linkedVehicles || [];
                                  if (e.target.checked) {
                                    setFormData({ ...formData, linkedVehicles: [...list, vehicle.id] });
                                  } else {
                                    setFormData({ ...formData, linkedVehicles: list.filter(id => id !== vehicle.id) });
                                  }
                                }}
                              />
                              <div className="flex flex-col text-sm">
                                <span className={`font-bold ${isLinked ? 'text-slate-800' : 'text-slate-500'}`}>{vehicle.model}</span>
                                {vehicle.licensePlate && (
                                  <span className="text-xs text-slate-400">{vehicle.licensePlate}</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Documentos */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Paperclip size={18} className="text-amber-500" /> Documentos do Funcionário
                    </h3>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Nome do Documento (Ex: RG, CNH, Contrato)"
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      value={newDocName}
                      onChange={e => setNewDocName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <label className="flex-1 sm:flex-none">
                        <div className="bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-sm font-bold text-slate-600 transition-all">
                          <Plus size={16} /> 
                          {selectedFile ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
                        </div>
                        <input
                          id="employee-doc-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleFileUpload}
                        disabled={uploading || !selectedFile || !newDocName}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                      >
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        Anexar
                      </button>
                    </div>
                  </div>
                  
                  {selectedFile && (
                    <p className="text-[10px] font-bold text-amber-600 ml-1">Arquivo selecionado: {selectedFile.name}</p>
                  )}

                  {/* Document List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {(formData.documentos || []).length === 0 ? (
                      <div className="col-span-full py-8 text-center bg-white/50 rounded-xl border border-dashed border-slate-300">
                        <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-xs text-slate-400 font-medium">Nenhum documento anexado.</p>
                      </div>
                    ) : (
                      (formData.documentos || []).map(doc => (
                        <div key={doc.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                              <FileText size={16} />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-slate-700 truncate" title={doc.nome}>{doc.nome}</span>
                              <span className="text-[9px] text-slate-400 font-black uppercase">Anexo</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a 
                              href={doc.arquivoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                            >
                              <Download size={14} />
                            </a>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-6 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-12 py-3 bg-amber-500 text-white font-black rounded-xl shadow-xl shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {editingId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmEmployee && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500 transform animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Atenção!</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
              Você está prestes a excluir permanentemente os dados de <span className="font-black text-rose-600 uppercase tracking-tight">"{deleteConfirmEmployee.nomeCompleto}"</span>.
              <br/><br/>
              Todos os documentos anexos e informações de registro serão perdidos. Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setDeleteConfirmEmployee(null)} 
                className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={loading}
                className="px-6 py-2 bg-rose-500 text-white font-black rounded-xl shadow-xl shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeManager;
