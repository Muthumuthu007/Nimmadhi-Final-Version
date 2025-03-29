import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '../types';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => void;
  clearProducts: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

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
    <ProductContext.Provider value={{ products, addProduct, clearProducts }}>
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