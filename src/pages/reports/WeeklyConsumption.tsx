import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Download, Loader2, RefreshCw, ArrowLeft,
  AlertCircle, TrendingDown, Package, FileText, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { makeApiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface ConsumptionSummary {
  item_id: string;
  total_quantity_consumed: number;
}

interface WeeklyConsumptionData {
  start_date: string;
  end_date: string;
  consumption_summary: ConsumptionSummary[];
  total_consumption_quantity: number;
  total_consumption_amount: number;
}

const WeeklyConsumption = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consumptionData, setConsumptionData] = useState<WeeklyConsumptionData | null>(null);

  const fetchConsumption = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await makeApiRequest({
        operation: 'GetWeeklyConsumptionSummary',
        start_date: startDate,
        end_date: endDate,
        username: user.username
      });

      setConsumptionData(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch consumption data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!consumptionData) return;
    
    setIsDownloading(true);
    try {
      const csvContent = [
        ['Weekly Consumption Summary'],
        [`Period: ${format(new Date(consumptionData.start_date), 'MMMM d, yyyy')} - ${format(new Date(consumptionData.end_date), 'MMMM d, yyyy')}`],
        [''],
        ['Material ID', 'Quantity Consumed'],
        ...consumptionData.consumption_summary.map(item => [
          item.item_id,
          item.total_quantity_consumed.toString()
        ]),
        [''],
        ['Totals'],
        ['Total Quantity', consumptionData.total_consumption_quantity.toString()],
        ['Total Amount (₹)', consumptionData.total_consumption_amount.toString()]
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly-consumption-${startDate}-to-${endDate}.csv`;
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
          <h1 className="text-2xl font-bold">Weekly Consumption</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                className="border-none focus:ring-0 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
              />
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                className="border-none focus:ring-0 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
              />
            </div>
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
                  <h2 className="text-xl font-semibold">Weekly Summary</h2>
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material ID
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity Consumed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {consumptionData.consumption_summary.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.item_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {item.total_quantity_consumed.toLocaleString()} units
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
                          {consumptionData.total_consumption_quantity.toLocaleString()} units
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Consumption Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a date range and click "Generate Report" to view consumption data
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyConsumption;