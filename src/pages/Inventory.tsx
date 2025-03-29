import React, { useState } from 'react';
import { InventoryTable } from '../components/InventoryTable';
import { InventoryActions } from '../components/InventoryActions';
import { StockAlerts } from '../components/StockAlerts';
import { NewMaterialForm } from '../components/NewMaterialForm';
import { NewProductForm } from '../components/NewProductForm';
import { SearchBar } from '../components/SearchBar';
import { useInventory } from '../hooks/useInventory';
import { useProducts } from '../contexts/ProductContext';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, RefreshCw, Save, X, CheckCircle, Download } from 'lucide-react';
import { makeApiRequest } from '../utils/api';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { SortField, SortDirection } from '../types';

interface StockSaveResponse {
  message: string;
  opening_stock_qty: number;
  opening_stock_amount: number;
  timestamp: string;
}

interface ClosingStockResponse {
  message: string;
  closing_stock_qty: number;
  closing_stock_amount: number;
  consumption_qty: number;
  consumption_amount: number;
  timestamp: string;
}

export const Inventory = () => {
  const { user } = useAuth();
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingOpening, setIsSavingOpening] = useState(false);
  const [isSavingClosing, setIsSavingClosing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showOpeningStockPopup, setShowOpeningStockPopup] = useState(false);
  const [showClosingStockPopup, setShowClosingStockPopup] = useState(false);
  const [savedOpeningStock, setSavedOpeningStock] = useState<StockSaveResponse | null>(null);
  const [savedClosingStock, setSavedClosingStock] = useState<ClosingStockResponse | null>(null);
  const [showOpeningConfirmation, setShowOpeningConfirmation] = useState(false);
  const [showClosingConfirmation, setShowClosingConfirmation] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const { 
    inventory, 
    stockAlerts, 
    updateStock,
    subtractStock,
    updateStockLimit, 
    addMaterial,
    updateDefective,
    subtractDefective,
    updateMaterialDetails,
    deleteStock,
    refreshInventory,
    isLoading,
    error 
  } = useInventory();
  
  const { addProduct } = useProducts();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedMaterials = () => {
    return [...inventory]
      .filter(material => material.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'available':
            comparison = a.available - b.available;
            break;
          case 'defective':
            comparison = (a.defectiveQuantity || 0) - (b.defectiveQuantity || 0);
            break;
          case 'cost':
            comparison = a.cost - b.cost;
            break;
          case 'totalCost':
            comparison = (a.cost * a.available) - (b.cost * b.available);
            break;
          case 'stockLimit':
            comparison = (a.minStockLimit || 0) - (b.minStockLimit || 0);
            break;
          default:
            comparison = 0;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  };

  const handleRefresh = async () => {
    await refreshInventory();
  };

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Use the same sorting function as the table
      const sortedMaterials = getSortedMaterials();
      const data = sortedMaterials.map(material => ({
        'Material Name': material.name,
        'Available Quantity': material.available,
        'Unit': material.unit,
        'Cost Per Unit': `₹${material.cost}`,
        'Total Cost': `₹${material.cost * material.available}`,
        'Defective Quantity': material.defectiveQuantity || 0,
        'Stock Limit': material.minStockLimit || 'Not Set',
        'Status': material.minStockLimit && material.available <= material.minStockLimit ? 'Low Stock' : 'Normal'
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      const colWidths = [
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 }
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

      const fileName = `inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error downloading inventory:', error);
      setSaveError('Failed to download inventory data');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveOpeningStock = async () => {
    setIsSavingOpening(true);
    setSaveError(null);
    setSavedOpeningStock(null);

    try {
      const response = await makeApiRequest<StockSaveResponse>({
        operation: "SaveOpeningStock",
        username: user.username,
        stocks: inventory.map(item => ({
          item_id: item.id,
          quantity: item.available,
          defective: item.defectiveQuantity
        }))
      });

      if (response.message?.includes('success')) {
        setSavedOpeningStock(response);
        setShowOpeningStockPopup(true);
        await refreshInventory();
      } else {
        setSaveError('Failed to save opening stock');
      }
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to save opening stock');
    } finally {
      setIsSavingOpening(false);
      setShowOpeningConfirmation(false);
    }
  };

  const handleSaveClosingStock = async () => {
    setIsSavingClosing(true);
    setSaveError(null);
    setSavedClosingStock(null);

    try {
      const response = await makeApiRequest<ClosingStockResponse>({
        operation: "SaveClosingStock",
        username: user.username,
        stocks: inventory.map(item => ({
          item_id: item.id,
          quantity: item.available,
          defective: item.defectiveQuantity
        }))
      });

      if (response.message?.includes('success')) {
        setSavedClosingStock(response);
        setShowClosingStockPopup(true);
        await refreshInventory();
      } else {
        setSaveError('Failed to save closing stock');
      }
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to save closing stock');
    } finally {
      setIsSavingClosing(false);
      setShowClosingConfirmation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-md inline-block">
          <h3 className="text-lg font-semibold mb-2">Error Loading Inventory</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors min-w-[140px] ${
              isDownloading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </button>

          <button
            onClick={() => setShowOpeningConfirmation(true)}
            disabled={isSavingOpening}
            className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-w-[140px] ${
              isSavingOpening ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSavingOpening ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSavingOpening ? 'Saving...' : 'Opening Stock'}
          </button>

          <button
            onClick={() => setShowClosingConfirmation(true)}
            disabled={isSavingClosing}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors min-w-[140px] ${
              isSavingClosing ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSavingClosing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSavingClosing ? 'Saving...' : 'Closing Stock'}
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center justify-center px-4 py-2 bg-white text-indigo-600 rounded-md hover:bg-indigo-50 border border-indigo-200 transition-colors min-w-[140px]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
          <p className="text-red-700">{saveError}</p>
        </div>
      )}

      {showOpeningStockPopup && savedOpeningStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowOpeningStockPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Opening Stock Saved Successfully
                </h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-medium">{savedOpeningStock.opening_stock_qty.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">₹{savedOpeningStock.opening_stock_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="font-medium">
                    {format(new Date(savedOpeningStock.timestamp), 'PPp')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowOpeningStockPopup(false)}
                className="mt-6 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showClosingStockPopup && savedClosingStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowClosingStockPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Closing Stock Saved Successfully
                </h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Closing Stock Quantity:</span>
                  <span className="font-medium">{savedClosingStock.closing_stock_qty.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Closing Stock Amount:</span>
                  <span className="font-medium">₹{savedClosingStock.closing_stock_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Consumption Quantity:</span>
                  <span className="font-medium">{savedClosingStock.consumption_qty.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Consumption Amount:</span>
                  <span className="font-medium">₹{savedClosingStock.consumption_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="font-medium">
                    {format(new Date(savedClosingStock.timestamp), 'PPp')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowClosingStockPopup(false)}
                className="mt-6 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      <StockAlerts alerts={stockAlerts} />
      <InventoryActions 
        onNewMaterial={() => setShowNewMaterial(true)}
        onNewProduct={() => setShowNewProduct(true)}
      />
      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <InventoryTable
        materials={getSortedMaterials()}
        onUpdateStock={updateStock}
        onSubtractStock={subtractStock}
        onUpdateStockLimit={updateStockLimit}
        onUpdateDefective={updateDefective}
        onSubtractDefective={subtractDefective}
        onUpdateMaterialDetails={updateMaterialDetails}
        onDeleteStock={deleteStock}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {showNewMaterial && (
        <NewMaterialForm
          inventory={inventory}
          onAddMaterial={addMaterial}
          onClose={() => setShowNewMaterial(false)}
        />
      )}

      {showNewProduct && (
        <NewProductForm
          inventory={inventory}
          onAddProduct={addProduct}
          onClose={() => setShowNewProduct(false)}
        />
      )}

      <ConfirmationDialog
        isOpen={showOpeningConfirmation}
        title="Save Opening Stock"
        message="Are you sure you want to save the current inventory as opening stock? This will record the current quantities and values as the starting point for the day."
        isProcessing={isSavingOpening}
        confirmText="Save Opening Stock"
        processingText="Saving Opening Stock..."
        onConfirm={handleSaveOpeningStock}
        onCancel={() => setShowOpeningConfirmation(false)}
      />

      <ConfirmationDialog
        isOpen={showClosingConfirmation}
        title="Save Closing Stock"
        message="Are you sure you want to save the current inventory as closing stock? This will record the final quantities and values for the day."
        isProcessing={isSavingClosing}
        confirmText="Save Closing Stock"
        processingText="Saving Closing Stock..."
        onConfirm={handleSaveClosingStock}
        onCancel={() => setShowClosingConfirmation(false)}
      />
    </div>
  );
};

export default Inventory;