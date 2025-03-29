import React, { useState } from 'react';
import { RefreshCw, Loader2, Package, Clock, User, ArrowUpDown, Search, Filter, CheckCircle, XCircle, Download, Trash2 } from 'lucide-react';
import { makeApiRequest } from '../utils/api';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';

interface ProductionRecord {
  product_name: string;
  production_cost_per_unit: number;
  status: 'ACTIVE' | 'UNDONE';
  timestamp: string;
  push_id: string;
  username: string;
  stock_deductions: Record<string, number>;
  quantity_produced: number;
  product_id: string;
  total_production_cost: number;
}

const Dispatched = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof ProductionRecord>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UNDONE'>('ALL');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPushId, setSelectedPushId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await makeApiRequest<ProductionRecord[]>({
        operation: "GetAllPushToProduction",
        username: user.username
      });

      setRecords(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch production records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPushId) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await makeApiRequest({
        operation: "DeletePushToProduction",
        push_id: selectedPushId,
        username: user.username
      });

      if (response?.message?.includes('deleted successfully')) {
        setSuccessMessage('Deleted Successfully');
        // Remove the deleted record from the state
        setRecords(prev => prev.filter(record => record.push_id !== selectedPushId));
      } else {
        setError('Action not done');
      }
    } catch (error: any) {
      setError('Action not done');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedPushId(null);
    }
  };

  const handleDeleteClick = (pushId: string) => {
    setSelectedPushId(pushId);
    setShowDeleteDialog(true);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Prepare data
      const data = filteredRecords.map(record => ({
        'Product Name': record.product_name,
        'Product ID': record.product_id,
        'Push ID': record.push_id,
        'Status': record.status,
        'Quantity Produced': record.quantity_produced,
        'Cost per Unit': `₹${record.production_cost_per_unit}`,
        'Total Cost': `₹${record.total_production_cost}`,
        'Username': record.username,
        'Timestamp': format(new Date(record.timestamp), 'PPp')
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Product Name
        { wch: 40 }, // Product ID
        { wch: 40 }, // Push ID
        { wch: 10 }, // Status
        { wch: 15 }, // Quantity Produced
        { wch: 15 }, // Cost per Unit
        { wch: 15 }, // Total Cost
        { wch: 15 }, // Username
        { wch: 20 }, // Timestamp
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Production Records');

      // Generate filename with current date
      const fileName = `production-history-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredRecords = records
    .filter(record => {
      const matchesSearch = record.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.push_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.username.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'product_name':
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case 'quantity_produced':
          comparison = a.quantity_produced - b.quantity_produced;
          break;
        case 'total_production_cost':
          comparison = a.total_production_cost - b.total_production_cost;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Production History</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={handleDownload}
            disabled={isDownloading || records.length === 0}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors min-w-[140px] ${
              (isDownloading || records.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </button>
          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors min-w-[140px] ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-grow max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by product name, ID, or username..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 min-w-[140px]">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'UNDONE')}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDONE">Undone</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 min-w-[140px]">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <select
              className="border border-gray-300 rounded-md text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 w-full"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as keyof ProductionRecord)}
            >
              <option value="timestamp">Sort by Date</option>
              <option value="product_name">Sort by Name</option>
              <option value="quantity_produced">Sort by Quantity</option>
              <option value="total_production_cost">Sort by Cost</option>
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredRecords.map((record) => (
          <div
            key={record.push_id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{record.product_name}</h3>
                  <p className="text-sm text-gray-500">ID: {record.product_id}</p>
                  <p className="text-sm text-gray-500">Push ID: {record.push_id}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    record.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {record.status === 'ACTIVE' ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        Undone
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteClick(record.push_id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Production Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quantity Produced:</span>
                      <span className="font-medium">{record.quantity_produced} units</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost per Unit:</span>
                      <span className="font-medium">₹{record.production_cost_per_unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Cost:</span>
                      <span className="font-medium">₹{record.total_production_cost}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Material Deductions</h4>
                  <div className="space-y-2">
                    {Object.entries(record.stock_deductions).map(([material, quantity]) => (
                      <div key={material} className="flex justify-between text-sm">
                        <span>{material}:</span>
                        <span className="font-medium">{quantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {format(new Date(record.timestamp), 'PPp')}
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {record.username}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredRecords.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No production records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {records.length === 0
                ? 'Click the refresh button to load production records'
                : 'Try adjusting your search or filter settings'}
            </p>
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Production Record"
        message="Are you sure you want to delete this production record? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedPushId(null);
        }}
      />
    </div>
  );
};

export default Dispatched;