import { ChecklistItem } from '../types';

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export const checklistTemplates: Record<string, ChecklistTemplate> = {
  bobcat_s540: {
    id: 'bobcat_s540',
    name: 'MINI CARREGADEIRA BOBCAT S540 IT4-M020',
    items: [
      { id: 'oleo_motor', name: 'Óleo do motor', status: 'PENDENTE' },
      { id: 'oleo_hidraulico', name: 'Óleo hidráulico', status: 'PENDENTE' },
      { id: 'agua_radiador', name: 'Água / radiador', status: 'PENDENTE' },
      { id: 'vazamentos', name: 'Vazamentos', status: 'PENDENTE' },
      { id: 'pneus', name: 'Pneus', status: 'PENDENTE' },
      { id: 'mangueiras_hidraulicas', name: 'Mangueiras hidráulicas', status: 'PENDENTE' },
      { id: 'freios', name: 'Freios', status: 'PENDENTE' },
      { id: 'buzina', name: 'Buzina', status: 'PENDENTE' },
      { id: 'alarme_re', name: 'Alarme de ré', status: 'PENDENTE' },
      { id: 'luzes', name: 'Luzes', status: 'PENDENTE' },
      { id: 'cinto_seguranca', name: 'Cinto de segurança', status: 'PENDENTE' },
      { id: 'extintor_valido', name: 'Extintor válido', status: 'PENDENTE' },
      { id: 'funcionamento_geral', name: 'Funcionamento geral da máquina', status: 'PENDENTE' }
    ]
  }
};
