import React, { useState, useRef, useEffect } from 'react';
import { Product, RawMaterial } from '../types';
import { makeApiRequest } from '../utils/api';
import { AlertCircle, CheckCircle, Search, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NewProductFormProps {
  inventory: RawMaterial[];
  onAddProduct: (product: Product) => void;
  onClose: () => void;
}

export const NewProductForm: React.FC<NewProductFormProps> = ({
  inventory,
  onAddProduct,
  onClose
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    materials: [] as Array<{ materialName: string; quantity: number }>
  });
  
  // State for each material dropdown
  const [materialSearches, setMaterialSearches] = useState<string[]>([]);
  const [dropdownStates, setDropdownStates] = useState<boolean[]>([]);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Update state arrays when materials change
  useEffect(() => {
    if (product.materials.length !== materialSearches.length) {
      setMaterialSearches(Array(product.materials.length).fill(''));
      setDropdownStates(Array(product.materials.length).fill(false));
      dropdownRefs.current = dropdownRefs.current.slice(0, product.materials.length);
    }
  }, [product.materials.length]);
  
  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      dropdownRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node) && dropdownStates[index]) {
          setDropdownStates(prev => {
            const newState = [...prev];
            newState[index] = false;
            return newState;
          });
        }
      });
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownStates]);

  const handleAddMaterial = () => {
    setProduct(prev => ({
      ...prev,
      materials: [...prev.materials, { materialName: '', quantity: 0 }]
    }));
  };

  // Handle dropdown toggle
  const toggleDropdown = (index: number) => {
    setDropdownStates(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  };

  // Handle search input change
  const handleSearchChange = (value: string, index: number) => {
    setMaterialSearches(prev => {
      const newSearches = [...prev];
      newSearches[index] = value;
      return newSearches;
    });
  };

  // Handle material selection
  const selectMaterial = (material: RawMaterial, index: number) => {
    const newMaterials = [...product.materials];
    newMaterials[index].materialName = material.name;
    setProduct(prev => ({ ...prev, materials: newMaterials }));
    
    // Close dropdown and reset search
    setDropdownStates(prev => {
      const newState = [...prev];
      newState[index] = false;
      return newState;
    });
    setMaterialSearches(prev => {
      const newSearches = [...prev];
      newSearches[index] = '';
      return newSearches;
    });
  };

  // Filter materials based on search
  const getFilteredMaterials = (index: number) => {
    const searchTerm = materialSearches[index]?.toLowerCase() || '';
    return inventory.filter(material => 
      material.name.toLowerCase().includes(searchTerm)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const stockNeeded: { [key: string]: number } = {};
      product.materials.forEach(({ materialName, quantity }) => {
        if (materialName && quantity > 0) {
          stockNeeded[materialName] = quantity;
        }
      });

      const response = await makeApiRequest({
        operation: "CreateProduct",
        product_name: product.name,
        stock_needed: stockNeeded,
        username: user.username
      });

      if (response) {
        const newProduct: Product = {
          id: response.product_id,
          name: response.product_name,
          materials: Object.entries(response.stock_needed).map(([name, quantity]) => ({
            materialName: name,
            quantity: quantity as number
          })),
          maxProduce: response.max_produce,
          productionCostBreakdown: response.production_cost_breakdown,
          productionCostTotal: response.production_cost_total,
          inventory: 0,
          originalMaxProduce: response.max_produce,
          stockNeeded: response.stock_needed,
          createdAt: new Date().toISOString()
        };

        onAddProduct(newProduct);
        setSuccess(`Product '${product.name}' created successfully!`);
        setProduct({
          name: '',
          materials: []
        });
        
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ${isMaximized ? 'p-0' : 'p-4'}`}>
      <div 
        className={`bg-white rounded-lg overflow-hidden flex flex-col transition-all duration-300 
          ${isMaximized 
            ? 'w-full h-full max-w-none max-h-none rounded-none' 
            : 'w-full max-w-2xl max-h-[90vh] overflow-y-auto'
          }`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Create New Product</h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsMaximized(prev => !prev)}
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="product-name" className="block text-sm font-medium text-gray-700">Product Name</label>
              <input
                id="product-name"
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={product.name}
                onChange={e => setProduct(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-lg font-medium">Materials Required</h3>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Material
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {product.materials.map((material, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Material {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setProduct(prev => ({
                            ...prev,
                            materials: prev.materials.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                        aria-label={`Remove material ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative" ref={el => dropdownRefs.current[index] = el}>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`material-button-${index}`}>
                          Select Material
                        </label>
                        
                        {/* Custom dropdown button */}
                        <button
                          id={`material-button-${index}`}
                          type="button"
                          className="flex justify-between items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-left focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          onClick={() => toggleDropdown(index)}
                        >
                          <span>{material.materialName || 'Select Material'}</span>
                          {dropdownStates[index] ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        
                        {/* Dropdown panel with search */}
                        {dropdownStates[index] && (
                          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  className="pl-10 pr-4 py-2 w-full text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Search materials..."
                                  value={materialSearches[index] || ''}
                                  onChange={(e) => handleSearchChange(e.target.value, index)}
                                />
                              </div>
                            </div>
                            <ul className="max-h-60 overflow-auto py-1 text-sm">
                              {getFilteredMaterials(index).length > 0 ? (
                                getFilteredMaterials(index).map(m => {
                                  const isSelected = material.materialName === m.name;
                                  return (
                                    <li
                                      key={m.id}
                                      className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer ${isSelected ? 'bg-indigo-50' : ''}`}
                                      onClick={() => selectMaterial(m, index)}
                                    >
                                      {m.name} ({m.unit}) - Available: {m.quantity}
                                    </li>
                                  );
                                })
                              ) : (
                                <li className="px-4 py-2 text-gray-500">No materials found</li>
                              )}
                            </ul>
                          </div>
                        )}
                        
                        {/* Hidden select for form validation */}
                        <select
                          className="sr-only"
                          aria-hidden="true"
                          tabIndex={-1}
                          required
                          value={material.materialName}
                          onChange={() => {}}
                        >
                          <option value="">Select Material</option>
                          {inventory.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`quantity-input-${index}`}>
                          Quantity
                        </label>
                        <input
                          id={`quantity-input-${index}`}
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          placeholder="Quantity"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          value={material.quantity || ''}
                          onChange={e => {
                            const newMaterials = [...product.materials];
                            newMaterials[index].quantity = Number(e.target.value);
                            setProduct(prev => ({ ...prev, materials: newMaterials }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};