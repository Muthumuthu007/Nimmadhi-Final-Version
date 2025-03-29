import { useState, useCallback } from 'react';
import { Product } from '../types';
import { products as initialProducts } from '../data/products';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const addProduct = useCallback((product: Product) => {
    setProducts(prevProducts => [...prevProducts, product]);
  }, []);

  return {
    products,
    addProduct,
    setProducts
  };
};