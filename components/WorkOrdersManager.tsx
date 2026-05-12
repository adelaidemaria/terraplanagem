import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer, WorkOrder, WorkOrderItem, RentalEquipment, ConfiguracaoEmpresa } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Search, FileText, Calendar, User, AlignLeft, Edit, Trash2, CheckCircle2, ChevronDown, ChevronRight, Hash, Building2, Printer, Lock, LockOpen } from 'lucide-react';

interface WorkOrdersManagerProps {
  customers: Customer[];
  workOrders: WorkOrder[];
  setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  workOrderItems: WorkOrderItem[];
  setWorkOrderItems: React.Dispatch<React.SetStateAction<WorkOrderItem[]>>;
  rentalEquipments: RentalEquipment[];
  setRentalEquipments: React.Dispatch<React.SetStateAction<RentalEquipment[]>>;
  companyConfig?: ConfiguracaoEmpresa;
}

const WorkOrdersManager: React.FC<WorkOrdersManagerProps> = ({
  customers,
  workOrders,
  setWorkOrders,
  workOrderItems,
  setWorkOrderItems,
  rentalEquipments,
  setRentalEquipments,
  companyConfig
}) => {
  const [activeTab, setActiveTab] = useState<'abertos' | 'finalizadas' | 'relatorios'>('abertos');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [filterEndDate, setFilterEndDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [filterCustomer, setFilterCustomer] = useState('');

  // Form (Nova Ordem)
  const [orderType, setOrderType] = useState<'Locação' | 'Serviço'>('Locação');
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Form (Novo Item)
  const [itemDate, setItemDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [itemDesc, setItemDesc] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemCostCenter, setItemCostCenter] = useState('');
  const [itemUnitType, setItemUnitType] = useState<string>('Diária');
  const [itemObs, setItemObs] = useState('');

  // Form (Novo Equipamento)
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipPrice, setNewEquipPrice] = useState(0);
  const [editingEquipId, setEditingEquipId] = useState<string | null>(null);

  // Expandir no Relatório
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Estado para Modal de Confirmação Personalizado
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (selectedOrderId) {
      setTimeout(() => dateInputRef.current?.focus(), 50);
    }
  }, [selectedOrderId]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDayOfWeek = (dateString: string) => {
    const d = new Date(dateString + 'T00:00:00');
    const days = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
    return days[d.getDay()];
  };

  const formatInputCurrency = (value: number) => {
    return (value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === orderCustomerId);
    if (!customer) return;

    const newOrder: WorkOrder = {
      id: crypto.randomUUID(),
      type: orderType,
      customerId: customer.id,
      customerName: customer.name,
      status: 'Aberto',
      startDate: orderDate,
      createdAt: Date.now()
    };

    setWorkOrders(prev => [newOrder, ...prev]);
    setIsModalOpen(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    if (editingItemId) {
      setWorkOrderItems(prev => prev.map(i => i.id === editingItemId ? {
        ...i,
        date: itemDate,
        description: itemDesc,
        quantity: itemQty,
        unitPrice: itemPrice,
        totalPrice: itemQty * itemPrice,
        costCenter: itemCostCenter,
        unitType: itemUnitType,
        observations: itemObs
      } : i));
      setEditingItemId(null);
    } else {
      const newItem: WorkOrderItem = {
        id: crypto.randomUUID(),
        workOrderId: selectedOrderId,
        date: itemDate,
        description: itemDesc,
        quantity: itemQty,
        unitPrice: itemPrice,
        totalPrice: itemQty * itemPrice,
        costCenter: itemCostCenter,
        unitType: itemUnitType,
        observations: itemObs,
        createdAt: Date.now()
      };
      setWorkOrderItems(prev => [...prev, newItem]);
    }
    
    // Reseta form
    setItemDesc('');
    setItemQty(1);
    setItemPrice(0);
    setItemCostCenter('');
    setItemUnitType('Diária');
    setItemObs('');
    
    setTimeout(() => dateInputRef.current?.focus(), 50);
  };

  const handleCreateEquip = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEquipId) {
      setRentalEquipments(prev => prev.map(e => e.id === editingEquipId ? { ...e, name: newEquipName, defaultPrice: newEquipPrice } : e));
      setEditingEquipId(null);
    } else {
      const newEquip: RentalEquipment = {
        id: crypto.randomUUID(),
        name: newEquipName,
        defaultPrice: newEquipPrice,
        workOrderId: selectedOrderId || undefined,
        customerId: selectedOrder?.customerId || undefined,
        createdAt: Date.now()
      };
      setRentalEquipments(prev => [...prev, newEquip]);
    }
    setNewEquipName('');
    setNewEquipPrice(0);
  };

  const handleEditEquip = (equip: RentalEquipment) => {
    setEditingEquipId(equip.id);
    setNewEquipName(equip.name);
    setNewEquipPrice(equip.defaultPrice);
  };

  const handleDeleteEquip = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Item do Catálogo',
      message: 'Deseja realmente remover este item do catálogo de preços? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: () => {
        setRentalEquipments(prev => prev.filter(e => e.id !== id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSelectEquip = (equipName: string) => {
    setItemDesc(equipName);
    // Busca primeiro no catálogo da ficha/cliente, depois no global
    const equip = rentalEquipments.find(e => e.name === equipName && (e.workOrderId === selectedOrderId || e.customerId === selectedOrder?.customerId)) 
               || rentalEquipments.find(e => e.name === equipName && !e.workOrderId);
    if (equip) {
      setItemPrice(equip.defaultPrice);
    }
  };

  const handleEditItem = (item: WorkOrderItem) => {
    setEditingItemId(item.id);
    setItemDate(item.date);
    setItemDesc(item.description);
    setItemQty(item.quantity);
    setItemPrice(item.unitPrice);
    setItemCostCenter(item.costCenter || '');
    setItemUnitType(item.unitType || '-');
    setItemObs(item.observations || '');
    setTimeout(() => dateInputRef.current?.focus(), 50);
  };

  const handleCloseOrder = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Finalizar Ficha',
      message: 'Deseja realmente finalizar esta Ficha? Ela não poderá mais receber novos itens.',
      type: 'warning',
      onConfirm: () => {
        setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, status: 'Finalizado' } : w));
        setSelectedOrderId(null);
        setActiveTab('finalizadas');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleReopenOrder = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reabrir Ficha',
      message: 'Esta ficha está finalizada. Deseja reabri-la para fazer alterações?',
      onConfirm: () => {
        setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, status: 'Aberto' } : w));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Lançamento',
      message: 'Tem certeza que deseja remover este lançamento da ficha?',
      type: 'danger',
      onConfirm: () => {
        setWorkOrderItems(prev => prev.filter(i => i.id !== itemId));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteOrder = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Ficha Completa',
      message: 'Atenção: Excluir esta ficha apagará permanentemente todos os seus itens e lançamentos. Confirma esta ação?',
      type: 'danger',
      onConfirm: () => {
        setWorkOrders(prev => prev.filter(o => o.id !== id));
        setWorkOrderItems(prev => prev.filter(i => i.workOrderId !== id));
        if (selectedOrderId === id) setSelectedOrderId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSelectOrder = (order: WorkOrder) => {
    if (order.status === 'Finalizado' && selectedOrderId !== order.id) {
      setConfirmModal({
        isOpen: true,
        title: 'Ficha Finalizada',
        message: 'Esta ficha está finalizada. Você deseja visualizá-la? (Alterações só serão permitidas se a ficha for reaberta)',
        onConfirm: () => {
          setSelectedOrderId(order.id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
        type: 'warning'
      });
    } else {
      setSelectedOrderId(order.id);
    }
  };

  const openOrders = useMemo(() => {
    return workOrders.filter(o => o.status === 'Aberto').sort((a, b) => b.createdAt - a.createdAt);
  }, [workOrders]);

  const finishedOrders = useMemo(() => {
    return workOrders.filter(o => o.status === 'Finalizado').sort((a, b) => b.createdAt - a.createdAt);
  }, [workOrders]);

  const reportOrders = useMemo(() => {
    return workOrders.filter(o => {
      const matchCustomer = !filterCustomer || o.customerId === filterCustomer;
      const matchTerm = !searchTerm || o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrar itens dentro do período
      const items = workOrderItems.filter(i => i.workOrderId === o.id);
      let matchDate = false;
      if (items.length > 0) {
        matchDate = items.some(i => i.date >= filterStartDate && i.date <= filterEndDate);
      } else {
        matchDate = o.startDate >= filterStartDate && o.startDate <= filterEndDate;
      }

      return matchCustomer && matchTerm && matchDate;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [workOrders, workOrderItems, filterCustomer, searchTerm, filterStartDate, filterEndDate]);

  const selectedOrder = workOrders.find(o => o.id === selectedOrderId);
  const selectedOrderItems = workOrderItems.filter(i => i.workOrderId === selectedOrderId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  
  const totalSelectedOrder = selectedOrderItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const summariesByCostCenter = useMemo(() => {
    const centers = new Map<string, {
      items: Map<string, { quantity: number; unitPrice: number; totalPrice: number }>;
      dates: Set<string>;
    }>();
    
    selectedOrderItems.forEach(item => {
      const cc = item.costCenter || '';
      if (!centers.has(cc)) {
        centers.set(cc, { items: new Map(), dates: new Set() });
      }
      const centerData = centers.get(cc)!;
      centerData.dates.add(item.date);

      const existing = centerData.items.get(item.description);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalPrice += item.totalPrice;
        existing.unitPrice = item.unitPrice;
      } else {
        centerData.items.set(item.description, {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        });
      }
    });

    return Array.from(centers.entries()).map(([cc, data]) => ({
      costCenter: cc,
      items: Array.from(data.items.entries()).map(([name, itemData]) => ({ name, ...itemData })),
      dates: Array.from(data.dates).sort(),
      total: Array.from(data.items.values()).reduce((sum, i) => sum + i.totalPrice, 0)
    })).sort((a, b) => {
      if (a.costCenter === '' && b.costCenter !== '') return 1;
      if (a.costCenter !== '' && b.costCenter === '') return -1;
      return a.costCenter.localeCompare(b.costCenter);
    });
  }, [selectedOrderItems]);

  const orderPeriod = useMemo(() => {
    if (selectedOrderItems.length === 0) return selectedOrder?.startDate.split('-').reverse().join('/') || '';
    const sortedDates = [...selectedOrderItems].sort((a, b) => a.date.localeCompare(b.date));
    const start = sortedDates[0].date.split('-').reverse().join('/');
    const end = sortedDates[sortedDates.length - 1].date.split('-').reverse().join('/');
    if (start === end) return start;
    return `${start} a ${end}`;
  }, [selectedOrderItems, selectedOrder]);

  const fichaEquipments = useMemo(() => {
    if (!selectedOrderId) return [];
    // Prioriza equipamentos desta ficha ou deste cliente, e inclui os globais (sem vínculo)
    return rentalEquipments.filter(e => 
      e.workOrderId === selectedOrderId || 
      (e.customerId === selectedOrder?.customerId && !e.workOrderId) || 
      (!e.workOrderId && !e.customerId)
    ).sort((a, b) => {
      // Ordena: ficha > cliente > global
      const getScore = (e: RentalEquipment) => {
        if (e.workOrderId === selectedOrderId) return 3;
        if (e.customerId === selectedOrder?.customerId) return 2;
        return 1;
      };
      return getScore(b) - getScore(a);
    });
  }, [rentalEquipments, selectedOrderId, selectedOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-black text-slate-800 flex items-center">
          <FileText className="mr-3 text-amber-500" />
          Locações e Serviços
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('abertos')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'abertos' ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
          >
            Fichas em Aberto
          </button>
          <button
            onClick={() => setActiveTab('finalizadas')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'finalizadas' ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
          >
            Fichas Finalizadas
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'relatorios' ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
          >
            Relatórios / Histórico
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-colors flex items-center"
          >
            <Plus size={18} className="mr-1" /> Nova Ficha
          </button>
        </div>
      </div>

      {(activeTab === 'abertos' || activeTab === 'finalizadas') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="lg:col-span-1 space-y-4">
             {(activeTab === 'abertos' ? openOrders : finishedOrders).length === 0 ? (
               <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                 <p className="text-slate-500 font-bold mb-2">Nenhuma ficha {activeTab === 'abertos' ? 'em aberto' : 'finalizada'}.</p>
                 <p className="text-xs text-slate-400">{activeTab === 'abertos' ? 'Clique em Nova Ficha para iniciar.' : 'As fichas finalizadas aparecerão aqui.'}</p>
               </div>
             ) : (
               (activeTab === 'abertos' ? openOrders : finishedOrders).map(order => {
                  const orderItems = workOrderItems.filter(i => i.workOrderId === order.id);
                  const itemsCount = orderItems.length;
                  const uniqueDates = Array.from(new Set(orderItems.map(i => i.date))).sort();
                  const isActive = selectedOrderId === order.id;
                  return (
                    <div 
                      key={order.id} 
                      onClick={() => handleSelectOrder(order)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-amber-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex flex-wrap gap-1">
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${order.type === 'Locação' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                             {order.type}
                           </span>
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${order.status === 'Aberto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                             {order.status === 'Aberto' ? 'Ficha em Aberto' : <><Lock size={10} /> Ficha Finalizada</>}
                           </span>
                         </div>
                         <span className="text-[10px] text-slate-400 font-bold">Iniciada em: {order.startDate.split('-').reverse().join('/')}</span>
                      </div>
                      <p className="font-black text-slate-800">{order.customerName}</p>
                      {uniqueDates.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                           {uniqueDates.map(date => (
                             <span key={date} className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                               {date.split('-').reverse().join('/')}
                             </span>
                           ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                         <p className="text-xs text-slate-500 flex items-center">
                           <Hash size={12} className="mr-1" /> {itemsCount} lançamentos
                         </p>
                         <p className="text-xs font-black text-slate-800">
                           {formatCurrency(orderItems.reduce((sum, item) => sum + item.totalPrice, 0))}
                         </p>
                      </div>
                    </div>
                  );
               })
             )}
          </div>

          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-xl border shadow-sm flex flex-col h-[calc(100vh-180px)]">
                <div className="p-6 border-b bg-slate-50 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{selectedOrder.customerName}</h3>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded bg-white border ${selectedOrder.type === 'Locação' ? 'text-blue-600' : 'text-purple-600'}`}>{selectedOrder.type}</span>
                      <span className="text-sm text-slate-500 font-bold">Início: {selectedOrder.startDate.split('-').reverse().join('/')}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setIsEquipModalOpen(true)} 
                      className="px-3 py-2 bg-white border border-amber-200 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-50 flex items-center shadow-sm"
                    >
                      <Edit size={14} className="mr-1" /> Catálogo da Ficha
                    </button>
                    <button onClick={() => handleDeleteOrder(selectedOrder.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir Ficha">
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black flex items-center shadow-lg transition-all active:scale-95 ring-2 ring-slate-900/10"
                    >
                      <Printer size={16} className="mr-2" /> Imprimir
                    </button>
                    {selectedOrder.status === 'Aberto' ? (
                      <button onClick={() => handleCloseOrder(selectedOrder.id)} className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600 flex items-center transition-all active:scale-95">
                        <CheckCircle2 size={16} className="mr-2" /> Finalizar Ficha
                      </button>
                    ) : (
                      <button onClick={() => handleReopenOrder(selectedOrder.id)} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-amber-200 hover:bg-amber-600 flex items-center transition-all active:scale-95">
                        <LockOpen size={16} className="mr-2" /> Reabrir Ficha
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                   <div className="mb-6">
                     <form onSubmit={handleAddItem} className={`bg-white p-4 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 ${selectedOrder?.status === 'Finalizado' ? 'opacity-50 pointer-events-none' : ''}`}>
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                          <input ref={dateInputRef} type="date" required className="w-full px-3 py-2 border rounded-lg text-sm" value={itemDate} onChange={e => setItemDate(e.target.value)} />
                       </div>
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">C.C.</label>
                          <input type="text" placeholder="Centro de Custo" className="w-full px-3 py-2 border rounded-lg text-sm" value={itemCostCenter} onChange={e => setItemCostCenter(e.target.value)} />
                       </div>
                        <div className="md:col-span-4">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{selectedOrder.type === 'Locação' ? 'Descrição da Locação' : 'Descrição dos Serviços Realizados'}</label>
                          <input 
                              type="text" 
                              required 
                              list="equip-suggestions"
                              placeholder="Ex: Diária Retroescavadeira" 
                              className="w-full px-3 py-2 border rounded-lg text-sm" 
                              value={itemDesc} 
                              onChange={e => handleSelectEquip(e.target.value)} 
                           />
                           <datalist id="equip-suggestions">
                              {fichaEquipments.map(e => (
                                <option key={e.id} value={e.name} />
                              ))}
                           </datalist>
                       </div>
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                          <select className="w-full px-3 py-2 border rounded-lg text-sm" value={itemUnitType} onChange={e => setItemUnitType(e.target.value)}>
                            <option value="-">-</option>
                            <option value="Diária">Diária</option>
                            <option value="Hora">Hora</option>
                          </select>
                       </div>
                       <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                          <input type="number" step="0.01" required className="w-full px-3 py-2 border rounded-lg text-sm" value={itemQty} onChange={e => setItemQty(Number(e.target.value))} />
                       </div>
                       <div className="md:col-span-4">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Unitário</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                            <input 
                              type="text" 
                              required 
                              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm font-bold text-slate-700" 
                              value={formatInputCurrency(itemPrice)} 
                              onChange={e => setItemPrice(parseCurrencyInput(e.target.value))} 
                            />
                          </div>
                       </div>
                       <div className="md:col-span-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                          <input type="text" placeholder="Obs..." className="w-full px-3 py-2 border rounded-lg text-sm" value={itemObs} onChange={e => setItemObs(e.target.value)} />
                       </div>
                       <div className="md:col-span-2 flex items-end">
                          <button type="submit" className={`w-full h-10 ${editingItemId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold text-sm rounded-lg shadow flex items-center justify-center`}>
                            {editingItemId ? 'Salvar' : 'Adicionar'}
                          </button>
                       </div>
                     </form>
                   </div>

                   {selectedOrderItems.length > 0 ? (
                     <div className="space-y-3">
                        {selectedOrderItems.map(item => (
                          <div key={item.id} className="bg-white p-4 rounded-xl border flex items-center justify-between group">
                            <div>
                               <div className="flex items-center space-x-3 mb-1">
                                 <span className="text-[11px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded tracking-tighter">{item.date.split('-').reverse().join('/')}</span>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">({formatDayOfWeek(item.date)})</span>
                                 {item.unitType && item.unitType !== '-' && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter border border-blue-100">{item.unitType}</span>}
                                 {item.costCenter && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">{item.costCenter}</span>}
                                 <span className="font-bold text-slate-800">{item.description}</span>
                               </div>
                               <div className="text-xs text-slate-400">
                                 {item.quantity} x {formatCurrency(item.unitPrice)}
                                 {item.observations && (
                                   <div className="text-slate-500 mt-1 italic">
                                     Obs: {item.observations}
                                   </div>
                                 )}
                               </div>
                            </div>
                            <div className="flex items-center space-x-4">
                               <span className="font-black text-slate-800">{formatCurrency(item.totalPrice)}</span>
                                {selectedOrder.status === 'Aberto' && (
                                   <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => handleEditItem(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors">
                                       <Edit size={14} />
                                     </button>
                                     <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors">
                                       <Trash2 size={14} />
                                     </button>
                                   </div>
                                 )}
                            </div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <p className="text-center text-slate-400 text-sm mt-10">Nenhum lançamento adicionado nesta ficha.</p>
                   )}
                </div>
                <div className="p-6 border-t bg-white flex justify-between items-center rounded-b-xl">
                   <span className="font-bold text-slate-500 uppercase text-xs">Total da Ficha</span>
                   <span className="text-2xl font-black text-emerald-600">{formatCurrency(totalSelectedOrder)}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">Selecione uma ficha para gerenciar os lançamentos</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4 print:hidden">
             <div className="flex-1">
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
               <select className="w-full px-3 py-2 border rounded-lg" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
                  <option value="">Todos os Clientes</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Inicial</label>
               <input type="date" className="w-full px-3 py-2 border rounded-lg" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Final</label>
               <input type="date" className="w-full px-3 py-2 border rounded-lg" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
             </div>
             <div className="flex items-end pb-1">
               <button onClick={() => window.print()} className="px-4 py-2 h-10 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700">Imprimir</button>
             </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden p-6 print:border-0 print:p-0">
             <table className="w-full">
               <thead className="print:table-header-group">
                 <tr>
                   <td>
                     {/* Cabeçalho da Empresa (Apenas Impressão) */}
                     {companyConfig && (
                       <div className="hidden print:flex items-start justify-between mb-3 border-b-2 border-slate-800 pb-6">
                         <div className="flex items-center gap-6">
                           {(companyConfig as any).logoUrl ? (
                             <img src={(companyConfig as any).logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
                           ) : (
                             <div className="h-20 w-20 bg-slate-100 rounded-xl flex items-center justify-center">
                               <Building2 size={40} className="text-slate-300" />
                             </div>
                           )}
                         </div>
                         <div className="text-right space-y-1 max-w-[400px]">
                           <p className="text-[10px] text-slate-500 font-bold">
                             CNPJ: {(companyConfig as any).cnpj} {(companyConfig as any).inscricaoMunicipal && ` | I.M.: ${(companyConfig as any).inscricaoMunicipal}`}
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{(companyConfig as any).endereco}</p>
                           <p className="text-[10px] text-slate-500 font-bold">{(companyConfig as any).telefone} &nbsp; / &nbsp; E-mail: {(companyConfig as any).email}</p>
                         </div>
                       </div>
                     )}

                     <div className="hidden print:block text-center mb-6">
                       <h3 className="text-lg font-medium text-slate-800 uppercase tracking-widest mb-0">Relatório de Locações e Serviços</h3>
                       <div className="border-b border-slate-200 pb-3 pt-0">
                         <p className="text-xs text-slate-500 font-bold">Período: {filterStartDate.split('-').reverse().join('/')} até {filterEndDate.split('-').reverse().join('/')}</p>
                       </div>
                     </div>
                   </td>
                 </tr>
               </thead>
               <tbody>
                 <tr>
                   <td>
                     {reportOrders.map(order => {
                       const items = workOrderItems.filter(i => i.workOrderId === order.id && i.date >= filterStartDate && i.date <= filterEndDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                       if (items.length === 0 && (order.startDate < filterStartDate || order.startDate > filterEndDate)) return null;

                       const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
                       const isExpanded = expandedOrders.includes(order.id);

                       return (
                         <div key={order.id} className="border-b last:border-0 print:break-inside-avoid mb-4">
                            <div className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 print:bg-slate-100" onClick={() => toggleExpand(order.id)}>
                              <div className="flex items-center space-x-4">
                                <span className="print:hidden">{isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}</span>
                                <div>
                                  <p className="font-bold text-slate-800 uppercase text-sm">{order.customerName}</p>
                                  <p className="text-xs text-slate-500">Ficha: {order.type} • Status: {order.status}</p>
                                </div>
                              </div>
                              <div className="font-black text-slate-800">
                                {formatCurrency(total)}
                              </div>
                            </div>
                            {(isExpanded || true) && (
                              <div className={`p-4 bg-white border-t border-dashed pl-12 print:pl-4 ${!isExpanded && 'print:block hidden'}`}>
                                <table className="w-full text-sm text-left">
                                  <thead>
                                    <tr className="text-slate-500 uppercase text-[10px]">
                                      <th className="pb-2">Data</th>
                                      <th className="pb-2">{order.type === 'Locação' ? 'Descrição da Locação' : 'Descrição dos Serviços Realizados'}</th>
                                      <th className="pb-2">Diária X Vlr Unitário</th>
                                      <th className="pb-2 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, idx) => {
                                      const isNewDay = idx > 0 && item.date !== items[idx - 1].date;
                                      return (
                                        <React.Fragment key={item.id}>
                                          {isNewDay && (
                                            <tr className="border-t-4 border-double border-slate-800">
                                              <td colSpan={4} className="py-1"></td>
                                            </tr>
                                          )}
                                          <tr className="print:break-inside-avoid">
                                            <td className="py-2 text-xs">{item.date.split('-').reverse().join('/')} ({formatDayOfWeek(item.date)})</td>
                                            <td className="py-2 text-xs font-medium">
                                              <div className="flex items-center gap-2">
                                                {item.description}
                                                {item.unitType && item.unitType !== '-' && <span className="text-[9px] bg-slate-100 px-1 rounded border border-slate-200 text-slate-500 font-black uppercase tracking-tight">{item.unitType}</span>}
                                                {item.costCenter && <span className="text-[9px] bg-slate-50 px-1 rounded border border-slate-200 text-slate-400 font-bold uppercase tracking-tight">{item.costCenter}</span>}
                                              </div>
                                              {item.observations && <div className="text-slate-400 font-normal text-[11px] mt-0.5">Obs: {item.observations}</div>}
                                            </td>
                                            <td className="py-2 text-xs">{item.quantity} x {formatCurrency(item.unitPrice)}</td>
                                            <td className="py-2 text-right font-bold text-xs">{formatCurrency(item.totalPrice)}</td>
                                          </tr>
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                         </div>
                       );
                     })}
                   </td>
                 </tr>
               </tbody>
             </table>
             {reportOrders.length === 0 && (
               <div className="p-8 text-center text-slate-500 font-bold">Nenhum registro encontrado no período.</div>
             )}
          </div>
        </div>
      )}

      {/* Modal Catálogo de Equipamentos */}
      {isEquipModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">Catálogo de Equipamentos / Preços</h3>
              <button onClick={() => setIsEquipModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateEquip} className="bg-slate-50 p-4 rounded-xl border mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Equipamento / Serviço</label>
                <input type="text" required className="w-full px-3 py-2 border rounded-lg text-sm" value={newEquipName} onChange={e => setNewEquipName(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Padrão</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" 
                    value={formatInputCurrency(newEquipPrice)} 
                    onChange={e => setNewEquipPrice(parseCurrencyInput(e.target.value))} 
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button type="submit" className={`w-full h-10 ${editingEquipId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-bold rounded-lg`}>
                  {editingEquipId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {fichaEquipments.length === 0 ? (
                <p className="text-center text-slate-400 py-8 italic">Nenhum item específico para esta ficha. Cadastre acima para definir preços personalizados.</p>
              ) : (
                fichaEquipments.map(equip => (
                  <div key={equip.id} className={`flex justify-between items-center p-3 border rounded-lg group ${equip.workOrderId ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{equip.name}</p>
                      </div>
                      <p className="text-xs text-slate-500">Valor: {formatCurrency(equip.defaultPrice)}</p>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditEquip(equip)} className="text-blue-400 hover:text-blue-600 p-1">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteEquip(equip.id)} className="text-rose-400 hover:text-rose-600 p-1">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Ordem */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-slate-800">Nova Ficha</h3>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                <select className="w-full px-4 py-2 border rounded-lg" value={orderType} onChange={e => setOrderType(e.target.value as any)}>
                  <option value="Locação">Locação</option>
                  <option value="Serviço">Serviço</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cliente</label>
                <select required className="w-full px-4 py-2 border rounded-lg" value={orderCustomerId} onChange={e => setOrderCustomerId(e.target.value)}>
                  <option value="">Selecione o Cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Data Inicial</label>
                <input type="date" required className="w-full px-4 py-2 border rounded-lg" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600">Criar Ficha</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Personalizado */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">{confirmModal.message}</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white font-bold text-sm rounded-lg shadow-lg transition-all active:scale-95 ${confirmModal.type === 'danger' ? 'bg-rose-500 shadow-rose-200 hover:bg-rose-600' : 'bg-amber-500 shadow-amber-200 hover:bg-amber-600'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Área de Impressão de Ficha Individual (Apenas Impressão) */}
      <div className="hidden print:block">
        {activeTab === 'abertos' && selectedOrderId && selectedOrder && (
          <div className="bg-white p-0">
             {/* Cabeçalho da Empresa */}
             {companyConfig && (
               <div className="flex items-start justify-between mb-3 border-b-2 border-slate-800 pb-6">
                 <div className="flex items-center gap-6">
                   {(companyConfig as any).logoUrl ? (
                     <img src={(companyConfig as any).logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
                   ) : (
                     <div className="h-20 w-20 bg-slate-100 rounded-xl flex items-center justify-center">
                       <Building2 size={40} className="text-slate-300" />
                     </div>
                   )}
                 </div>
                 <div className="text-right space-y-1 max-w-[400px]">
                   <p className="text-[10px] text-slate-500 font-bold">
                     CNPJ: {(companyConfig as any).cnpj} {(companyConfig as any).inscricaoMunicipal && ` | I.M.: ${(companyConfig as any).inscricaoMunicipal}`}
                   </p>
                   <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{(companyConfig as any).endereco}</p>
                   <p className="text-[10px] text-slate-500 font-bold">{(companyConfig as any).telefone} &nbsp; / &nbsp; E-mail: {(companyConfig as any).email}</p>
                 </div>
               </div>
             )}

             <div className="text-center mb-6">
               <h3 className="text-lg font-medium text-slate-800 uppercase tracking-widest mb-0">Relatório de Ficha de {selectedOrder.type}</h3>
               <div className="flex flex-col items-center border-b border-slate-200 pb-3 pt-0">
                 <p className="text-lg font-black text-slate-800 uppercase">{selectedOrder.customerName}</p>
                 <p className="text-xs text-slate-500 font-bold">Período: {orderPeriod}</p>
               </div>
             </div>

             <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-slate-600 uppercase text-[10px] border-b-2 border-slate-800">
                    <th className="pb-2">Data</th>
                    <th className="pb-2">{selectedOrder.type === 'Locação' ? 'Descrição da Locação' : 'Descrição dos Serviços Realizados'}</th>
                    <th className="pb-2">Diária X Vlr Unitário</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrderItems.map((item, idx) => {
                    const isNewDay = idx > 0 && item.date !== selectedOrderItems[idx - 1].date;
                    return (
                      <React.Fragment key={item.id}>
                        {isNewDay && (
                          <tr className="border-t-4 border-double border-slate-800">
                            <td colSpan={4} className="py-1"></td>
                          </tr>
                        )}
                        <tr className="print:break-inside-avoid">
                          <td className="py-2 text-xs">{item.date.split('-').reverse().join('/')} ({formatDayOfWeek(item.date)})</td>
                          <td className="py-2 text-xs font-medium">
                            <div className="flex items-center gap-2">
                              {item.description}
                              {item.unitType && item.unitType !== '-' && <span className="text-[9px] bg-slate-100 px-1 rounded border border-slate-200 text-slate-500 font-black uppercase tracking-tight">{item.unitType}</span>}
                              {item.costCenter && <span className="text-[9px] bg-slate-50 px-1 rounded border border-slate-200 text-slate-400 font-bold uppercase tracking-tight">{item.costCenter}</span>}
                            </div>
                            {item.observations && <div className="text-slate-400 font-normal text-[11px] mt-0.5">Obs: {item.observations}</div>}
                          </td>
                          <td className="py-2 text-xs">{item.quantity} x {formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 text-right font-bold text-xs">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                   <tr className="border-t-2 border-slate-800">
                      <td colSpan={3} className="py-4 text-right font-bold uppercase text-xs">Valor Total:</td>
                      <td className="py-4 text-right font-black text-xs text-emerald-700">{formatCurrency(totalSelectedOrder)}</td>
                   </tr>
                </tfoot>
             </table>

             {/* Resumo Consolidado por Centro de Custo */}
             {summariesByCostCenter.map((center, cIdx) => (
               <div key={cIdx} className="mt-8 border-2 border-slate-800 rounded-lg overflow-hidden print:break-inside-avoid shadow-sm">
                  <div className="bg-slate-800 text-white px-4 py-2 text-xs font-black uppercase tracking-wider flex justify-between items-center">
                    <span>{center.costCenter ? `Resumo - Centro de Custo: ${center.costCenter}` : 'Resumo Geral'}</span>
                  </div>
                  {center.dates && center.dates.length > 0 && (
                    <div className="bg-white px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Dias:</span>
                      {center.dates.map(date => (
                        <span key={date} className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                          {date.split('-').reverse().join('/')}
                        </span>
                      ))}
                    </div>
                  )}
                  <table className="w-full text-sm text-left">
                     <thead>
                       <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                         <th className="px-4 py-2">Equipamento / Serviço</th>
                         <th className="px-4 py-2 text-center">Qtdade Diárias</th>
                         <th className="px-4 py-2 text-right">Vlr Unitário</th>
                         <th className="px-4 py-2 text-right">Vlr Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {center.items.map((sum, idx) => (
                         <tr key={idx}>
                           <td className="px-4 py-2 font-bold text-slate-800 uppercase text-xs">{sum.name}</td>
                           <td className="px-4 py-2 text-center font-bold text-xs">{sum.quantity}</td>
                           <td className="px-4 py-2 text-right text-xs">{formatCurrency(sum.unitPrice)}</td>
                           <td className="px-4 py-2 text-right font-black text-xs">{formatCurrency(sum.totalPrice)}</td>
                         </tr>
                       ))}
                     </tbody>
                     <tr className="bg-slate-50 border-t border-slate-300">
                        <td colSpan={3} className="px-4 py-2 text-right font-black uppercase text-[10px]">Total do Centro de Custo:</td>
                        <td className="px-4 py-2 text-right font-black text-xs text-slate-900 border-l border-slate-200 bg-amber-50/30">{formatCurrency(center.total)}</td>
                     </tr>
                  </table>
               </div>
             ))}

          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrdersManager;
