import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, Clock, User, ArrowDownRight, ArrowUpRight,
  AlertTriangle, Plus, Boxes, TrendingDown, DollarSign, BarChart3,
  Save, Box, Settings
} from 'lucide-react';
import { makeApiRequest } from '../../utils/api';
import { format, parse } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { downloadCSV, generateMonthlyReportCSV } from '../../utils/csvExport';
import { MonthlyReportData } from '../../types';

const MonthlyReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);

  const handleDownload = async () => {
    if (!reportData) return;
    
    setIsDownloading(true);
    try {
      const csvData = generateMonthlyReportCSV(reportData);
      const filename = `monthly-report-${reportData.report_period.year}-${reportData.report_period.month.toString().padStart(2, '0')}.csv`;
      downloadCSV(csvData, filename);
    } catch (error: any) {
      setError(error.message || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await makeApiRequest<MonthlyReportData>({
        operation: 'GetMonthlyReport',
        month: selectedMonth,
        username: user.username
      });

      if (!response || !response.daily_report) {
        throw new Error('No data found for the selected month');
      }

      setReportData(response);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      setError(error?.message || 'Failed to fetch monthly report data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const parsedDate = parse(timestamp, 'yyyy-MM-dd hh:mm:ss a', new Date());
      return format(parsedDate, 'HH:mm');
    } catch (error) {
      console.error('Error parsing timestamp:', error);
      return 'Invalid time';
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'CreateStock':
        return <Plus className="h-5 w-5 text-blue-600" />;
      case 'SubtractStockQuantity':
        return <ArrowDownRight className="h-5 w-5 text-red-600" />;
      case 'AddStockQuantity':
        return <ArrowUpRight className="h-5 w-5 text-green-600" />;
      case 'AddDefectiveGoods':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'PushToProduction':
        return <Box className="h-5 w-5 text-purple-600" />;
      case 'SaveOpeningStock':
        return <Save className="h-5 w-5 text-indigo-600" />;
      case 'SaveClosingStock':
        return <Save className="h-5 w-5 text-green-600" />;
      case 'CreateProduct':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'UpdateStock':
        return <Settings className="h-5 w-5 text-gray-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getOperationColor = (type: string): string => {
    switch (type) {
      case 'CreateStock':
        return 'bg-blue-50 border-blue-100';
      case 'SubtractStockQuantity':
        return 'bg-red-50 border-red-100';
      case 'AddStockQuantity':
        return 'bg-green-50 border-green-100';
      case 'AddDefectiveGoods':
        return 'bg-orange-50 border-orange-100';
      case 'PushToProduction':
        return 'bg-purple-50 border-purple-100';
      case 'SaveOpeningStock':
        return 'bg-indigo-50 border-indigo-100';
      case 'SaveClosingStock':
        return 'bg-green-50 border-green-100';
      case 'CreateProduct':
        return 'bg-blue-50 border-blue-100';
      case 'UpdateStock':
        return 'bg-gray-50 border-gray-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  const formatTransactionDetails = (details: any, type: string): string => {
    // Handle null or undefined details
    if (!details) {
      return 'No details available';
    }
    
    try {
      switch (type) {
        case 'SubtractStockQuantity':
          return `Subtracted ${details.quantity_subtracted || 0} units (New total: ${details.new_total || 0})`;
        case 'AddStockQuantity':
          return `Added ${details.quantity_added || 0} units (New total: ${details.new_total || 0})`;
        case 'AddDefectiveGoods':
          return `Added ${details.defective_added || 0} defective units (New total: ${details.new_defective || 0})`;
        case 'CreateStock':
          return `Created stock with ${details.quantity || 0} units at ₹${details.cost_per_unit || 0}/unit`;
        case 'PushToProduction':
          return `Produced ${details.quantity_produced || 0} units at ₹${details.production_cost_per_unit || 0}/unit (Total: ₹${details.total_production_cost || 0})`;
        case 'SaveOpeningStock':
          // Check different potential username fields
          const openingUser = details.username || details.user || details.user_name || details.userName || 'unknown';
          return `Opening stock saved by ${openingUser}: ${details.opening_stock_qty || 0} units (₹${details.opening_stock_amount || 0})`;
        case 'SaveClosingStock':
          // Check different potential username fields
          const closingUser = details.username || details.user || details.user_name || details.userName || 'unknown';
          return `Closing stock saved by ${closingUser}: ${details.closing_stock_qty || 0} units (₹${details.closing_stock_amount || 0}), Consumption: ${details.consumption_qty || 0} units (₹${details.consumption_amount || 0})`;
        case 'CreateProduct':
          return `Created product "${details.product_name || 'unknown'}" with production cost ₹${details.production_cost_total || 0}`;
        case 'UpdateStock':
          return `Updated from ${details.old_quantity || 0} to ${details.new_quantity || 0} units (Cost: ₹${details.new_cost_per_unit || 0}/unit)`;
        default:
          return JSON.stringify(details);
      }
    } catch (error) {
      console.error('Error formatting transaction details:', error);
      return 'Error displaying transaction details';
    }
  };

  const renderSummaryCard = (
    title: string, 
    value: number | undefined, 
    amount: number | undefined,
    icon: React.ReactNode,
    colorClass: string
  ) => {
    const safeValue = value ?? 0;
    const safeAmount = amount ?? 0;

    return (
      <div className={`${colorClass} rounded-lg p-6 transition-all duration-200 hover:shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="mt-2 text-2xl font-bold">{safeValue.toLocaleString()} units</p>
            <p className="mt-1 text-lg">₹{safeAmount.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white bg-opacity-30 rounded-full">
            {icon}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionDetails = (transaction: any) => {
    if (!transaction || !transaction.details) {
      return null;
    }
    
    try {
      switch (transaction.operation_type) {
        case 'PushToProduction':
          return (
            <div className="mt-2 bg-purple-50 rounded-md p-2 text-xs">
              <p className="font-medium mb-1">Material Deductions:</p>
              {transaction.details.deductions && Object.entries(transaction.details.deductions).map(([material, quantity]) => (
                <div key={material} className="flex justify-between text-gray-600">
                  <span>{material}:</span>
                  <span>{String(quantity)} units</span>
                </div>
              ))}
            </div>
          );
        case 'CreateProduct':
          return (
            <div className="mt-2 bg-blue-50 rounded-md p-2 text-xs">
              <p className="font-medium mb-1">Materials Required:</p>
              {transaction.details.stock_needed && Object.entries(transaction.details.stock_needed).map(([material, quantity]) => (
                <div key={material} className="flex justify-between text-gray-600">
                  <span>{material}:</span>
                  <span>{String(quantity)} units</span>
                </div>
              ))}
              <p className="font-medium mt-2 mb-1">Production Costs:</p>
              {transaction.details.production_cost_breakdown && Object.entries(transaction.details.production_cost_breakdown).map(([material, cost]) => (
                <div key={material} className="flex justify-between text-gray-600">
                  <span>{material}:</span>
                  <span>₹{String(cost)}</span>
                </div>
              ))}
            </div>
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering transaction details:', error);
      return null;
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
          <h1 className="text-2xl font-bold">Monthly Report</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="month"
              className="border-none focus:ring-0 text-sm w-full"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              title="Select month"
              aria-label="Select month"
            />
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !reportData}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${
              isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
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
            onClick={fetchReport}
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

      {reportData ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-semibold">Monthly Summary</h2>
                  <span className="text-sm text-gray-500">
                    ({format(new Date(reportData.report_period.start_date), 'MMMM yyyy')})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderSummaryCard(
                  "Opening Stock",
                  reportData.overall_stock_summary?.opening_stock_qty,
                  reportData.overall_stock_summary?.opening_stock_amount,
                  <Boxes className="h-6 w-6 text-blue-700" />,
                  "bg-blue-50 text-blue-700"
                )}
                {renderSummaryCard(
                  "Total Consumption",
                  reportData.overall_stock_summary?.consumption_qty,
                  reportData.overall_stock_summary?.consumption_amount,
                  <TrendingDown className="h-6 w-6 text-red-700" />,
                  "bg-red-50 text-red-700"
                )}
                {renderSummaryCard(
                  "Closing Stock",
                  reportData.overall_stock_summary?.closing_stock_qty,
                  reportData.overall_stock_summary?.closing_stock_amount,
                  <DollarSign className="h-6 w-6 text-green-700" />,
                  "bg-green-50 text-green-700"
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Daily Breakdown</h2>
              <div className="space-y-6">
                {Object.entries(reportData.daily_report)
                  .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                  .map(([date, data]) => {
                    if (!data) return null;

                    return (
                      <div key={date} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b">
                          <h3 className="font-medium">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</h3>
                        </div>
                        <div className="p-6">
                          {data.stock_summary && Object.keys(data.stock_summary).length > 0 && (
                            <div className="grid grid-cols-3 gap-4 mb-6">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500">Opening Stock</p>
                                <p className="text-lg font-semibold mt-1">{data.stock_summary.opening_stock_qty.toLocaleString()} units</p>
                                <p className="text-sm text-gray-600">₹{data.stock_summary.opening_stock_amount.toLocaleString()}</p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500">Consumption</p>
                                <p className="text-lg font-semibold mt-1">{data.stock_summary.consumption_qty.toLocaleString()} units</p>
                                <p className="text-sm text-gray-600">₹{data.stock_summary.consumption_amount.toLocaleString()}</p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500">Closing Stock</p>
                                <p className="text-lg font-semibold mt-1">{data.stock_summary.closing_stock_qty.toLocaleString()} units</p>
                                <p className="text-sm text-gray-600">₹{data.stock_summary.closing_stock_amount.toLocaleString()}</p>
                              </div>
                            </div>
                          )}

                          {data.transactions && data.transactions.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="font-medium text-gray-700 mb-3">Transactions</h4>
                              {data.transactions.map((transaction: any) => (
                                <div
                                  key={transaction.transaction_id}
                                  className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${getOperationColor(transaction.operation_type)}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                      <div className="mt-1">
                                        {getOperationIcon(transaction.operation_type)}
                                      </div>
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-gray-900">
                                            {transaction.operation_type}
                                          </span>
                                          <span className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded-full">
                                            {transaction.transaction_id}
                                          </span>
                                        </div>
                                        <p className="text-sm mt-1 text-gray-600">
                                          {(() => {
                                            try {
                                              return formatTransactionDetails(transaction.details, transaction.operation_type);
                                            } catch (error) {
                                              console.error('Error rendering transaction details:', error);
                                              return 'Error displaying details';
                                            }
                                          })()}
                                        </p>
                                        {renderTransactionDetails(transaction)}
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                          {transaction.details?.item_id && (
                                            <div className="flex items-center">
                                              <Package className="h-4 w-4 mr-1" />
                                              {transaction.details.item_id}
                                            </div>
                                          )}
                                          {(() => {
                                            try {
                                              const username = transaction.details?.username || 
                                                              transaction.details?.user || 
                                                              transaction.details?.user_name || 
                                                              transaction.username || 
                                                              transaction.user ||
                                                              transaction.user_name;
                                              
                                              if (username) {
                                                return (
                                                  <div className="flex items-center">
                                                    <User className="h-4 w-4 mr-1" />
                                                    {username}
                                                  </div>
                                                );
                                              }
                                            } catch (error) {
                                              console.error('Error displaying username:', error);
                                            }
                                            return null;
                                          })()}
                                          {transaction.timestamp && (
                                            <div className="flex items-center">
                                              <Clock className="h-4 w-4 mr-1" />
                                              {formatTimestamp(transaction.timestamp)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-500">
                              No transactions recorded for this day
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Monthly Report Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a month and click "Generate Report" to view the data
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;