
export interface CustomerInteraction {
  id: string;
  date: string;
  text: string;
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
  type: string;
  model: string;
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
  dueDate?: string;
  status: 'Pendente' | 'Pago';
  bankAccountId?: string;
  paymentDate?: string;
  amountPaid?: number;
  interestAmount?: number;
  receiptUrl?: string;
  paymentReceiptUrl?: string;
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

export type View = 'dashboard' | 'customers' | 'vendors' | 'sales' | 'expenses' | 'payables' | 'receivables' | 'accountPlan' | 'banks' | 'transfers' | 'reports' | 'fleet' | 'settings';

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
