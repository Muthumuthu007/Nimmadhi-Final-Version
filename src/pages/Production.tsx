import React, { useState, useEffect } from 'react';
import { ProductionForm } from '../components/ProductionForm';
import { ProductionSummaryView } from '../components/ProductionSummary';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { useProducts } from '../hooks/useProducts';
import { useInventory } from '../hooks/useInventory';
import { Package2, TrendingUp, RefreshCw, Loader2, Search, Trash2, AlertCircle, ArrowUpDown } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const Production = () => {
  const { products, setProducts } = useProducts();
  const { refreshInventory } = useInventory();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await axios.post(
        'https://ifvzhoki3bl6rrlan37o7ubrmi0enjhf.lambda-url.us-east-2.on.aws/',
        {
          operation: "GetAllProducts",
          username: user.username
        }
      );

      if (response.data) {
        const updatedProducts = response.data.map((product: any) => ({
          id: product.product_id,
          name: product.product_name,
          maxProduce: product.max_produce,
          originalMaxProduce: product.original_max_produce,
          productionCostTotal: product.production_cost_total,
          productionCostBreakdown: product.production_cost_breakdown,
          stockNeeded: product.stock_needed,
          createdAt: product.created_at,
          materials: Object.entries(product.stock_needed).map(([name, quantity]) => ({
            materialName: name,
            quantity: quantity as number
          }))
        }));

        setProducts(updatedProducts);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to fetch products');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchProducts();
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccessMessage(null);
    await fetchProducts();
    setIsRefreshing(false);
  };

  const handleProductionComplete = async () => {
    await refreshInventory();
    await fetchProducts();
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    
    setIsDeletingProduct(productToDelete);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post(
        'https://ifvzhoki3bl6rrlan37o7ubrmi0enjhf.lambda-url.us-east-2.on.aws/',
        {
          operation: "DeleteProduct",
          product_id: productToDelete,
          username: user.username
        }
      );

      if (response.data && response.data.message && response.data.message.includes('deleted successfully')) {
        setSuccessMessage(`Product deleted successfully`);
        setProducts(prevProducts => prevProducts.filter(product => product.id !== productToDelete));
      } else {
        setError(response.data.message || 'Failed to delete product. Please try again.');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to delete product. Please try again.');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsDeletingProduct(null);
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'maxProduce':
        comparison = a.maxProduce - b.maxProduce;
        break;
      case 'cost':
        comparison = a.productionCostTotal - b.productionCostTotal;
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Production Management</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors ${
            isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5 mr-2" />
          )}
          {isRefreshing ? 'Refreshing...' : 'Refresh Products'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search products by name or ID..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={sortField}
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="name">Product Name</option>
              <option value="maxProduce">Max Produce</option>
              <option value="cost">Production Cost</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Package2 className="h-5 w-5 mr-2 text-indigo-600" />
              Available Products
            </h2>
            <div className="space-y-6">
              {sortedProducts.map(product => (
                <div 
                  key={product.id}
                  className="border rounded-lg p-4 hover:border-indigo-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{product.name}</h3>
                      <p className="text-gray-500 text-sm">ID: {product.id}</p>
                      <p className="text-gray-500 text-sm">Created: {format(new Date(product.createdAt), 'PPp')}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Production Cost</div>
                        <div className="text-lg font-semibold text-indigo-600">
                          ₹{product.productionCostTotal.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteClick(product.id)}
                        disabled={isDeletingProduct === product.id}
                        className={`text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors ${
                          isDeletingProduct === product.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Delete Product"
                      >
                        {isDeletingProduct === product.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">Production Status</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Max Produce:</span>
                          <span className="font-medium">{product.maxProduce} units</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Original Max:</span>
                          <span className="font-medium">{product.originalMaxProduce} units</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">Materials Required</div>
                      <div className="text-sm space-y-1">
                        {Object.entries(product.stockNeeded).map(([material, quantity]) => (
                          <div key={material} className="flex justify-between">
                            <span>{material}:</span>
                            <span className="font-medium">{quantity} units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Production Cost Breakdown</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(product.productionCostBreakdown).map(([material, cost]) => (
                        <div key={material} className="flex justify-between">
                          <span>{material}:</span>
                          <span className="font-medium">₹{cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {sortedProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No products match your search' : 'No products available'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <ProductionForm 
            products={products}
            onProductionComplete={handleProductionComplete}
          />
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        isDeleting={Boolean(isDeletingProduct)}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setProductToDelete(null);
        }}
      />
    </div>
  );
};

export default Production;