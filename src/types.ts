export interface RawMaterial {
  id: string;
  name: string;
  available: number;
  defectiveQuantity?: number;
  unit: string;
  cost: number;
  minStockLimit?: number;
  created_at: string;
  inventory?: number;
  max_produce?: number;
  product_name?: string;
  production_cost?: number;
  production_cost_total?: number;
  original_max_produce?: number;
  username?: string;
  product_id?: string;
} 