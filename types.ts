
export interface CustomerInteraction {
  id: string;
  date: string;
  text: string;
}

export interface FinancialYield {
  id: string;
  accountPlanId: string | null;
  bankAccountId: string | null;
  amount: number;
  date: string;
  description: string;
  createdAt: number;
}

export interface CorporateCard {
  id: string;
  name: string;
  dueDay: number;
  createdAt: number;
}

export interface CorporateCardPayment {
  id: string;
  cardId: string;
  date: string;
  amount: number;
  bankAccountId: string;
  description?: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  personType: 'PF' | 'PJ';
  document: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  isActive?: boolean;
  interactions?: CustomerInteraction[];
  createdAt: number;
}

export interface VendorCategory {
  id: string;
  name: string;
}

export interface Vendor {
  id: string;
  name: string;
  personType: 'PF' | 'PJ';
  categoryId?: string | null; // Vínculo com a nova categoria
  document: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes?: string;
  isActive?: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface AccountCategory {
  id: string;
  type: 'Receita' | 'Despesa';
  name: string;
  accountNumber?: string;
}

export interface AccountSubcategory {
  id: string;
  categoryId: string;
  name: string;
  accountNumber?: string;
}

export interface AccountPlan {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  subcategory: string;
  description: string;
  accountNumber?: string;
  mostrarDre?: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  initialBalance: number;
  isBlocked?: boolean;
}

// --- Fleet Interfaces ---
export interface MaintenanceIntervals {
  oilChange: number;
  dieselFilter: number;
  oilFilter: number;
  internalAirFilter: number;
  externalAirFilter: number;
  bleedDieselFilter: number;
  others: number;
}

export interface Equipment {
  id: string;
  vehicleId: string;
  intervals: MaintenanceIntervals;
  observations?: string;
  createdAt: number;
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  date: string;
  nfNumber?: string;
  performedItems: (keyof MaintenanceIntervals)[];
  observations: string;
  receiptUrl?: string;
  createdAt: number;
}

export interface CompanyVehicle {
  id: string;
  licensePlate: string;
  type: string;
  model: string;
  year: string;
  description: string;
  documentUrl?: string;
  status: 'Ativo' | 'Vendido';
  createdAt: number;
}

export interface SaleItem {
  id: string;
  description: string;
  value: number;
}

export interface ExpenseItem {
  id: string;
  description: string;
  value: number;
}

export interface ExpenseInstallment {
  id: string;
  number: number;
  dueDate: string;
  value: number;
  status: 'Pendente' | 'Pago';
}

export interface SaleInstallment {
  id: string;
  number: number;
  dueDate: string;
  value: number;
  status: 'Pendente' | 'Parcial' | 'Pago';
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  accountPlanId: string;
  items: SaleItem[];
  totalValue: number;
  deductions?: number;
  date: string;
  nfNumber: string;
  isNoNf?: boolean;
  saleType: 'Serviço' | 'Locação';
  paymentMethod: string;
  paymentCondition: 'A Vista' | 'A Prazo';
  installments: number;
  installmentsList?: SaleInstallment[];
  dueDate?: string;
  status: 'Pendente' | 'Parcial' | 'Pago';
  observations?: string;
  receiptUrl?: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  vendorId: string;
  vendorName: string;
  accountPlanId: string;
  items: ExpenseItem[];
  totalValue: number;
  date: string;
  docNumber: string;
  isNoDoc?: boolean;
  paymentMethod: string;
  paymentCondition: 'A Vista' | 'A Prazo';
  installments?: number;
  installmentsList?: ExpenseInstallment[];
  dueDate?: string;
  status: 'Pendente' | 'Pago';
  bankAccountId?: string;
  paymentDate?: string;
  amountPaid?: number;
  interestAmount?: number;
  invoiceTotalValue?: number;
  receiptUrl?: string;
  paymentReceiptUrl?: string;
  paymentObservations?: string;
  bankTransId?: string;
  cardId?: string;
  createdAt: number;
}

export interface Payment {
  id: string;
  saleId: string;
  installmentId?: string;
  bankAccountId: string;
  amount: number;
  fee?: number;
  date: string;
  method: string;
  receiptUrl?: string; // Comprovante de Recebimento
  bankTransId?: string;
  createdAt: number;
}

export interface BankTransfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string;
  createdAt: number;
}

export interface BankStatementItem {
  id: string; // Internal temporary ID
  date: string;
  type: 'Entrada' | 'Saída';
  description: string;
  value: number;
  originalId?: string; // FITID from OFX or Identificador from CSV
  accountPlanId?: string; // Selected by user during validation
  contactId?: string; // Selected by user during validation (Vendor/Customer)
  isDuplicate?: boolean; // True if originalId already exists in DB
  isValidated?: boolean; // User confirmed for import
}

export interface CTR {
  id: string;
  ctrNumber: string;
  emittedAt: string;
  clientId: string;
  clientName: string;
  attachmentUrl?: string;
  observations?: string;
  createdAt: number;
}

export interface OrcamentoItem {
  id: string;
  description: string;
  value: number;
}

export interface CampoExtra {
  id: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
}

export interface Orcamento {
  id: string;
  numero: number;
  nome: string;
  cpfCnpj?: string;
  endereco?: string;
  dadosComplementares?: string;
  items: OrcamentoItem[];
  formaPagamento: string;
  condicaoPagamento: string;
  inicioServicos: string;
  informacoesComplementares?: string[];
  camposExtras?: CampoExtra[];
  dataEmissao: string;
  status: 'Aguardando Cliente' | 'Efetivado' | 'Não concluído';
  efetivadoInfo?: string;
  ocultarTotal?: boolean;
  responsavelClienteNome?: string;
  responsavelClienteCpf?: string;
  createdAt: number;
}

export interface SimplesNacionalFaturamento {
  id: string;
  anoMes: string; // "2025-04"
  valor: number;
  origem: 'manual' | 'automatico';
  createdAt: number;
}

export interface ConfiguracaoEmpresa {
    id: string;
    nome_fantasia: string;
    razao_social?: string;
    cnpj?: string;
    inscricao_municipal?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
    logo_url?: string;
    responsavel_nome?: string;
    responsavel_assinatura_digital?: string;
    assinatura_tipo?: 'digital' | 'imagem';
    assinatura_url?: string;
    updated_at?: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
  status: 'OK' | 'NC' | 'PENDENTE';
}

export interface VehicleChecklistItem {
  id: string;
  vehicle_id: string;
  item_name: string;
  created_at: string;
}

export interface DailyChecklist {
  id: string;
  operator_name: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  start_time: string;
  end_time?: string;
  items: Record<string, ChecklistItem>;
  observations?: string;
  situation?: string;
  photo_url?: string;
  photo_url_2?: string;
  photo_url_3?: string;
  device_info?: string;
  created_at: string;
}

export type View = 'dashboard' | 'customers' | 'vendors' | 'sales' | 'expenses' | 'payables' | 'receivables' | 'accountPlan' | 'banks' | 'transfers' | 'yields' | 'reports' | 'fleet' | 'company-vehicles' | 'settings' | 'agenda' | 'nf-import' | 'bank-statements' | 'corporate-cards' | 'ctr' | 'orcamentos' | 'company-settings' | 'simples-nacional' | 'employees' | 'employee-loans' | 'company-loans' | 'work-orders' | 'checklist' | 'checklist-manager';

export interface AdminUser {
  id: string;
  username: string;
  password?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalReceived: number;
  totalPending: number;
  totalExpenses: number;
  totalPaidExpenses: number;
  customerCount: number;
}

export interface AgendaItem {
  id: string;
  scheduledDate: string;
  title: string;
  description: string;
  category: 'Urgente' | 'Lembrete';
  completed: boolean;
  createdAt: number;
}

export interface FuncionarioDocumento {
  id: string;
  funcionarioId: string;
  nome: string;
  arquivoUrl: string;
  createdAt: number;
}

export interface Funcionario {
  id: string;
  nomeCompleto: string;
  whatsapp?: string;
  dataRegistro: string;
  funcao: string;
  salarioBruto: number;
  diferencaPf: number;
  observacao?: string;
  isOperator?: boolean;
  linkedVehicles?: string[];
  documentos?: FuncionarioDocumento[];
  createdAt: number;
}

export interface EmprestimoParcela {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
  status: 'Pendente' | 'Pago';
  valorPago: number;
  dataPagamento?: string;
  tipoBaixa?: 'Banco' | 'Desconto Salário';
  bancoId?: string;
}

export interface EmprestimoFuncionario {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  dataEmprestimo: string;
  valorEmprestimo: number;
  bancoSaidaId?: string;
  accountPlanId?: string;
  descricao?: string;
  qtdParcelas: number;
  parcelas: EmprestimoParcela[];
  createdAt: string;
}

export interface CompanyLoanParcela {
  id: string;
  numero: number;
  vencimento: string;
  valor: number;
  status: 'Pendente' | 'Pago';
  valorPago: number;
  dataPagamento?: string;
  bancoDebitoId?: string;
  juros?: number;
  accountPlanId?: string;
  descricao?: string;
}

export interface CompanyLoan {
  id: string;
  nomeEmprestimo: string;
  valorEmprestado: number;
  totalTaxasContrato: number;
  dataEmprestimo: string;
  descricao?: string;
  bancoCreditoId: string;
  qtdParcelas: number;
  parcelas: CompanyLoanParcela[];
  createdAt: string;
}

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  date: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costCenter?: string;
  unitType?: string;
  observations?: string;
  createdAt: number;
}

export interface WorkOrder {
  id: string;
  type: 'Locação' | 'Serviço';
  customerId: string;
  customerName: string;
  status: 'Aberto' | 'Finalizado';
  startDate: string;
  createdAt: number;
}

export interface RentalEquipment {
  id: string;
  workOrderId?: string;
  customerId?: string;
  name: string;
  defaultPrice: number;
  createdAt: number;
}
