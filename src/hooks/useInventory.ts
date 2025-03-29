import { useState, useEffect, useCallback } from 'react';
import { RawMaterial, StockAlert } from '../types';
import { checkStockAlerts } from '../utils/stockMonitoring';
import { makeApiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export const useInventory = () => {
  const [inventory, setInventory] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeApiRequest({
        operation: "GetAllStocks",
        username: user.username
      });

      const materials: RawMaterial[] = response.map((item: any) => ({
        id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        cost: item.cost_per_unit,
        available: item.quantity,
        minStockLimit: item.stock_limit,
        defectiveQuantity: item.defective
      }));

      setInventory(materials);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to fetch inventory data');
    } finally {
      setIsLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const updateStock = async (materialId: string, quantityToAdd: number) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "AddStockQuantity",
        name: material.name,
        quantity_to_add: quantityToAdd,
        username: user.username
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update stock');
    }
  };

  const subtractStock = async (materialId: string, quantityToSubtract: number) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "SubtractStockQuantity",
        name: material.name,
        quantity_to_subtract: quantityToSubtract,
        username: user.username
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to subtract stock');
    }
  };

  const deleteStock = async (materialId: string) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "DeleteStock",
        name: material.name,
        username: user.username
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to delete stock');
    }
  };

  const updateDefective = async (materialId: string, defectiveToAdd: number) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "AddDefectiveGoods",
        name: material.name,
        defective_to_add: defectiveToAdd,
        username: user.username
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update defective quantity');
    }
  };

  const subtractDefective = async (materialId: string, defectiveToSubtract: number) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "SubtractDefectiveGoods",
        name: material.name,
        defective_to_subtract: defectiveToSubtract,
        username: user.username
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to subtract defective quantity');
    }
  };

  const updateMaterialDetails = async (materialId: string, updates: {
    unit?: string;
    cost?: number;
    defective?: number;
  }) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "UpdateStock",
        name: material.name,
        quantity: material.quantity,
        defective: updates.defective ?? material.defectiveQuantity,
        cost_per_unit: updates.cost ?? material.cost,
        stock_limit: material.minStockLimit,
        username: user.username,
        unit: updates.unit ?? material.unit
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update material details');
    }
  };

  const updateStockLimit = async (materialId: string, limit: number) => {
    try {
      const material = inventory.find(m => m.id === materialId);
      if (!material) return;

      await makeApiRequest({
        operation: "UpdateStock",
        name: material.name,
        quantity: material.quantity,
        defective: material.defectiveQuantity,
        cost_per_unit: material.cost,
        stock_limit: limit,
        username: user.username,
        unit: material.unit
      });

      await fetchInventory();
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to update stock limit');
    }
  };

  const addMaterial = async (material: RawMaterial) => {
    try {
      const response = await makeApiRequest({
        operation: "CreateStock",
        name: material.name,
        quantity: material.available,
        defective: material.defectiveQuantity || 0,
        cost_per_unit: material.cost,
        stock_limit: material.minStockLimit || 0,
        username: user.username,
        unit: material.unit
      });

      if (response) {
        await fetchInventory();
      }
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Failed to add material');
    }
  };

  const stockAlerts = checkStockAlerts(inventory);

  return {
    inventory,
    stockAlerts,
    isLoading,
    error,
    updateStock,
    subtractStock,
    updateStockLimit,
    updateDefective,
    subtractDefective,
    updateMaterialDetails,
    deleteStock,
    addMaterial,
    refreshInventory: fetchInventory
  };
};