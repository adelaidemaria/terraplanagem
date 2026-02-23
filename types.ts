
export interface Customer {
  id: string;
  name: string;
  personType: 'PF' | 'PJ';
  document: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
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
  categoryId: string; // Vínculo com a nova categoria
  document: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface AccountPlan {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  subcategory: string;
  description: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  initialBalance: number;
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
  isNoNF?: boolean;
  saleType: 'Serviço' | 'Locação';
  paymentMethod: string;
  paymentCondition: 'A Vista' | 'A Prazo';
  installments: number;
  dueDate?: string;
  status: 'Pendente' | 'Parcial' | 'Pago';
  observations?: string;
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
  paymentMethod: string;
  paymentCondition: 'A Vista' | 'A Prazo';
  dueDate?: string;
  status: 'Pendente' | 'Pago';
  bankAccountId?: string;
  paymentDate?: string;
  createdAt: number;
}

export interface Payment {
  id: string;
  saleId: string;
  bankAccountId: string;
  amount: number;
  fee?: number;
  date: string;
  method: string;
  createdAt: number;
}

export type View = 'dashboard' | 'customers' | 'vendors' | 'sales' | 'expenses' | 'receivables' | 'accountPlan' | 'banks' | 'reports' | 'fleet' | 'settings';

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
