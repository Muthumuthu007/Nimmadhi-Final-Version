import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, Clock, User, Box, Trash2
} from 'lucide-react';
import { makeApiRequest } from '../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import * as XLSX from 'xlsx';

const DispatchedMonthly = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]); // <-- new state for summary
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UNDONE'>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<{ push_id: string, product_name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleFetchRecords = () => {
    setValidationError(null);
    if (!fromDate || !toDate) {
      setValidationError('Please select both From Date and To Date.');
      return;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) {
      setValidationError('To Date cannot be earlier than From Date.');
      return;
    }
    fetchRecords();
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeApiRequest({
        operation: 'GetMonthlyPushToProduction',
        username: user.username,
        from_date: fromDate,
        to_date: toDate
      });
      // Adapt to new response format
      setSummary(Array.isArray(response?.summary) ? response.summary : []);
      setRecords(Array.isArray(response?.items) ? response.items : []);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch dispatch records');
      setSummary([]);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!records.length) return;
    setIsDownloading(true);
    try {
      const header = [
        'Product Name', 'Quantity Produced', 'Cost per Unit', 'Total Production Cost', 'Status', 'Dispatched By', 'Timestamp'
      ];
      const rows = records.map(r => [
        r.product_name,
        r.quantity_produced,
        r.production_cost_per_unit,
        r.total_production_cost,
        r.status,
        r.username,
        r.timestamp
      ]);
      // Optionally add summary at the top
      const summaryHeader = ['Product Name', 'Total Quantity Dispatched'];
      const summaryRows = summary.map(s => [s.product_name, s.total_quantity]);
      const ws = XLSX.utils.aoa_to_sheet([
        ['Summary'],
        summaryHeader,
        ...summaryRows,
        [],
        header,
        ...rows
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Dispatch');
      XLSX.writeFile(wb, `monthly-dispatch-${fromDate}_to_${toDate}.xlsx`);
    } catch (error) {
      setError('Failed to download Excel: ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteMessage(null);
    try {
      const response = await makeApiRequest({
        operation: 'DeletePushToProduction',
        push_id: deleteTarget.push_id,
        username: user.username
      });
      if (response?.message?.includes('deleted successfully')) {
        setDeleteMessage({ type: 'success', text: response.message });
        setRecords(prev => prev.filter(r => r.push_id !== deleteTarget.push_id));
      } else {
        setDeleteMessage({ type: 'error', text: response?.message || 'Delete failed' });
      }
    } catch (e: any) {
      setDeleteMessage({ type: 'error', text: e?.message || 'Delete failed' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filter and sort records by search, status, and sort
  const filteredRecords = records
    .filter(r =>
      (statusFilter === 'ALL' || (r.status || '').toUpperCase() === statusFilter) &&
      (
        (r.product_name && r.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.product_id && r.product_id.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    )
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/dispatched')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dispatched
          </button>
          <h1 className="text-2xl font-bold">Monthly Dispatch</h1>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0 text-sm w-full"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                if (toDate && e.target.value > toDate) setToDate(e.target.value);
              }}
              title="From date"
              aria-label="From date"
              max={toDate}
            />
            <span className="mx-2 text-gray-400">to</span>
            <input
              type="date"
              className="border-none focus:ring-0 text-sm w-full"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="To date"
              aria-label="To date"
              min={fromDate}
            />
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <label htmlFor="status-filter" className="text-xs text-gray-600">Status:</label>
            <select
              id="status-filter"
              className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'UNDONE')}
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDONE">Undone</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <input
              type="text"
              className="border border-gray-300 rounded-md text-sm py-1 px-2 w-48 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search by product name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <label htmlFor="sort-field" className="text-xs text-gray-600">Sort by:</label>
            <select
              id="sort-field"
              className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={sortField}
              onChange={e => setSortField(e.target.value)}
            >
              <option value="product_name">Product Name</option>
              <option value="quantity_produced">Quantity Produced</option>
              <option value="production_cost_per_unit">Cost per Unit</option>
              <option value="total_production_cost">Total Cost</option>
              <option value="status">Status</option>
              <option value="timestamp">Date</option>
            </select>
            <button
              type="button"
              className="p-1 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || !filteredRecords.length}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${
              isDownloading || !filteredRecords.length ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </button>
          <button
            onClick={handleFetchRecords}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-w-[140px] ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Loading...' : 'Fetch Records'}
          </button>
        </div>
      </div>
      {/* Validation Error Banner */}
      {validationError && (
        <div className="fixed top-0 left-1/2 transform -translate-x-1/2 mt-4 z-50 px-6 py-3 rounded-md shadow-lg border flex items-center gap-2 bg-red-50 border-red-200 text-red-700" style={{ minWidth: '320px', maxWidth: '90vw' }}>
          <span>{validationError}</span>
          <button className="ml-2 text-gray-400 hover:text-gray-600" onClick={() => setValidationError(null)} title="Close">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      {/* Summary Table */}
      {summary.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Summary (Total Dispatched per Product)</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2">Product Name</th>
                <th className="text-left py-1 px-2">Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.product_id} className="border-b last:border-0">
                  <td className="py-1 px-2">{s.product_name}</td>
                  <td className="py-1 px-2">{s.total_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No dispatch records found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try a different date range or refresh the page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredRecords.map((record) => (
            <div
              key={record.push_id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-lg font-bold text-gray-900">{record.product_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {record.product_id} <br />
                    Push ID: {record.push_id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${record.status === 'Active' || record.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{record.status}</span>
                  <button className="text-red-500 hover:text-red-700 p-1.5 rounded-full" title="Delete Dispatch" onClick={() => setDeleteTarget({ push_id: record.push_id, product_name: record.product_name })}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                <div>
                  <div className="font-semibold mb-2 text-gray-700">Production Details</div>
                  <div className="text-sm text-gray-700">Quantity Produced: <span className="font-medium">{record.quantity_produced} units</span></div>
                  <div className="text-sm text-gray-700">Cost per Unit: <span className="font-medium">₹{record.production_cost_per_unit}</span></div>
                  <div className="text-sm text-gray-700">Total Cost: <span className="font-medium">₹{record.total_production_cost}</span></div>
                </div>
                <div>
                  <div className="font-semibold mb-2 text-gray-700">Material Deductions</div>
                  {record.stock_deductions && Object.keys(record.stock_deductions).length > 0 ? (
                    <ul className="text-sm text-gray-700">
                      {Object.entries(record.stock_deductions).map(([material, qty]) => (
                        <li key={material} className="flex justify-between">
                          <span>{material}</span>
                          <span className="font-medium">{qty} units</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500">No material deductions recorded.</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <div className="flex items-center"><svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19a6 6 0 01-12 0V5a2 2 0 012-2h8a2 2 0 012 2v14z" /></svg>{record.timestamp ? format(new Date(record.timestamp), 'PPP, p') : ''}</div>
                <div className="flex items-center"><svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{record.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Dispatch Record"
        message={`Are you sure you want to delete the dispatch record for '${deleteTarget?.product_name}'? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {/* Success/Error Banner */}
      {deleteMessage && (
        <div className={`fixed top-0 left-1/2 transform -translate-x-1/2 mt-4 z-50 px-6 py-3 rounded-md shadow-lg border flex items-center gap-2 ${deleteMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
             style={{ minWidth: '320px', maxWidth: '90vw' }}>
          <span>{deleteMessage.text}</span>
          <button className="ml-2 text-gray-400 hover:text-gray-600" onClick={() => setDeleteMessage(null)} title="Close">✕</button>
        </div>
      )}
    </div>
  );
};

export default DispatchedMonthly; 