export interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  available: number;
  minStockLimit?: number;
  defectiveQuantity: number;
}

export interface ProductMaterial {
  materialName: string;
  quantity: number;
}

export interface ProductionCostBreakdown {
  [key: string]: number;
}

export interface Product {
  id: string;
  name: string;
  inventory: number;
  maxProduce: number;
  originalMaxProduce: number;
  productionCostTotal: number;
  productionCostBreakdown: ProductionCostBreakdown;
  stockNeeded: { [key: string]: number };
  createdAt: string;
  materials: ProductMaterial[];
}

export interface StockAlert {
  materialId: string;
  materialName: string;
  available: number;
  minStockLimit: number;
}

export interface ProductionSummary {
  productId: string;
  name: string;
  possibleUnits: number;
  limitingMaterials: string[];
}

export interface Report {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  data: {
    totalProduction: number;
    totalDefective: number;
    materialUsage: Array<{
      materialId: string;
      materialName: string;
      quantity: number;
      defective: number;
    }>;
    revenue: number;
  };
}

export interface ProductionResponse {
  message: string;
  push_id: string;
  product_id: string;
  quantity_produced: number;
  production_cost_per_unit: number;
  total_production_cost: number;
}

export interface StockSummary {
  opening_stock_qty: number;
  opening_stock_amount: number;
  consumption_qty: number;
  consumption_amount: number;
  closing_stock_qty: number;
  closing_stock_amount: number;
}

export interface TransactionDetails {
  new_total?: number;
  quantity_subtracted?: number;
  item_id: string;
  username: string;
  new_defective?: number;
  defective_added?: number;
  available_quantity?: number;
  quantity?: number;
  total_cost?: number;
  cost_per_unit?: number;
  defective?: number;
  stock_limit?: number;
}

export interface Transaction {
  operation_type: string;
  transaction_id: string;
  date: string;
  details: TransactionDetails;
  timestamp: string;
}

export interface DailyReportData {
  report_date: string;
  stock_summary: StockSummary;
  transactions_by_operation: {
    [key: string]: Transaction[];
  };
}

export interface WeeklyReportData {
  report_period: {
    start_date: string;
    end_date: string;
  };
  overall_stock_summary: StockSummary;
  daily_report: {
    [date: string]: {
      stock_summary: StockSummary;
      transactions: Transaction[];
    };
  };
}

export interface MonthlyReportData {
  report_period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
  };
  overall_stock_summary: StockSummary;
  daily_report: {
    [date: string]: {
      stock_summary: StockSummary;
      transactions: Transaction[];
    };
  };
}

export const OPERATION_TYPES = [
  'All Operations',
  'CreateStock',
  'SubtractStockQuantity',
  'AddStockQuantity',
  'AddDefectiveGoods',
  'PushToProduction',
  'SaveOpeningStock',
  'SaveClosingStock',
  'CreateProduct',
  'UpdateStock'
] as const;

export type OperationType = typeof OPERATION_TYPES[number];

export const SORT_FIELDS = [
  { value: 'timestamp', label: 'Sort by Time' },
  { value: 'operation_type', label: 'Sort by Operation' },
  { value: 'item_id', label: 'Sort by Item ID' },
  { value: 'username', label: 'Sort by Username' }
] as const;

export type SortField = 'name' | 'available' | 'defective' | 'cost' | 'totalCost' | 'stockLimit';
export type SortDirection = 'asc' | 'desc';