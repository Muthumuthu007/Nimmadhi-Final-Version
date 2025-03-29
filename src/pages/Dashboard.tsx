import React, { useState, useEffect } from 'react';
import { Package2, Bed, AlertTriangle, TrendingUp, Search, RefreshCw, Loader2, Filter } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ProductCard } from '../components/dashboard/ProductCard';
import { ProductDetailsModal } from '../components/dashboard/ProductDetailsModal';
import { useInventory } from '../hooks/useInventory';
import { format } from 'date-fns';
import { Product } from '../types';
import { makeApiRequest } from '../utils/api';

const Dashboard = () => {
  const { inventory, stockAlerts } = useInventory();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('name');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await makeApiRequest({
        operation: "GetAllProducts",
        username: "john_doe"
      });

      if (response) {
        const updatedProducts = response.map((product: any) => ({
          id: product.product_id,
          name: product.product_name,
          inventory: product.inventory,
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
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    await fetchProducts();
    setIsRefreshing(false);
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'inventory':
        return b.inventory - a.inventory;
      case 'maxProduce':
        return b.maxProduce - a.maxProduce;
      case 'cost':
        return b.productionCostTotal - a.productionCostTotal;
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const stats = [
    {
      title: 'Total Products',
      value: products.length,
      icon: Bed,
    },
    {
      title: 'Low Stock Items',
      value: stockAlerts.length,
      icon: AlertTriangle,
    },
    {
      title: 'Total Raw Materials',
      value: inventory.length,
      icon: Package2,
    },
  ];

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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-300 transition-colors ${
            isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5 mr-2" />
          )}
          {isRefreshing ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Product Catalog</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <label htmlFor="sort-options" className="sr-only">Sort products by</label>
              <select
                id="sort-options"
                className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label="Sort products by"
              >
                <option value="name">Sort by Name</option>
                <option value="inventory">Sort by Inventory</option>
                <option value="maxProduce">Sort by Max Produce</option>
                <option value="cost">Sort by Cost</option>
                <option value="date">Sort by Date</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map(product => (
            <div 
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">ID: {product.id}</p>
                    <p className="text-sm text-gray-500">Created: {format(new Date(product.createdAt), 'PPp')}</p>
                  </div>
                  <div className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {product.maxProduce > 0 ? 'Available' : 'Out of Stock'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Inventory</p>
                    <p className="text-lg font-semibold">{(product.inventory || 0).toLocaleString()} units</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Max Produce</p>
                    <p className="text-lg font-semibold">{(product.maxProduce || 0).toLocaleString()} units</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-700">Production Cost</p>
                    <p className="text-lg font-bold text-indigo-600">₹{(product.productionCostTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-1 rounded-full" 
                      style={{ width: `${Math.min(100, (product.productionCostTotal / 1000) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Materials Required</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-2">
                    {Object.entries(product.stockNeeded).map(([material, quantity]) => (
                      <div key={material} className="flex justify-between text-sm">
                        <span className="text-gray-600">{material}</span>
                        <span className="font-medium">{quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Created {format(new Date(product.createdAt), 'MMM d, yyyy - h:mm a')}
                </div>
                <button 
                  onClick={() => setSelectedProduct(product)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}

          {sortedProducts.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
              <Bed className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search query' : 'Add some products to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;