import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '../types';
import { makeApiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => void;
  clearProducts: () => void;
  fetchProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const { user } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!user || !user.username) return;
    const payload = {
      operation: 'GetAllProducts',
      username: user.username
    };
    console.log('Payload for GetAllProducts:', payload);
    try {
      const response = await makeApiRequest(payload);
      console.log('Fetched products response:', response);
      if (response) {
        const updatedProducts = response.map((product: any) => {
          // Map stock_details to stockNeeded and groupChain
          const stockNeeded: Record<string, number> = {};
          const groupChain: Record<string, string[]> = {};
          if (Array.isArray(product.stock_details)) {
            product.stock_details.forEach((item: any) => {
              stockNeeded[item.item_id] = item.required_qty;
              groupChain[item.item_id] = item.group_chain || [];
            });
          }
          return {
            id: product.product_id,
            name: product.product_name,
            maxProduce: product.max_produce,
            originalMaxProduce: product.original_max_produce,
            productionCostTotal: product.production_cost_total,
            productionCostBreakdown: product.production_cost_breakdown,
            stockNeeded,
            createdAt: product.created_at,
            materials: Array.isArray(product.stock_details)
              ? product.stock_details.map((item: any) => ({
                  materialName: item.item_id,
                  quantity: item.required_qty
                }))
              : [],
            wastage: product.wastage_percent || 0,
            wastageAmount: product.wastage_amount || 0,
            laborCost: product.labour_cost || 0,
            totalCost: product.total_cost || 0,
            groupChain,
            transportCost: product.transport_cost ?? 0,
            otherCost: product.other_cost ?? 0
          };
        });
        setProducts(updatedProducts);
      }
    } catch (error) {
      // Optionally handle error
    }
  }, [user?.username]);

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => {
      // Check if product already exists
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        // Update existing product
        return prev.map(p => p.id === product.id ? product : p);
      }
      // Add new product
      return [...prev, product];
    });
  }, []);

  const clearProducts = useCallback(() => {
    setProducts([]);
  }, []);

  return (
    <ProductContext.Provider value={{ products, addProduct, clearProducts, fetchProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};