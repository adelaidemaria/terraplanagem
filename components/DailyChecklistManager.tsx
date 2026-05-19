import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { DailyChecklist, CompanyVehicle, Funcionario, ConfiguracaoEmpresa, VehicleChecklistItem } from '../types';
import { ClipboardCheck, Calendar as CalendarIcon, Search, Printer, Eye, Link as LinkIcon, Download, X, Copy, Trash2, AlertTriangle, Loader2, ListChecks, Plus, Edit2, CheckCircle2 } from 'lucide-react';

interface DailyChecklistManagerProps {
  vehicles: CompanyVehicle[];
  employees: Funcionario[];
}

export default function DailyChecklistManager({ vehicles, employees }: DailyChecklistManagerProps) {
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);

  // Modais
  const [viewingChecklist, setViewingChecklist] = useState<DailyChecklist | null>(null);
  const [deletingChecklist, setDeletingChecklist] = useState<DailyChecklist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedEmployeeForLink, setSelectedEmployeeForLink] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Itens Obrigatórios
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [selectedVehicleForItems, setSelectedVehicleForItems] = useState('');
  const [vehicleItems, setVehicleItems] = useState<VehicleChecklistItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('configuracao_empresa').select('*').single();
        if (data) setConfig(data);
      } catch (e) {
        console.error("Erro ao buscar configurações da empresa:", e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [startDate, endDate, selectedEquipment, operatorFilter]);

  const fetchChecklists = async () => {
    setIsLoading(true);
    try {
      // Ajuste de fuso horário: cria a data no timezone local e converte para UTC (ISO)
      const startObj = new Date(`${startDate}T00:00:00`);
      const endObj = new Date(`${endDate}T23:59:59.999`);

      let query = supabase
        .from('daily_checklists')
        .select('*')
        .gte('created_at', startObj.toISOString())
        .lte('created_at', endObj.toISOString())
        .order('created_at', { ascending: false });

      if (selectedEquipment) {
        query = query.eq('equipment_id', selectedEquipment);
      }
      if (operatorFilter.trim()) {
        query = query.ilike('operator_name', `%${operatorFilter.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChecklists(data || []);
    } catch (err) {
      console.error("Erro ao buscar checklists:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = () => {
    if (!selectedEmployeeForLink) return;
    const emp = employees.find(e => e.id === selectedEmployeeForLink);
    if (emp) {
      const baseUrl = window.location.hostname === 'localhost' ? 'https://terraplanagem-nu.vercel.app' : window.location.origin;
      const url = new URL('/checklist', baseUrl);
      
      // Pega apenas o primeiro nome para ficar mais amigável na URL
      const firstName = emp.nomeCompleto.split(' ')[0];
      url.searchParams.set('operador', firstName);
      
      setGeneratedLink(url.toString());
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const confirmDelete = async () => {
    if (!deletingChecklist) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('daily_checklists').delete().eq('id', deletingChecklist.id);
      if (error) throw error;
      
      setChecklists(prev => prev.filter(c => c.id !== deletingChecklist.id));
      setDeletingChecklist(null);
    } catch (err: any) {
      console.error("Erro ao excluir checklist:", err);
      alert("Erro ao excluir o checklist: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const loadVehicleItems = async (vehicleId: string) => {
    if (!vehicleId) {
      setVehicleItems([]);
      return;
    }
    setIsLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_checklist_items')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setVehicleItems(data || []);
    } catch (err) {
      console.error("Erro ao carregar itens do veículo:", err);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    if (selectedVehicleForItems) {
      loadVehicleItems(selectedVehicleForItems);
    } else {
      setVehicleItems([]);
    }
  }, [selectedVehicleForItems]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForItems || !newItemName.trim()) return;
    
    try {
      const { error } = await supabase.from('vehicle_checklist_items').insert([{
        vehicle_id: selectedVehicleForItems,
        item_name: newItemName.trim()
      }]);
      
      if (error) throw error;
      setNewItemName('');
      loadVehicleItems(selectedVehicleForItems);
    } catch (err: any) {
      console.error("Erro ao adicionar item:", err);
      alert("Erro ao adicionar item: " + err.message);
    }
  };

  const handleEditItem = (item: VehicleChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemName(item.item_name);
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editingItemName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('vehicle_checklist_items')
        .update({ item_name: editingItemName.trim() })
        .eq('id', itemId);
        
      if (error) throw error;
      setEditingItemId(null);
      loadVehicleItems(selectedVehicleForItems);
    } catch (err: any) {
      console.error("Erro ao editar item:", err);
      alert("Erro ao editar item: " + err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Deseja realmente remover este item?")) return;
    
    try {
      const { error } = await supabase.from('vehicle_checklist_items').delete().eq('id', itemId);
      if (error) throw error;
      loadVehicleItems(selectedVehicleForItems);
    } catch (err: any) {
      console.error("Erro ao remover item:", err);
      alert("Erro ao remover item: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 print:p-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <ClipboardCheck className="text-amber-500" size={32} />
            Checklists Diários
          </h1>
          <p className="text-slate-500 mt-1">Consulte os relatórios operacionais enviados diariamente.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsItemsModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <ListChecks size={20} className="text-emerald-600" />
            Cadastrar Itens
          </button>
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"
          >
            <LinkIcon size={20} />
            Gerar Link P/ Operador
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end print:hidden">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Operador</label>
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none min-w-[200px]"
          >
            <option value="">Todos os Operadores</option>
            {employees.filter(e => e.isOperator).map(e => (
              <option key={e.id} value={e.nomeCompleto}>{e.nomeCompleto}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Equipamento</label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
          >
            <option value="">Todos os Equipamentos</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.model} {v.licensePlate ? `(${v.licensePlate})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Checklists */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Data / Hora</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Operador</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Equipamento</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Situação</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Carregando...</td>
                </tr>
              ) : checklists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum checklist encontrado para este período.</td>
                </tr>
              ) : (
                checklists.map((check) => {
                  const dateObj = new Date(check.created_at);
                  const itemsValues = Object.values(check.items);
                  const hasNC = itemsValues.some(i => i.status === 'NC');

                  return (
                    <tr key={check.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{dateObj.toLocaleDateString()}</div>
                        <div className="text-xs text-slate-500">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{check.operator_name}</td>
                      <td className="p-4 text-sm text-slate-600">{check.equipment_name.replace(' - undefined', '')}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                          check.situation === 'EQUIPAMENTO LIBERADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {check.situation}
                        </span>
                        {hasNC && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
                            Com NC
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingChecklist(check)}
                            className="text-amber-600 hover:text-amber-700 font-bold text-sm flex items-center gap-1 bg-amber-50 px-2 py-1.5 rounded-lg"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} /> Detalhes
                          </button>
                          <button
                            onClick={() => {
                              setViewingChecklist(check);
                              setTimeout(() => window.print(), 500);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-lg transition-colors"
                            title="Imprimir"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingChecklist(check)}
                            className="text-rose-500 hover:text-rose-700 font-bold text-sm flex items-center gap-1 bg-rose-50 px-2 py-1.5 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Gerar Link */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Gerar Link do Operador</h2>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o Operador</label>
                <select
                  value={selectedEmployeeForLink}
                  onChange={(e) => {
                    setSelectedEmployeeForLink(e.target.value);
                    setGeneratedLink('');
                  }}
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-amber-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {employees.filter(e => e.isOperator).map(e => (
                    <option key={e.id} value={e.id}>{e.nomeCompleto}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateLink}
                disabled={!selectedEmployeeForLink}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Gerar Link
              </button>

              {generatedLink && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Link Copiável:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedLink}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none"
                    />
                    <button onClick={copyToClipboard} className="bg-slate-800 hover:bg-black text-white px-3 py-2 rounded-lg transition-colors">
                      <Copy size={18} />
                    </button>
                  </div>
                  {showCopiedToast && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                      <CheckCircle2 size={18} />
                      <span className="text-sm font-bold">Link copiado com sucesso!</span>
                    </div>
                  )}
                  {(() => {
                    const selectedEmp = employees.find(e => e.id === selectedEmployeeForLink);
                    const wpNumber = selectedEmp?.whatsapp ? `55${selectedEmp.whatsapp}` : '';
                    const firstName = selectedEmp?.nomeCompleto.split(' ')[0] || '';
                    
                    const msgText = `*Olá ${firstName}!* 🚜👷‍♂️\n\nSegue o link do seu *Checklist Diário*:\n${generatedLink}\n\n_Por favor, acesse e preencha antes de iniciar a operação!_`;
                    const wpMsg = encodeURIComponent(msgText);
                    
                    return (
                      <a 
                        href={`https://wa.me/${wpNumber}?text=${wpMsg}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 rounded-lg mt-2"
                      >
                        Enviar via WhatsApp {selectedEmp?.whatsapp ? `(${selectedEmp.whatsapp})` : ''}
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal / Tela de Impressão do Checklist */}
      {viewingChecklist && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 overflow-y-auto print:static print:bg-white print:block">
          <div className="min-h-screen flex items-center justify-center p-4 print:p-0 print:block">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden print:shadow-none print:w-full">
              
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 print:hidden">
                <h2 className="text-lg font-bold text-slate-800">Detalhes do Checklist</h2>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                    <Printer size={18} /> Imprimir
                  </button>
                  <button onClick={() => setViewingChecklist(null)} className="text-slate-400 hover:text-slate-600 p-2">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Print Content Area */}
              <div className="p-8 print:p-0" id="print-area">
                
                {/* Cabeçalho da Empresa - Visível Apenas na Impressão */}
                <div className="hidden print:flex justify-between items-center border-b-2 border-slate-800 pb-6 mb-8">
                  <div className="flex items-center gap-4">
                    {config?.logo_url ? (
                      <img src={config.logo_url} alt={config.nome_fantasia || "Logotipo"} className="h-16 object-contain" />
                    ) : (
                      <img src="/logo-terraplanagem.png" alt="Terraplanagem Bauru" className="h-16" />
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800 text-sm">
                      {config?.cnpj ? `CNPJ: ${config.cnpj}` : ''} {config?.inscricao_municipal ? `| I.M.: ${config.inscricao_municipal}` : ''}
                    </p>
                    {config?.endereco && <p>{config.endereco}</p>}
                    <p>
                      {config?.telefone ? `(${config.telefone})` : ''} {config?.email && config?.telefone ? ' / ' : ''} 
                      {config?.email ? `E-mail: ${config.email}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-center mb-8 border-b-2 border-slate-800 pb-4 print:border-none print:mb-6 print:pb-0">
                  <h1 className="text-2xl font-black uppercase tracking-widest text-slate-800">Checklist Diário Operacional</h1>
                  <h2 className="text-lg font-bold text-slate-600 mt-2">{viewingChecklist.equipment_name.replace(' - undefined', '')}</h2>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-2 text-sm">
                    <div className="flex border-b border-slate-200 py-2"><span className="font-bold w-32">Operador:</span> <span>{viewingChecklist.operator_name}</span></div>
                    <div className="flex border-b border-slate-200 py-2"><span className="font-bold w-32">Data:</span> <span>{new Date(viewingChecklist.created_at).toLocaleDateString()}</span></div>
                    <div className="flex border-b border-slate-200 py-2"><span className="font-bold w-32">Hora Início:</span> <span>{new Date(viewingChecklist.start_time).toLocaleTimeString()}</span></div>
                    <div className="flex border-b border-slate-200 py-2"><span className="font-bold w-32">Hora Fim:</span> <span>{viewingChecklist.end_time ? new Date(viewingChecklist.end_time).toLocaleTimeString() : '-'}</span></div>
                  </div>
                  
                  <div className="border-4 border-slate-100 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                     <span className="font-bold text-slate-500 text-sm mb-2">Situação do Equipamento</span>
                     <span className={`text-xl font-black ${viewingChecklist.situation === 'EQUIPAMENTO LIBERADO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {viewingChecklist.situation}
                     </span>
                  </div>
                </div>

                <h3 className="font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">Inspeção Diária</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8">
                  {Object.values(viewingChecklist.items).map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                      <span className="font-medium text-slate-700">{item.name}</span>
                      <span className={`font-black ${item.status === 'OK' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.status}</span>
                    </div>
                  ))}
                </div>

                {viewingChecklist.observations && (
                  <div className="mb-8">
                    <h3 className="font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">Observações / Não Conformidades</h3>
                    <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                      {viewingChecklist.observations}
                    </p>
                  </div>
                )}

                {viewingChecklist.photo_url && (
                  <div className="mb-8 page-break-before print:mt-12">
                    <h3 className="font-black text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4">Registro Fotográfico</h3>
                    <div className="border border-slate-200 rounded-lg p-2 max-w-sm mx-auto shadow-sm">
                      <img src={viewingChecklist.photo_url} alt="Foto do Checklist" className="w-full h-auto rounded object-contain" style={{ maxHeight: '400px' }} />
                    </div>
                  </div>
                )}

                <div className="mt-16 grid grid-cols-2 gap-8 text-center pt-8">
                  <div>
                    <div className="border-t border-slate-400 mx-8 pt-2">
                      <span className="font-bold text-slate-700 block">Assinatura do Operador</span>
                      <span className="text-xs text-slate-500">{viewingChecklist.operator_name}</span>
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 mx-8 pt-2">
                      <span className="font-bold text-slate-700 block">Assinatura do Supervisor</span>
                      <span className="text-xs text-slate-500">Visto</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingChecklist && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500 transform animate-in zoom-in duration-200 print:hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-100 p-2 rounded-lg text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Excluir Checklist?</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
              Você tem certeza que deseja excluir o checklist do operador <span className="font-black text-rose-600">{deletingChecklist.operator_name}</span> para o equipamento <span className="font-black">{deletingChecklist.equipment_name.replace(' - undefined', '')}</span> do dia {new Date(deletingChecklist.created_at).toLocaleDateString()}?
              <br/><br/>
              Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setDeletingChecklist(null)} 
                className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="px-6 py-2 bg-rose-500 text-white font-black rounded-xl shadow-xl shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Itens Obrigatórios por Veículo */}
      {isItemsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ListChecks className="text-emerald-600" size={24} />
                Itens Obrigatórios do Checklist
              </h2>
              <button onClick={() => setIsItemsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o Veículo/Equipamento</label>
                <select
                  value={selectedVehicleForItems}
                  onChange={(e) => setSelectedVehicleForItems(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="">Selecione um veículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.model} {v.licensePlate ? `(${v.licensePlate})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVehicleForItems && (
                <div className="space-y-6">
                  <form onSubmit={handleAddItem} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Novo item de verificação (ex: Nível do Óleo, Faróis...)"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 border-2 border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newItemName.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                    >
                      <Plus size={18} /> Adicionar
                    </button>
                  </form>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-slate-700 text-sm">
                      Lista de Itens ({vehicleItems.length})
                    </div>
                    {isLoadingItems ? (
                      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        Carregando itens...
                      </div>
                    ) : vehicleItems.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        Nenhum item cadastrado para este veículo.<br/>Adicione o primeiro item acima.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {vehicleItems.map(item => (
                          <li key={item.id} className="p-3 flex justify-between items-center hover:bg-white transition-colors">
                            {editingItemId === item.id ? (
                              <div className="flex-1 flex gap-2 mr-4">
                                <input
                                  type="text"
                                  value={editingItemName}
                                  onChange={(e) => setEditingItemName(e.target.value)}
                                  className="flex-1 border-2 border-slate-200 rounded-lg px-3 py-1 text-sm focus:border-emerald-500 outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors"
                                  title="Salvar"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 rounded-lg transition-colors"
                                  title="Cancelar"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <span className="font-medium text-slate-700">{item.item_name}</span>
                            )}
                            
                            {editingItemId !== item.id && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors"
                                  title="Editar Item"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                                  title="Remover Item"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button 
                  onClick={() => setIsItemsModalOpen(false)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
               >
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
