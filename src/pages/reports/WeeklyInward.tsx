import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarRange, Download, Loader2, RefreshCw, ArrowLeft, AlertCircle, TrendingDown, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { makeApiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';

const WeeklyInward = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inwardData, setInwardData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'stock_name', dir: 'asc' });

  const fetchInward = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeApiRequest({
        operation: 'GetWeeklyInward',
        start_date: startDate,
        end_date: endDate,
        // username: user.username // not needed per new payload
      });
      setInwardData(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch inward data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!inwardData || !inwardData.inward) return;
    const rows: any[] = [];
    Object.entries(inwardData.inward).forEach(([date, groups]: [string, any]) => {
      Object.entries(groups).forEach(([group, categories]: [string, any]) => {
        Object.entries(categories).forEach(([category, entries]: [string, any[]]) => {
          entries.forEach((entry: any) => {
            rows.push({
              'Date': date,
              'Group': group,
              'Subgroup': category,
              'Category': category,
              'Stock Name': entry.stock_name,
              'Existing Qty': entry.existing_quantity,
              'Inward Qty': entry.inward_quantity,
              'New Qty': entry.new_quantity,
              'Added Cost': entry.added_cost,
            });
          });
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Inward');
    XLSX.writeFile(workbook, `weekly-inward-${startDate}_to_${endDate}.xlsx`);
  };

  function getFilteredSorted(entries: any[]) {
    return entries
      .filter(entry => entry.stock_name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        let aVal = a[sort.field];
        let bVal = b[sort.field];
        if (sort.field === 'date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
        return 0;
      });
  }

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
          <h1 className="text-2xl font-bold">Weekly Inward</h1>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0 text-sm w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              title="Start Date"
              aria-label="Start Date"
            />
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0 text-sm w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              title="End Date"
              aria-label="End Date"
            />
          </div>
          <button
            onClick={fetchInward}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-w-[140px] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
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
      {inwardData ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-semibold">Inward Entries</h2>
                  <span className="text-sm text-gray-500">
                    ({format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')})
                  </span>
                </div>
                <button
                  className="ml-4 flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  onClick={handleDownload}
                  disabled={!inwardData || !inwardData.inward}
                  title="Download Excel"
                >
                  <Download className="w-5 h-5 mr-1" /> Download
                </button>
              </div>
              {inwardData && inwardData.inward && Object.entries(inwardData.inward).map(([date, groups]: [string, any]) => (
                Object.keys(groups).length > 0 && (
                  <div key={date} className="mb-8">
                    <div className="text-md font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                      <Calendar className="inline h-5 w-5 text-indigo-400" />
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </div>
                    {Object.entries(groups).map(([group, categories]: [string, any]) => (
                      <div key={group} className="mb-4">
                        <div className="font-semibold text-gray-700 mb-1">{group}</div>
                        {Object.entries(categories).map(([category, entries]: [string, any[]]) => (
                          <div key={category} className="mb-2">
                            <div className="font-medium text-gray-600 mb-1">{category}</div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full rounded-lg shadow border border-gray-200 bg-white mb-4">
                                <thead className="bg-indigo-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Stock Name</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Existing Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-green-700 uppercase tracking-wider">Inward Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">New Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-yellow-700 uppercase tracking-wider">Added Cost</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entries.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                                      <td className="px-4 py-2 font-semibold text-indigo-900">{entry.stock_name}</td>
                                      <td className="px-4 py-2 text-right text-gray-800">{entry.existing_quantity}</td>
                                      <td className="px-4 py-2 text-right text-green-700 font-bold">+{entry.inward_quantity}</td>
                                      <td className="px-4 py-2 text-right text-blue-700 font-bold">{entry.new_quantity}</td>
                                      <td className="px-4 py-2 text-right text-yellow-700 font-bold">₹{entry.added_cost.toLocaleString()}</td>
                                      <td className="px-4 py-2 text-right text-gray-500">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Inward Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a date range and click "Generate Report" to view inward data
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyInward; 