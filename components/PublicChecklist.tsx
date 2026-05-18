import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CompanyVehicle, DailyChecklist, ChecklistItem } from '../types';
import { checklistTemplates, ChecklistTemplate } from '../lib/checklistTemplates';
import { Camera, CheckCircle2, AlertCircle, Save, Loader2, Image as ImageIcon } from 'lucide-react';

export default function PublicChecklist() {
  const [operatorName, setOperatorName] = useState<string>('');
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  
  const [startTime, setStartTime] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>({});
  const [templateName, setTemplateName] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('');
  
  const [observations, setObservations] = useState('');
  const [situation, setSituation] = useState<'EQUIPAMENTO LIBERADO' | 'EQUIPAMENTO NÃO LIBERADO'>('EQUIPAMENTO LIBERADO');
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvalidLink, setIsInvalidLink] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

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

      // Mapeamento super simples: Se tiver 'bobcat' no modelo, usa o template bobcat
      let template: ChecklistTemplate;
      if (vehicle.model.toLowerCase().includes('bobcat')) {
        template = checklistTemplates['bobcat_s540'];
      } else {
        // Fallback
        template = checklistTemplates['bobcat_s540']; 
      }

      setTemplateName(template.name);
      
      const initialItems: Record<string, ChecklistItem> = {};
      template.items.forEach(item => {
        initialItems[item.id] = { ...item };
      });
      setChecklist(initialItems);
    } catch (err: any) {
      console.error("Erro ao verificar checklist existente:", err);
      setError("Erro ao conectar com o banco de dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleItemStatus = (itemId: string, status: 'OK' | 'NC') => {
    setChecklist(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status }
    }));
  };

  const handleSubmit = async () => {
    // Validar se todos os itens foram checados
    const pendingItems = Object.values(checklist).filter(item => item.status === 'PENDENTE');
    if (pendingItems.length > 0) {
      setError(`Ainda faltam ${pendingItems.length} itens para verificar.`);
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      let uploadedPhotoUrl = null;

      // 1. Upload photo if exists
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('checklist_photos')
          .upload(filePath, photoFile);

        if (uploadError) {
          throw new Error("Erro ao fazer upload da foto: " + uploadError.message);
        }

        if (uploadData) {
           const { data: publicUrlData } = supabase.storage
            .from('checklist_photos')
            .getPublicUrl(filePath);
          uploadedPhotoUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Save checklist
      const { error: dbError } = await supabase
        .from('daily_checklists')
        .insert([{
          operator_name: operatorName,
          equipment_id: vehicle?.id,
          equipment_name: `${vehicle?.model} - ${vehicle?.licensePlate}`,
          equipment_type: equipmentType,
          start_time: startTime,
          end_time: new Date().toISOString(),
          items: checklist,
          observations,
          situation,
          photo_url: uploadedPhotoUrl
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
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
          >
            Fazer Novo Checklist
          </button>
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
          <h1 className="font-black text-lg">Checklist Operacional</h1>
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
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:border-amber-500 focus:ring-0 outline-none transition-colors"
                >
                  <option value="">Selecione...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.model} {v.licensePlate ? `(${v.licensePlate})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleStartChecklist}
              disabled={!selectedVehicleId || vehicles.length === 0}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-4 rounded-xl shadow-md transition-colors text-lg"
            >
              Iniciar Checklist
            </button>
          </div>
        ) : (
          // Step 2: The Checklist
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-1">Equipamento</h2>
              <p className="text-lg font-bold text-slate-800">{templateName}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                <span className="bg-slate-100 px-2 py-1 rounded">Início: {new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-sm">ITENS DE VERIFICAÇÃO</h3>
                <div className="flex gap-4 text-[10px] font-black text-slate-400">
                  <span className="w-12 text-center text-emerald-600">OK</span>
                  <span className="w-12 text-center text-rose-500">NC</span>
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
                  placeholder="Relate aqui vazamentos, pneus carecas, luzes queimadas, etc..."
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
                    NÃO LIBERADO
                  </button>
                </div>
              </div>
            </div>

            {/* Foto */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <label className="text-sm font-bold text-slate-700 block">Foto do Equipamento (Opcional)</label>
              
              {!photoPreview ? (
                <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-amber-400 transition-colors">
                  <Camera size={32} className="mb-2 text-slate-400" />
                  <span className="text-sm font-medium">Tirar ou anexar foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    onChange={handlePhotoCapture} 
                  />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-slate-200">
                  <img src={photoPreview} alt="Preview" className="w-full h-auto object-cover" />
                  <button 
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-lg backdrop-blur-sm hover:bg-black/80"
                  >
                    <span className="text-xs font-bold">Trocar Foto</span>
                  </button>
                </div>
              )}
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
    </div>
  );
}
