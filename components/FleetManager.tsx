
import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Edit, Trash2, Wrench, X, History,
  AlertTriangle, CheckCircle2, Calendar, LayoutGrid, Info, Eye, FileText
} from 'lucide-react';
import { Equipment, MaintenanceRecord, MaintenanceIntervals, CompanyVehicle } from '../types';

interface FleetManagerProps {
  fleet: Equipment[];
  setFleet: React.Dispatch<React.SetStateAction<Equipment[]>>;
  maintenanceRecords: MaintenanceRecord[];
  setMaintenanceRecords: React.Dispatch<React.SetStateAction<MaintenanceRecord[]>>;
  companyVehicles: CompanyVehicle[];
}

const itemLabels: Record<keyof MaintenanceIntervals, string> = {
  oilChange: 'Troca de Óleo Motor',
  dieselFilter: 'Filtro de Diesel',
  oilFilter: 'Filtro de Óleo',
  internalAirFilter: 'Filtro Ar Interno',
  externalAirFilter: 'Filtro Ar Externo',
  bleedDieselFilter: 'Sangrar Filtro Diesel',
  others: 'Outras Manutenções'
};

const formatDateDisplay = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  if (!dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const FleetManager: React.FC<FleetManagerProps> = ({
  fleet, setFleet, maintenanceRecords, setMaintenanceRecords, companyVehicles
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'inventory' | 'history'>('alerts');
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);

  // Form States
  const [equipForm, setEquipForm] = useState<Partial<Equipment>>({
    vehicleId: '', observations: '',
    intervals: {
      oilChange: 3, dieselFilter: 3, oilFilter: 3,
      internalAirFilter: 6, externalAirFilter: 6,
      bleedDieselFilter: 1, others: 12
    }
  });

  const [maintForm, setMaintForm] = useState<Partial<MaintenanceRecord>>({
    equipmentId: '', date: new Date().toLocaleDateString('en-CA'),
    nfNumber: '', performedItems: [], observations: ''
  });

  // --- Logic for Next Due Dates & Alerts ---
  const fleetAlerts = useMemo(() => {
    const alerts: any[] = [];
    const today = new Date();

    fleet.forEach(equip => {
      Object.keys(equip.intervals).forEach((key) => {
        const itemKey = key as keyof MaintenanceIntervals;

        const lastMaint = maintenanceRecords
          .filter(r => r.equipmentId === equip.id && r.performedItems.includes(itemKey))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (lastMaint) {
          const lastDate = new Date(lastMaint.date);
          const nextDate = new Date(lastDate);
          nextDate.setMonth(lastDate.getMonth() + equip.intervals[itemKey]);

          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let status: 'overdue' | 'warning' | 'info' | 'ok' = 'ok';
          if (diffDays <= 0) status = 'overdue';
          else if (diffDays <= 2) status = 'warning';
          else if (diffDays <= 15) status = 'info';

          if (status !== 'ok') {
            alerts.push({
              equipId: equip.id,
              equipName: (() => {
                const v = companyVehicles.find(v => v.id === equip.vehicleId);
                return v ? `${v.type} - ${v.model}` : 'Veículo não encontrado';
              })(),
              item: itemLabels[itemKey],
              dueDate: nextDate.toLocaleDateString(),
              daysLeft: diffDays,
              status
            });
          }
        }
      });
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [fleet, maintenanceRecords]);

  // Handlers
  const handleOpenEquip = (e?: Equipment) => {
    if (e) {
      setEditingId(e.id);
      setEquipForm(e);
    } else {
      setEditingId(null);
      setEquipForm({
        vehicleId: '', observations: '',
        intervals: { oilChange: 3, dieselFilter: 3, oilFilter: 3, internalAirFilter: 6, externalAirFilter: 6, bleedDieselFilter: 1, others: 12 }
      });
    }
    setIsEquipModalOpen(true);
  };

  const handleOpenView = (e: Equipment) => {
    setSelectedEquip(e);
    setIsViewModalOpen(true);
  };

  const handleOpenMaint = (m?: MaintenanceRecord) => {
    if (m) {
      setEditingMaintId(m.id);
      setMaintForm(m);
    } else {
      setEditingMaintId(null);
      setMaintForm({
        equipmentId: '', date: new Date().toLocaleDateString('en-CA'),
        nfNumber: '', performedItems: [], observations: ''
      });
    }
    setIsMaintModalOpen(true);
  };

  const handleSaveEquip = (e: React.FormEvent) => {
    e.preventDefault();
    const equipmentData = { ...equipForm };
    
    if (editingId) {
      setFleet(prev => prev.map(eq => eq.id === editingId ? { ...eq, ...equipmentData } as Equipment : eq));
    } else {
      const newEquip = { 
        ...equipmentData, 
        id: crypto.randomUUID(), 
        createdAt: Date.now() 
      } as Equipment;
      setFleet(prev => [...prev, newEquip]);
    }
    setIsEquipModalOpen(false);
  };

  const handleSaveMaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintForm.equipmentId || maintForm.performedItems?.length === 0) return alert('Selecione o equipamento e ao menos um item.');

    const maintenanceData = { ...maintForm };

    if (editingMaintId) {
      setMaintenanceRecords(prev => prev.map(rec => rec.id === editingMaintId ? { ...rec, ...maintenanceData } as MaintenanceRecord : rec));
    } else {
      const newMaint = { 
        ...maintenanceData, 
        id: crypto.randomUUID(), 
        createdAt: Date.now() 
      } as MaintenanceRecord;
      setMaintenanceRecords(prev => [newMaint, ...prev]);
    }
    setIsMaintModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit print:hidden">
        <button onClick={() => setActiveTab('alerts')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'alerts' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          <AlertTriangle size={16} /> <span>Alertas / Vencimentos</span>
          {fleetAlerts.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 rounded-full ml-1">{fleetAlerts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'inventory' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          <LayoutGrid size={16} /> <span>Frota Ativa</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          <History size={16} /> <span>Histórico de Trocas</span>
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
          {activeTab === 'alerts' && 'Controle Preventivo'}
          {activeTab === 'inventory' && 'Inventário de Frota'}
          {activeTab === 'history' && 'Registros de Manutenção'}
        </h3>
        <div className="flex space-x-3 print:hidden">
          <button onClick={() => handleOpenMaint()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md transition-all">
            <CheckCircle2 size={18} /> <span>Lançar Troca/Filtro</span>
          </button>
          <button onClick={() => handleOpenEquip()} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 font-bold shadow-md transition-all">
            <Plus size={18} /> <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* --- CONTENT BY TAB --- */}

      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AlertColumn title="Vencidos" type="overdue" items={fleetAlerts.filter(a => a.status === 'overdue')} />
          <AlertColumn title="Vencendo em 2 dias" type="warning" items={fleetAlerts.filter(a => a.status === 'warning')} />
          <AlertColumn title="Vencendo em 15 dias" type="info" items={fleetAlerts.filter(a => a.status === 'info')} />
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Tipo / Equipamento</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Intervalo Troca Óleo</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Status Geral</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fleet.length > 0 ? fleet.map(equip => (
                <tr key={equip.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {(() => {
                        const v = companyVehicles.find(v => v.id === equip.vehicleId);
                        return (
                          <>
                            <span className="font-bold text-slate-800 text-lg">{v?.model || '---'}</span>
                            <span className="text-xs font-black text-slate-400 uppercase">{v?.type || 'Não Identificado'} - {v?.licensePlate || ''}</span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">A cada {equip.intervals.oilChange} meses</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-slate-600">Operacional</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleOpenView(equip)} className="p-2 text-slate-400 hover:text-blue-500" title="Visualizar Dados"><Eye size={18} /></button>
                      <button onClick={() => handleOpenEquip(equip)} className="p-2 text-slate-400 hover:text-amber-500" title="Editar Cadastro"><Edit size={18} /></button>
                      <button onClick={() => { setDeleteConfirmId(equip.id); }} className="p-2 text-slate-400 hover:text-rose-500" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">Nenhum equipamento cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Data</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Equipamento</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Nota Fiscal</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">Documento / NF</th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenanceRecords.length > 0 ? maintenanceRecords.map(rec => {
                const equip = fleet.find(f => f.id === rec.equipmentId);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">{formatDateDisplay(rec.date)}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {(() => {
                        const v = companyVehicles.find(v => v.id === equip?.vehicleId);
                        return v ? `${v.type} - ${v.model}` : 'Veículo não encontrado';
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-500 uppercase">{rec.nfNumber || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {rec.receiptUrl ? (
                        <a href={rec.receiptUrl} target="_blank" rel="noopener noreferrer" className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg border border-amber-200 text-[10px] font-black uppercase flex items-center w-fit hover:bg-amber-100 transition-all">
                          <FileText size={12} className="mr-1.5" /> Abrir Documento
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase">Sem Anexo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => handleOpenMaint(rec)} className="p-2 text-slate-400 hover:text-amber-500" title="Editar Registro"><Edit size={16} /></button>
                        <button onClick={() => setMaintenanceRecords(prev => prev.filter(r => r.id !== rec.id))} className="p-2 text-slate-300 hover:text-rose-500" title="Excluir Registro"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">Nenhum histórico disponível.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* View Modal (Read Only) */}
      {isViewModalOpen && selectedEquip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6">
              {(() => {
                const v = companyVehicles.find(v => v.id === selectedEquip.vehicleId);
                return (
                  <div>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{v?.type || '---'}</span>
                    <h2 className="text-2xl font-black text-slate-800 uppercase leading-none mt-1">{v?.model || '---'}</h2>
                  </div>
                );
              })()}
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Calendar size={14} className="mr-2" /> Intervalos de Manutenção</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                  {Object.entries(itemLabels).map(([key, label]) => (
                    <div key={key} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
                      <span className="text-xs font-black text-slate-800">{selectedEquip.intervals[key as keyof MaintenanceIntervals]} meses</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observações Técnicas</h3>
                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                  {selectedEquip.observations || 'Nenhuma observação técnica cadastrada para este equipamento.'}
                </p>
              </div>

              <button onClick={() => setIsViewModalOpen(false)} className="w-full py-3 bg-slate-900 text-white font-black uppercase text-xs rounded-xl tracking-widest hover:bg-slate-800 transition-colors">Fechar Visualização</button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Record Modal (Edit/Add) */}
      {isMaintModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-150">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {editingMaintId ? 'Editar Manutenção' : 'Lançar Manutenção Realizada'}
              </h2>
              <button onClick={() => setIsMaintModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveMaint} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Equipamento / Veículo *</label>
                  <select required className="w-full px-4 py-3 border rounded-xl bg-white font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" value={maintForm.equipmentId} onChange={e => setMaintForm({ ...maintForm, equipmentId: e.target.value })}>
                    <option value="">Escolha o Equipamento...</option>
                    {fleet.map(e => {
                      const v = companyVehicles.find(v => v.id === e.vehicleId);
                      return <option key={e.id} value={e.id}>{v?.type} - {v?.model}</option>;
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Data Realização</label>
                    <input type="date" required className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" value={maintForm.date} onChange={e => setMaintForm({ ...maintForm, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Nº Nota Fiscal (NF)</label>
                    <input placeholder="Ex: 00254" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-black" value={maintForm.nfNumber} onChange={e => setMaintForm({ ...maintForm, nfNumber: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-3 flex items-center">
                  <Wrench size={14} className="mr-2 text-emerald-500" /> Itens que foram Trocados/Manutenidos *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  {Object.entries(itemLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-3 cursor-pointer group bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        checked={maintForm.performedItems?.includes(key as any)}
                        onChange={e => {
                          const items = maintForm.performedItems || [];
                          if (e.target.checked) setMaintForm({ ...maintForm, performedItems: [...items, key as any] });
                          else setMaintForm({ ...maintForm, performedItems: items.filter(i => i !== key) });
                        }}
                      />
                      <span className="text-[10px] font-black text-slate-600 uppercase leading-tight">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1 flex items-center"><FileText size={14} className="mr-2" /> Documentação / Observações da Troca</label>
                <textarea rows={3} placeholder="Descreva detalhes da manutenção, marca das peças ou observações para o próximo período..." className="w-full px-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" value={maintForm.observations} onChange={e => setMaintForm({ ...maintForm, observations: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Anexar Nota Fiscal / Documento da Troca</label>
                <div className="mt-1 flex items-center space-x-4">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMaintForm({ ...maintForm, receiptUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {maintForm.receiptUrl && (
                    <span className="text-emerald-600 font-bold text-[10px] uppercase flex items-center">
                      <CheckCircle2 size={14} className="mr-1" /> Arquivo Carregado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button type="button" onClick={() => setIsMaintModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-emerald-500 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all">
                  {editingMaintId ? 'Salvar Alterações' : 'Confirmar Manutenção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Equipment Modal (Add/Edit) */}
      {isEquipModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-150 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingId ? 'Editar Cadastro' : 'Cadastrar Equipamento'}</h2>
              <button onClick={() => setIsEquipModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveEquip} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1">Tipo Veículo/Modelo</label>
                  <select 
                    required 
                    className="w-full px-4 py-3 border rounded-xl bg-white font-bold outline-none focus:ring-2 focus:ring-amber-500/20" 
                    value={equipForm.vehicleId} 
                    onChange={e => setEquipForm({ ...equipForm, vehicleId: e.target.value })}
                  >
                    <option value="">Selecione o Veículo Cadastrado...</option>
                    {companyVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.type} - {v.model} ({v.licensePlate})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase mb-4 flex items-center"><Calendar size={14} className="mr-1 text-amber-500" /> Manutenção Periódica (Intervalo em Meses)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(itemLabels).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number" min="1"
                          className="w-full px-3 py-2 border rounded-xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/10"
                          value={equipForm.intervals?.[key as keyof MaintenanceIntervals]}
                          onChange={e => setEquipForm({
                            ...equipForm,
                            intervals: { ...equipForm.intervals!, [key]: Number(e.target.value) }
                          })}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">MÊS</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Observações Técnicas</label>
                <textarea rows={2} className="w-full px-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20" value={equipForm.observations} onChange={e => setEquipForm({ ...equipForm, observations: e.target.value })} />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button type="button" onClick={() => setIsEquipModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-amber-500 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-amber-100 hover:scale-[1.02] active:scale-95 transition-all">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-2 flex items-center text-rose-600"><AlertTriangle className="mr-2" /> Excluir Equipamento?</h3>
            <p className="text-sm text-slate-600 mb-6">Esta ação removerá o caminhão/máquina da frota ativa. O histórico de manutenções será preservado por segurança.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
              <button onClick={() => { setFleet(prev => prev.filter(eq => eq.id !== deleteConfirmId)); setDeleteConfirmId(null); }} className="px-6 py-2 bg-rose-500 text-white font-bold rounded-lg shadow-lg">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for Alerts UI
const AlertColumn = ({ title, type, items }: { title: string, type: 'overdue' | 'warning' | 'info', items: any[] }) => {
  const colors = {
    overdue: 'border-rose-200 bg-rose-50 text-rose-700',
    warning: 'border-orange-200 bg-orange-50 text-orange-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700'
  };

  return (
    <div className={`flex flex-col rounded-3xl border h-[600px] shadow-sm ${colors[type]}`}>
      <div className="p-5 border-b border-inherit flex justify-between items-center">
        <h4 className="font-black text-xs uppercase tracking-widest">{title}</h4>
        <span className="bg-white/50 px-2.5 py-1 rounded-full text-[10px] font-black">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length > 0 ? items.map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2 group">
            <div className="flex justify-between items-start">
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight">{item.equipName}</p>
              <Info size={14} className="text-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendente:</span>
              <span className="text-sm font-bold text-slate-700">{item.item}</span>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">Vencimento:</span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded bg-slate-100">{item.dueDate}</span>
            </div>
            <p className={`text-[10px] font-black uppercase text-right ${type === 'overdue' ? 'text-rose-500' : 'text-slate-500'}`}>
              {item.daysLeft <= 0 ? `Vencido há ${Math.abs(item.daysLeft)} dias` : `Vence em ${item.daysLeft} dias`}
            </p>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Wrench size={32} className="mb-2" />
            <p className="text-[10px] font-black uppercase">Sem pendências</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetManager;
