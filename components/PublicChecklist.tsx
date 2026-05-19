import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CompanyVehicle, DailyChecklist, ChecklistItem } from '../types';
import { checklistTemplates, ChecklistTemplate } from '../lib/checklistTemplates';
import { Camera, CheckCircle2, AlertCircle, Save, Loader2, Image as ImageIcon, X } from 'lucide-react';

export default function PublicChecklist() {
  const [operatorName, setOperatorName] = useState<string>('');
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  // Funções de formatação apenas para visualização nesta tela
  const getFormattedName = (model: string) => {
    const upper = model.toUpperCase();
    if (upper.includes('BOBCAT')) return 'BOB CAT';
    if (upper.includes('FORD CARGO')) return 'FORD CARGO 2422';
    if (upper.includes('M. BENZ') || upper.includes('M. BENS')) return 'M. BENZ L 1313';
    if (upper.includes('MINI ESCAVADEIRA')) return 'MINI ESCAVADEIRA';
    if (upper.includes('RETROESCAVADEIRA')) return 'RETROESCAVADEIRA';
    if (upper.includes('VW') || upper.includes('11.130')) return 'VOLKS PRANCHA';
    return model;
  };

  const getSortOrder = (formattedName: string) => {
    const name = formattedName.toUpperCase();
    if (name.includes('BOB CAT')) return 1;
    if (name.includes('RETROESCAVADEIRA')) return 2;
    if (name.includes('MINI ESCAVADEIRA')) return 3;
    if (name.includes('FORD CARGO')) return 4;
    if (name.includes('M. BENZ')) return 5;
    if (name.includes('VOLKS PRANCHA')) return 6;
    return 99;
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    return getSortOrder(getFormattedName(a.model)) - getSortOrder(getFormattedName(b.model));
  });
  
  const [startTime, setStartTime] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>({});
  const [templateName, setTemplateName] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('');
  
  const [observations, setObservations] = useState('');
  const [situation, setSituation] = useState<'EQUIPAMENTO LIBERADO' | 'EQUIPAMENTO NÃO LIBERADO'>('EQUIPAMENTO LIBERADO');
  
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvalidLink, setIsInvalidLink] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const params = new URLSearchParams(window.location.search);
      const opNameUrl = params.get('operador');

      if (!opNameUrl) {
        setIsInvalidLink(true);
        setLoadingInitial(false);
        return;
      }

      try {
        let opName = opNameUrl;
        let linkedIds: string[] = [];

        // Buscar funcionário que começa com este nome
        const { data: emp, error: empError } = await supabase
          .from('funcionarios')
          .select('nome_completo, linked_vehicles')
          .ilike('nome_completo', `${opNameUrl}%`)
          .limit(1);
          
        if (emp && emp.length > 0) {
          opName = emp[0].nome_completo;
          linkedIds = emp[0].linked_vehicles || [];
        } else {
          // Se não encontrou o funcionário, considera link inválido
          setIsInvalidLink(true);
          setLoadingInitial(false);
          return;
        }

        setOperatorName(opName);
        await fetchVehicles(linkedIds);
      } catch (err) {
        console.error("Erro na inicialização:", err);
        setError("Erro ao carregar seus dados.");
      } finally {
        setLoadingInitial(false);
      }
    };

    initialize();
  }, []);

  const fetchVehicles = async (linkedIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('company_vehicles')
        .select('*')
        .eq('status', 'Ativo')
        .order('model');
      
      if (error) throw error;
      
      // Se tiver array de vinculados, filtra. Senão (se usou link antigo), mostra todos ou nenhum?
      // Mostrar todos por segurança no fallback.
      let finalVehicles = data || [];
      if (linkedIds && linkedIds.length > 0) {
        finalVehicles = finalVehicles.filter(v => linkedIds.includes(v.id));
      } else if (linkedIds && linkedIds.length === 0 && !window.location.search.includes('operador=')) {
         // Se não tem link antigo E os vinculados é array vazio, ele não tem veículos
         finalVehicles = [];
      }
      
      setVehicles(finalVehicles);
    } catch (err: any) {
      console.error("Erro ao buscar veículos:", err);
      setError("Não foi possível carregar a lista de equipamentos.");
    }
  };

  const handleStartChecklist = async () => {
    if (!selectedVehicleId) {
      setError("Selecione um equipamento para iniciar.");
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Verificar se já existe checklist para este equipamento hoje
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: existingChecklist, error: checkError } = await supabase
        .from('daily_checklists')
        .select('id, operator_name')
        .eq('equipment_id', selectedVehicleId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .limit(1);

      if (checkError) throw checkError;

      if (existingChecklist && existingChecklist.length > 0) {
        setError(`Atenção: Um checklist já foi preenchido para este equipamento hoje por ${existingChecklist[0].operator_name}. Só é permitido um checklist por dia.`);
        setIsSubmitting(false);
        return;
      }

      setStartTime(new Date().toISOString());
      setEquipmentType(vehicle.type);

      // Fetch dynamic items from the database
      const { data: dbItems, error: itemsError } = await supabase
        .from('vehicle_checklist_items')
        .select('*')
        .eq('vehicle_id', selectedVehicleId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error("Erro ao buscar itens do veículo:", itemsError);
      }

      setTemplateName('Checklist Personalizado');
      
      const initialItems: Record<string, ChecklistItem> = {};
      
      if (dbItems && dbItems.length > 0) {
        dbItems.forEach(item => {
          initialItems[item.id] = { 
            id: item.id, 
            name: item.item_name, 
            status: 'PENDENTE' 
          };
        });
      } else {
        // Fallback if no custom items defined
        let template = checklistTemplates['bobcat_s540']; 
        if (vehicle.model.toLowerCase().includes('bobcat')) {
          template = checklistTemplates['bobcat_s540'];
        }
        template.items.forEach(item => {
          initialItems[item.id] = { ...item };
        });
        setTemplateName(template.name);
      }
      
      setChecklist(initialItems);
    } catch (err: any) {
      console.error("Erro ao verificar checklist existente:", err);
      setError("Erro ao conectar com o banco de dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoCapture = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const newFiles = [...photoFiles];
      newFiles[index] = file;
      setPhotoFiles(newFiles);
      
      const newPreviews = [...photoPreviews];
      newPreviews[index] = URL.createObjectURL(file);
      setPhotoPreviews(newPreviews);
    }
  };

  const removePhoto = (index: number) => {
    const newFiles = [...photoFiles];
    newFiles[index] = null;
    setPhotoFiles(newFiles);
    
    const newPreviews = [...photoPreviews];
    newPreviews[index] = null;
    setPhotoPreviews(newPreviews);
  };

  const toggleItemStatus = (itemId: string, status: 'OK' | 'NC') => {
    setChecklist(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status }
    }));
  };

  const handleSubmit = async (bypassSpeedCheck = false) => {
    // Validar se todos os itens foram checados
    const pendingItems = Object.values(checklist).filter(item => item.status === 'PENDENTE');
    if (pendingItems.length > 0) {
      setError(`Ainda faltam ${pendingItems.length} itens para verificar.`);
      window.scrollTo(0, 0);
      return;
    }

    const hasNC = Object.values(checklist).some(item => item.status === 'NC');
    if (hasNC) {
      if (!observations.trim()) {
        setError("Como há itens marcados como 'NÃO', é obrigatório relatar o problema no campo Observações.");
        window.scrollTo(0, 0);
        return;
      }
      
      const hasPhoto = photoFiles.some(file => file !== null);
      if (!hasPhoto) {
        setError("Como há itens marcados como 'NÃO', é obrigatório enviar pelo menos uma foto do problema.");
        window.scrollTo(0, 0);
        return;
      }
    }

    // Verificar se o checklist foi preenchido muito rápido (menos de 2 minutos = 120.000 ms)
    if (!bypassSpeedCheck && startTime) {
      const durationMs = Date.now() - new Date(startTime).getTime();
      if (durationMs < 120000) {
        setShowSpeedWarning(true);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 0. Capturar localização e dados do dispositivo
      let coordinates = 'Permissão Negada / Indisponível';
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => resolve(position),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 5000 }
            );
          });
          if (pos) {
            coordinates = `${pos.coords.latitude},${pos.coords.longitude}`;
          }
        } catch (e) {
          console.warn("Erro ao obter geolocalização:", e);
        }
      }

      let deviceModel = 'Dispositivo Móvel';
      const ua = navigator.userAgent;
      const uad = (navigator as any).userAgentData;
      if (uad && typeof uad.getHighEntropyValues === 'function') {
        try {
          const hints = await uad.getHighEntropyValues(['model', 'platform', 'platformVersion']);
          if (hints.model) {
            const platform = hints.platform || 'Android';
            const version = hints.platformVersion ? ` v${hints.platformVersion}` : '';
            deviceModel = `${platform}${version} (${hints.model})`;
          } else {
            deviceModel = hints.platform || 'Android';
          }
        } catch (e) {
          console.warn("Erro ao obter Client Hints:", e);
        }
      }

      if (deviceModel === 'Dispositivo Móvel' || deviceModel === 'Android' || deviceModel === 'Windows' || deviceModel === 'Mac OS') {
        if (/android/i.test(ua)) {
          const match = ua.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            const parts = match[1].split(';');
            const modelPart = parts.find(p => p.includes('Build/') || /samsung|motorola|lg|huawei|xiaomi|redmi|sm-|moto|pixel/i.test(p));
            if (modelPart) {
              deviceModel = `Android (${modelPart.replace(/Build\/.+/, '').trim()})`;
            } else {
              deviceModel = `Android (${parts[parts.length - 1].trim()})`;
            }
          } else {
            deviceModel = 'Android';
          }
        } else if (/iPhone/i.test(ua)) {
          const match = ua.match(/OS (\d+_\d+)/);
          const version = match ? match[1].replace('_', '.') : '';
          deviceModel = `iPhone (iOS ${version})`;
        } else if (/iPad/i.test(ua)) {
          deviceModel = 'iPad';
        } else if (/Windows/i.test(ua)) {
          deviceModel = 'Windows PC';
        } else if (/Macintosh/i.test(ua)) {
          deviceModel = 'Mac PC';
        }
      }

      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      const uploadedUrls: (string | null)[] = [null, null, null];

      // 1. Upload photos
      for (let i = 0; i < 3; i++) {
        const file = photoFiles[i];
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('checklist_photos')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Erro ao fazer upload da foto ${i + 1}: ` + uploadError.message);
          }

          if (uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('checklist_photos')
              .getPublicUrl(filePath);
            uploadedUrls[i] = publicUrlData.publicUrl;
          }
        }
      }

      // 2. Save checklist
      const { error: dbError } = await supabase
        .from('daily_checklists')
        .insert([{
          operator_name: operatorName,
          equipment_id: vehicle?.id,
          equipment_name: vehicle?.licensePlate ? `${vehicle?.model} - ${vehicle?.licensePlate}` : vehicle?.model,
          equipment_type: equipmentType,
          start_time: startTime,
          end_time: new Date().toISOString(),
          items: checklist,
          observations,
          situation,
          photo_url: uploadedUrls[0],
          photo_url_2: uploadedUrls[1],
          photo_url_3: uploadedUrls[2],
          device_info: deviceModel,
          location_info: coordinates
        }]);

      if (dbError) throw dbError;

      setIsSuccess(true);
      window.scrollTo(0, 0);

    } catch (err: any) {
      console.error("Erro ao enviar:", err);
      setError(err.message || "Ocorreu um erro ao enviar o checklist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Checklist Enviado!</h1>
          <p className="text-slate-600">Obrigado, {operatorName}. Seu checklist diário foi registrado com sucesso. Bom trabalho e segurança em primeiro lugar!</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Fazer Novo Checklist
            </button>
            <button 
              onClick={() => {
                window.close();
                setTimeout(() => window.location.href = 'about:blank', 300);
              }}
              className="w-full bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-bold py-3 px-4 rounded-xl transition-colors"
            >
              FECHAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingInitial) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  if (isInvalidLink) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-black text-slate-800">Link Inválido</h1>
          <p className="text-sm text-slate-600">Este link de acesso ao checklist é inválido ou está quebrado. Solicite um novo link ao administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="font-black text-lg">Check List Diário</h1>
          <div className="text-xs bg-slate-800 px-3 py-1 rounded-full font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            {operatorName}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!startTime ? (
          // Step 1: Select Equipment
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">
                Olá, <span className="text-rose-600 font-black uppercase tracking-tight">{operatorName}</span>
              </h2>
              <p className="text-sm text-slate-500">Selecione o equipamento que você vai operar hoje para iniciar o checklist de segurança.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Equipamento</label>
              {vehicles.length === 0 ? (
                 <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm font-medium border border-amber-200 text-center">
                   Você não possui nenhum equipamento vinculado no seu cadastro.
                 </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 pb-2">
                  {sortedVehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        selectedVehicleId === v.id 
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' 
                          : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                      }`}
                    >
                      <div>
                        <div className={`font-black uppercase tracking-tight ${selectedVehicleId === v.id ? 'text-emerald-800' : 'text-slate-700'}`}>
                          {getFormattedName(v.model)}
                        </div>
                        {v.licensePlate && (
                          <div className={`text-xs font-bold mt-1 ${selectedVehicleId === v.id ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {v.licensePlate}
                          </div>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                        selectedVehicleId === v.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                      }`}>
                        {selectedVehicleId === v.id && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleStartChecklist}
              disabled={!selectedVehicleId || vehicles.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all text-lg uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={24} className={!selectedVehicleId ? 'opacity-50' : ''} />
              Iniciar Checklist
            </button>
          </div>
        ) : (
          // Step 2: The Checklist
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">Equipamento</h2>
              <p className="text-lg font-bold text-slate-800">{vehicles.find(v => v.id === selectedVehicleId)?.model}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                <span className="bg-slate-100 px-2 py-1 rounded">Início: {new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm">ITENS DE VERIFICAÇÃO</h3>
                <div className="flex gap-4 text-[10px] font-black text-slate-400">
                  <span className="w-12 text-center text-emerald-600">OK</span>
                  <span className="w-12 text-center text-rose-500">NÃO</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {Object.values(checklist).map((item: any) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <span className={`text-sm font-medium ${item.status === 'PENDENTE' ? 'text-slate-700' : item.status === 'OK' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.name}
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleItemStatus(item.id, 'OK')}
                        className={`w-12 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                          item.status === 'OK' 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-inner' 
                            : 'bg-white border-slate-200 text-slate-300 hover:border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 size={20} strokeWidth={item.status === 'OK' ? 3 : 2} />
                      </button>
                      <button
                        onClick={() => toggleItemStatus(item.id, 'NC')}
                        className={`w-12 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                          item.status === 'NC' 
                            ? 'bg-rose-500 border-rose-500 text-white shadow-inner' 
                            : 'bg-white border-slate-200 text-slate-300 hover:border-rose-200'
                        }`}
                      >
                        <AlertCircle size={20} strokeWidth={item.status === 'NC' ? 3 : 2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações e Situação */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Observações / Não Conformidades</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Relatar aqui vazamentos e problemas de funcionamento, etc..."
                  className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:border-amber-500 focus:ring-0 outline-none transition-colors min-h-[100px] resize-y"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-2">Situação do Equipamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSituation('EQUIPAMENTO LIBERADO')}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      situation === 'EQUIPAMENTO LIBERADO'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'
                    }`}
                  >
                    LIBERADO
                  </button>
                  <button
                    onClick={() => setSituation('EQUIPAMENTO NÃO LIBERADO')}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      situation === 'EQUIPAMENTO NÃO LIBERADO'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-rose-200'
                    }`}
                  >
                    Manutenção Urgente
                  </button>
                </div>
              </div>
            </div>

            {/* Foto */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <label className="text-sm font-bold text-slate-700 block">
                Foto do Equipamento 
                <span className="text-xs text-slate-400 font-normal ml-2">(Envie até 3 fotos do problema)</span>
              </label>
              
              <div className="grid grid-cols-1 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    {!photoPreviews[index] ? (
                      <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-amber-400 transition-colors">
                        <Camera size={32} className="mb-2 text-slate-400" />
                        <span className="text-sm font-medium">Tirar ou anexar foto {index + 1}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          className="hidden" 
                          onChange={(e) => handlePhotoCapture(index, e)} 
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 h-48 bg-slate-100 flex items-center justify-center">
                        <img src={photoPreviews[index] as string} alt={`Preview ${index + 1}`} className="w-full h-full object-contain" />
                        <button 
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-rose-500/90 text-white p-2 rounded-lg backdrop-blur-sm hover:bg-rose-600 shadow-sm transition-colors"
                        >
                          <span className="text-xs font-bold flex items-center gap-1"><X size={14} /> Remover</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 text-lg disabled:opacity-70 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Enviando...
                </>
              ) : (
                <>
                  <Save size={24} />
                  Finalizar e Enviar
                </>
              )}
            </button>
          </div>
        )}

      </main>

      {/* Modal de Aviso de Velocidade */}
      {showSpeedWarning && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-rose-500 transform animate-in zoom-in duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600 shrink-0">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-rose-600 font-black text-lg leading-tight">Você preencheu muito rápido!</h3>
                <p className="text-sm text-slate-700 font-bold mt-1 leading-normal">Tem certeza que todos os itens foram verificados?</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              O preenchimento do checklist deve ser feito com calma e atenção, inspecionando cada item fisicamente no equipamento para garantir a segurança da operação.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setShowSpeedWarning(false);
                  handleSubmit(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Sim
              </button>
              <button 
                onClick={() => setShowSpeedWarning(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
              >
                Refazer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
