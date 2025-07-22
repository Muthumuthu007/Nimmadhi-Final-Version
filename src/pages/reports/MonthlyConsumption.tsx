import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Download, Loader2, RefreshCw, ArrowLeft,
  AlertCircle, TrendingDown, Package, FileText, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { makeApiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// Types for new nested structure
interface ConsumptionItem {
  item_id: string;
  quantity: number;
}

interface MonthlyConsumptionSummary {
  [date: string]: {
    [category: string]: {
      [subcategory: string]: ConsumptionItem[];
    };
  };
}

interface MonthlyConsumptionData {
  month: string;
  start_date: string;
  end_date: string;
  consumption_summary: MonthlyConsumptionSummary;
  total_consumption_quantity: number;
  total_consumption_amount: number;
}

// Utility to ensure a value is always an array
function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

const MonthlyConsumption = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consumptionData, setConsumptionData] = useState<MonthlyConsumptionData | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: 'item_id' | 'quantity'; dir: 'asc' | 'desc' }>({ field: 'item_id', dir: 'asc' });

  const fetchConsumption = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await makeApiRequest({
        operation: 'GetMonthlyConsumptionSummary',
        month: selectedMonth,
        username: user.username
      });

      setConsumptionData(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch consumption data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render the nested monthly consumption breakdown
  function renderMonthlyBreakdown(
    consumption_summary: MonthlyConsumptionSummary,
    search: string,
    sort: { field: 'item_id' | 'quantity'; dir: 'asc' | 'desc' },
    setSort: React.Dispatch<React.SetStateAction<{ field: 'item_id' | 'quantity'; dir: 'asc' | 'desc' }>>
  ) {
    // @ts-ignore
    return Object.entries(consumption_summary).map(([date, categories]) => (
      <div key={date} className="mb-8">
        <h4 className="text-md font-semibold text-indigo-700 mb-2">{format(new Date(date), 'MMMM d, yyyy')}</h4>
        {/* @ts-ignore */}
        {Object.entries(categories).map(([category, subcats]) => (
          <div key={category} className="mb-6">
            <h5 className="text-md font-semibold text-indigo-600 mb-1">{category}</h5>
            {/* @ts-ignore */}
            {Object.entries(subcats).map(([subcategory, items]) => {
              const safeItems: ConsumptionItem[] = safeArray<ConsumptionItem>(items);
              const filteredItems: ConsumptionItem[] = safeItems
                .filter((item: ConsumptionItem) => item.item_id.toLowerCase().includes(search.toLowerCase()))
                .sort((a: ConsumptionItem, b: ConsumptionItem) => {
                  let aVal = a[sort.field];
                  let bVal = b[sort.field];
                  if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                  if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                  if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
                  if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
                  return 0;
                });
              if (filteredItems.length === 0) return null;
              return (
                <div key={subcategory} className="mb-4">
                  <h6 className="text-sm font-semibold text-gray-700 mb-1">{subcategory}</h6>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                            onClick={() => setSort((s: { field: 'item_id' | 'quantity'; dir: 'asc' | 'desc' }) => ({ field: 'item_id', dir: s.field === 'item_id' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                          >
                            Material ID
                            {sort.field === 'item_id' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </th>
                          <th
                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                            onClick={() => setSort((s: { field: 'item_id' | 'quantity'; dir: 'asc' | 'desc' }) => ({ field: 'quantity', dir: s.field === 'quantity' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                          >
                            Quantity Consumed
                            {sort.field === 'quantity' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.map((item: ConsumptionItem, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.item_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {item.quantity.toLocaleString()} units
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                            Total
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                            {filteredItems.reduce((sum: number, item: ConsumptionItem) => sum + item.quantity, 0).toLocaleString()} units
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    ));
  }

  const handleDownload = () => {
    if (!consumptionData) return;
    setIsDownloading(true);
    try {
      const rows: string[][] = [
        ['Monthly Consumption Summary'],
        [`Month: ${format(new Date(consumptionData.month), 'MMMM yyyy')}`],
        [`Period: ${format(new Date(consumptionData.start_date), 'MMM d')} - ${format(new Date(consumptionData.end_date), 'MMM d, yyyy')}`],
        [''],
        ['Date', 'Category', 'Subcategory', 'Material ID', 'Quantity Consumed'],
      ];
      // @ts-ignore
      Object.entries(consumptionData.consumption_summary).forEach(([date, categories]) => {
        // @ts-ignore
        Object.entries(categories).forEach(([category, subcats]) => {
          // @ts-ignore
          Object.entries(subcats).forEach(([subcategory, items]) => {
            const safeItems: ConsumptionItem[] = safeArray<ConsumptionItem>(items);
            safeItems.forEach(item => {
              rows.push([
                date,
                category,
                subcategory,
                item.item_id,
                item.quantity.toString(),
              ]);
            });
          });
        });
      });
      rows.push(['']);
      rows.push(['Totals']);
      rows.push(['', '', '', 'Total Quantity', consumptionData.total_consumption_quantity.toString()]);
      rows.push(['', '', '', 'Total Amount (₹)', consumptionData.total_consumption_amount.toString()]);
      const csvContent = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-consumption-${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      setError('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Reports
          </button>
          <h1 className="text-2xl font-bold">Monthly Consumption</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="month"
              className="border-none focus:ring-0 text-sm w-full"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !consumptionData}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${
              isDownloading || !consumptionData ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </button>

          <button
            onClick={fetchConsumption}
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
            {isLoading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {consumptionData ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-semibold">Monthly Summary</h2>
                  <span className="text-sm text-gray-500">
                    ({format(new Date(consumptionData.start_date), 'MMM d')} - {format(new Date(consumptionData.end_date), 'MMM d, yyyy')})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-indigo-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600">Total Quantity Consumed</p>
                      <p className="mt-2 text-3xl font-bold text-indigo-900">
                        {consumptionData.total_consumption_quantity.toLocaleString()} units
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-indigo-600" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Total Consumption Cost</p>
                      <p className="mt-2 text-3xl font-bold text-green-900">
                        ₹{consumptionData.total_consumption_amount.toLocaleString()}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden">
                <h3 className="text-lg font-medium mb-4">Material Consumption Breakdown</h3>
                <div className="flex items-center mb-2">
                  <input
                    type="text"
                    className="border rounded px-3 py-2 text-sm w-full max-w-xs"
                    placeholder="Search by Material ID..."
                    title="Search by Material ID"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {renderMonthlyBreakdown(consumptionData.consumption_summary, search, sort, setSort)}
              </div>
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Consumption Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a month and click "Generate Report" to view consumption data
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyConsumption;