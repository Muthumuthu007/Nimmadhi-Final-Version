import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Loader2, AlertCircle, RefreshCw, ArrowLeft, User, Clock, FileText, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, ArrowDownRight, ArrowUpRight, AlertTriangle, Box, Save, Package, Settings, ChevronDown, ChevronRight, Download
} from 'lucide-react';
import { makeApiRequest } from '../../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';

const DailyReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // --- SORTING STATE ---
  const [itemSort, setItemSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'description', dir: 'asc' });
  const [groupSort, setGroupSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'description', dir: 'asc' });

  // --- SEARCH & SORT STATE FOR ACTIVITIES ---
  const [activitySearch, setActivitySearch] = useState('');
  const [activitySort, setActivitySort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'timestamp', dir: 'desc' });

  // --- GROUP EXPAND/COLLAPSE STATE ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await makeApiRequest<any>({
        operation: 'GetDailyReport',
        report_date: selectedDate,
        username: user.username,
      });
      setReportData(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch daily report data');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SORTING LOGIC ---
  function sortRows(rows: any[], field: string, dir: 'asc' | 'desc') {
    return [...rows].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      // Try to compare as numbers if possible
      if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // --- FILTER & SORT ACTIVITIES ---
  function filterAndSortActivities(activities: any[]) {
    activities = Array.isArray(activities) ? activities : [];
    let filtered = activities;
    if (activitySearch.trim()) {
      const q = activitySearch.trim().toLowerCase();
      filtered = activities.filter(tx => {
        const op = (tx.operation_type || '').toLowerCase();
        const user = (tx.details?.username || '').toLowerCase();
        const details = JSON.stringify(tx.details || {}).toLowerCase();
        return op.includes(q) || user.includes(q) || details.includes(q);
      });
    }
    const { field, dir } = activitySort;
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      if (field === 'timestamp') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }

  // --- BEAUTIFUL TABLE RENDERER ---
  const renderTable = (
    columns: { key: string; label: string; sortable?: boolean }[],
    rows: any[],
    keyPrefix: string,
    sortState: { field: string; dir: 'asc' | 'desc' },
    setSort: (s: { field: string; dir: 'asc' | 'desc' }) => void
  ) => {
    // Enhanced grouping: Attach TOTAL rows to their group
    const groupedRows: Record<string, any[]> = {};
    // First, group normal rows
    rows.forEach(row => {
      if (row.description?.startsWith("TOTAL:")) return; // skip TOTAL for now
      const groupName = row.group_name || 'Uncategorized';
      const normGroupName = groupName.trim().toUpperCase();
      if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
      groupedRows[normGroupName].push(row);
    });
    // Now, attach TOTAL rows to their group
    rows.forEach(row => {
      if (row.description?.startsWith("TOTAL:")) {
        // Try to extract group name from description
        const match = row.description.match(/^TOTAL:\s*(.*)$/i);
        let groupName = match ? match[1].trim() : 'Uncategorized';
        const normGroupName = groupName.trim().toUpperCase();
        // Fallback: if not found, put in Uncategorized
        if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
        // Mark as TOTAL row for rendering
        row.__isTotalRow = true;
        groupedRows[normGroupName].push(row);
      }
    });

    return (
      <div className="overflow-x-auto rounded-xl shadow-md border border-gray-300 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th
                key="sl_no"
                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300"
              >
                SL NO
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300 cursor-pointer select-none ${
                    col.sortable ? ' hover:bg-gray-200 transition' : ''
                  }`}
                  onClick={() =>
                    col.sortable &&
                    setSort({
                      field: col.key,
                      dir: sortState.field === col.key ? (sortState.dir === 'asc' ? 'desc' : 'asc') : 'asc',
                    })
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortState.field === col.key ? (
                      sortState.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : col.sortable ? (
                      <ArrowUpDown size={14} />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedRows).map(([groupName, groupItems]) => {
              // Separate normal items and TOTAL row(s)
              const normalItems = groupItems.filter(item => !item.__isTotalRow);
              const totalRows = groupItems.filter(item => item.__isTotalRow);
              const sortedItems = sortRows(normalItems, sortState.field, sortState.dir);
              const isExpanded = expandedGroups[groupName] !== false;
              return (
                <React.Fragment key={groupName}>
                  {/* Group Header Row */}
                  <tr className="bg-yellow-200">
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-2 text-sm font-bold text-yellow-900 border-t border-b border-gray-300 cursor-pointer select-none"
                      onClick={() => toggleGroup(groupName)}
                    >
                      <span className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="inline h-4 w-4" /> : <ChevronRight className="inline h-4 w-4" />}
                        {groupName}
                      </span>
                    </td>
                  </tr>
                  {/* Group Item Rows */}
                  {isExpanded && sortedItems.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-indigo-50 transition-colors duration-150">
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{idx + 1}</td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2 whitespace-nowrap text-sm text-gray-800 border-t border-r border-gray-300 ${
                            col.key.startsWith('balance_') ? 'bg-blue-100' : ''
                          }`}
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* TOTAL Row(s) for the group, if present */}
                  {isExpanded && totalRows.map((totalRow, tIdx) => (
                    <tr key={`total-${tIdx}`} className="bg-gray-200 font-bold">
                      <td className="px-4 py-2 text-sm border-t border-r border-gray-400">TOTAL</td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-2 whitespace-nowrap text-sm border-t border-r border-gray-400"
                        >
                          {typeof totalRow[col.key] === 'undefined' ? '' : totalRow[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // --- BEAUTIFUL ACTIVITY CARD RENDERER ---
  function getOperationIcon(op: string | undefined) {
    switch (op) {
      case 'CreateStock': return <Plus className="h-8 w-8 text-blue-600 bg-blue-100 p-1.5 rounded-full" />;
      case 'SubtractStockQuantity': return <ArrowDownRight className="h-8 w-8 text-red-600 bg-red-100 p-1.5 rounded-full" />;
      case 'AddStockQuantity': return <ArrowUpRight className="h-8 w-8 text-green-600 bg-green-100 p-1.5 rounded-full" />;
      case 'AddDefectiveGoods': return <AlertTriangle className="h-8 w-8 text-orange-600 bg-orange-100 p-1.5 rounded-full" />;
      case 'PushToProduction': return <Box className="h-8 w-8 text-purple-600 bg-purple-100 p-1.5 rounded-full" />;
      case 'SaveOpeningStock': return <Save className="h-8 w-8 text-indigo-600 bg-indigo-100 p-1.5 rounded-full" />;
      case 'SaveClosingStock': return <Save className="h-8 w-8 text-green-700 bg-green-100 p-1.5 rounded-full" />;
      case 'CreateProduct': return <Package className="h-8 w-8 text-blue-700 bg-blue-100 p-1.5 rounded-full" />;
      case 'UpdateStock': return <Settings className="h-8 w-8 text-gray-600 bg-gray-100 p-1.5 rounded-full" />;
      default: return <Package className="h-8 w-8 text-gray-500 bg-gray-100 p-1.5 rounded-full" />;
    }
  }

  function getActivityColor(op: string | undefined) {
    switch (op) {
      case 'CreateStock': return 'border-l-4 border-blue-500 bg-blue-50';
      case 'SubtractStockQuantity': return 'border-l-4 border-red-500 bg-red-50';
      case 'AddStockQuantity': return 'border-l-4 border-green-500 bg-green-50';
      case 'AddDefectiveGoods': return 'border-l-4 border-orange-400 bg-orange-50';
      case 'PushToProduction': return 'border-l-4 border-purple-500 bg-purple-50';
      case 'SaveOpeningStock': return 'border-l-4 border-indigo-500 bg-indigo-50';
      case 'SaveClosingStock': return 'border-l-4 border-green-600 bg-green-50';
      case 'CreateProduct': return 'border-l-4 border-blue-600 bg-blue-50';
      case 'UpdateStock': return 'border-l-4 border-gray-400 bg-gray-50';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  }

  const renderActivities = (activities: any[]) => (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
        <input
          type="text"
          className="border rounded px-3 py-2 w-full md:w-72 text-sm"
          placeholder="Search by operation, user, or details..."
          value={activitySearch}
          onChange={e => setActivitySearch(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500">Sort by:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={activitySort.field}
            onChange={e => setActivitySort(s => ({ ...s, field: e.target.value }))}
            title="Sort field"
          >
            <option value="timestamp">Time</option>
            <option value="operation_type">Operation</option>
            <option value="username">Username</option>
          </select>
          <button
            className="ml-1 px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100"
            onClick={() => setActivitySort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            title="Toggle sort direction"
          >
            {activitySort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>
      {/* Activities List */}
      <div className="grid gap-5">
        {filterAndSortActivities(activities).map((tx) => {
          const op = tx.operation_type || tx.operation || 'UnknownOperation';
          return (
            <div
              key={tx.transaction_id}
              className={`relative flex flex-col sm:flex-row items-stretch gap-4 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all ${getActivityColor(op)}`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 flex items-center justify-center">
                {getOperationIcon(op)}
              </div>
              {/* Main content */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-indigo-800 capitalize">{op}</span>
                    <span className="hidden sm:inline text-xs text-gray-400 font-mono">#{tx.transaction_id?.slice(0, 6) ?? ''}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{tx.timestamp ? format(new Date(tx.timestamp), 'HH:mm') : ''}</span>
                    <span className="flex items-center gap-1"><User className="h-4 w-4" />{tx.details?.username || 'N/A'}</span>
                  </div>
                </div>
                {/* Details grid */}
                {Object.entries(tx.details).length === 0 ? (
                  <div className="italic text-gray-400 text-sm">No details</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 bg-white/70 rounded-lg p-3 border border-gray-100">
                    {Object.entries(tx.details).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-gray-700 text-sm">
                        <span className="font-medium text-gray-600 capitalize whitespace-nowrap">{k.replace(/_/g, ' ')}:</span>
                        <span className="text-gray-900 break-all">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-400 font-mono">ID: {tx.transaction_id}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filterAndSortActivities(activities).length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">No activities found.</div>
        )}
      </div>
    </div>
  );

  // Helper to generate Excel file from table data
  const handleDownload = () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      // Prepare Items sheet data
      const items = (Array.isArray(reportData.items) ? reportData.items : []);
      const groupedRows = {};
      // Group normal items
      items.forEach(row => {
        if (row.description?.startsWith("TOTAL:")) return;
        const groupName = row.group_name || 'Uncategorized';
        const normGroupName = groupName.trim().toUpperCase();
        if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
        groupedRows[normGroupName].push(row);
      });
      // Attach TOTAL rows
      items.forEach(row => {
        if (row.description?.startsWith("TOTAL:")) {
          const match = row.description.match(/^TOTAL:\s*(.*)$/i);
          let groupName = match ? match[1].trim() : 'Uncategorized';
          const normGroupName = groupName.trim().toUpperCase();
          if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
          row.__isTotalRow = true;
          groupedRows[normGroupName].push(row);
        }
      });
      // Prepare main sheet data
      const mainSheetData = [];
      mainSheetData.push([
        'SL. NO', 'DESCRIPTION', 'RATE', 'OPENING STOCK', 'OPENING STOCK AMOUNT', 'STOCK INWARD', 'INWARD AMOUNT', 'CONSUMPTION', 'CONSUMPTION AMOUNT', 'BALANCE STOCK', 'BALANCE AMOUNT'
      ]);
      let slNo = 1;
      Object.entries(groupedRows).forEach(([group, groupItems]) => {
        mainSheetData.push([`${group}`]);
        const normalItems = groupItems.filter(item => !item.__isTotalRow);
        const totalRows = groupItems.filter(item => item.__isTotalRow);
        normalItems.forEach(item => {
          mainSheetData.push([
            slNo++,
            item.description,
            item.rate,
            item.opening_stock_qty,
            item.opening_stock_amount,
            item.inward_qty,
            item.inward_amount,
            item.consumption_qty,
            item.consumption_amount,
            item.balance_qty,
            item.balance_amount
          ]);
        });
        totalRows.forEach(totalRow => {
          mainSheetData.push([
            'TOTAL',
            totalRow.description,
            typeof totalRow.rate === 'undefined' ? '' : totalRow.rate,
            typeof totalRow.opening_stock_qty === 'undefined' ? '' : totalRow.opening_stock_qty,
            typeof totalRow.opening_stock_amount === 'undefined' ? '' : totalRow.opening_stock_amount,
            typeof totalRow.inward_qty === 'undefined' ? '' : totalRow.inward_qty,
            typeof totalRow.inward_amount === 'undefined' ? '' : totalRow.inward_amount,
            typeof totalRow.consumption_qty === 'undefined' ? '' : totalRow.consumption_qty,
            typeof totalRow.consumption_amount === 'undefined' ? '' : totalRow.consumption_amount,
            typeof totalRow.balance_qty === 'undefined' ? '' : totalRow.balance_qty,
            typeof totalRow.balance_amount === 'undefined' ? '' : totalRow.balance_amount
          ]);
        });
      });
      // Group Summary sheet data
      mainSheetData.push([]); // Empty row
      mainSheetData.push([
        'SL. NO', 'DESCRIPTION', 'OPENING STOCK', 'OPENING STOCK AMOUNT', 'STOCK INWARD', 'INWARD AMOUNT', 'CONSUMPTION', 'CONSUMPTION AMOUNT', 'BALANCE STOCK', 'BALANCE AMOUNT'
      ]);
      (Array.isArray(reportData.group_summary) ? reportData.group_summary : []).forEach((row, idx) => {
        mainSheetData.push([
          idx + 1,
          row.description,
          row.opening_stock_qty,
          row.opening_stock_amount,
          row.inward_qty,
          row.inward_amount,
          row.consumption_qty,
          row.consumption_amount,
          row.balance_qty,
          row.balance_amount
        ]);
      });
      // Create worksheet and workbook
      const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 18 }
      ];
      XLSX.writeFile(
        { SheetNames: ['Report'], Sheets: { Report: ws } },
        `daily-report-${selectedDate}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
      // Optionally handle error
    } finally {
      setIsDownloading(false);
    }
  };

  // Download Daily Activities as Excel
  const handleDownloadActivities = () => {
    if (!reportData || !reportData.transactions) return;
    setIsDownloading(true);
    try {
      // Flatten all activities into a single array
      const allActivities: any[] = [];
      Object.entries(reportData.transactions).forEach(([date, txBlock]: [string, any]) => {
        (Array.isArray(txBlock.operations) ? txBlock.operations : []).forEach((tx: any) => {
          allActivities.push({ date, ...tx });
        });
      });

      // Collect all unique detail keys for columns
      const detailKeys = new Set<string>();
      allActivities.forEach(tx => {
        if (tx.details && typeof tx.details === 'object') {
          Object.keys(tx.details).forEach(k => detailKeys.add(k));
        }
      });

      // Prepare sheet data
      const columns = [
        'Date', 'Operation', 'Transaction ID', 'Username', 'Timestamp', ...Array.from(detailKeys)
      ];
      const sheetData = [columns];
      allActivities.forEach(tx => {
        const row = [
          tx.date,
          tx.operation_type || tx.operation || '',
          tx.transaction_id || '',
          tx.details?.username || '',
          tx.timestamp ? format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          ...Array.from(detailKeys).map(k => tx.details?.[k] ?? '')
        ];
        sheetData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = columns.map(() => ({ wch: 18 }));
      XLSX.writeFile(
        { SheetNames: ['Daily Activities'], Sheets: { 'Daily Activities': ws } },
        `daily-activities-${selectedDate}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
      // Optionally handle error
    } finally {
      setIsDownloading(false);
    }
  };

  // --- MAIN RENDER ---
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
          <h1 className="text-2xl font-bold">Daily Report</h1>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="border-none focus:ring-0 text-sm w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Select report date"
              aria-label="Select report date"
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || !reportData}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </button>
          <button
            onClick={fetchReport}
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
      {reportData ? (
        <div className="space-y-8">
          {/* ITEMS TABLE */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Items</h2>
            {renderTable(
              [
                { key: 'description', label: 'Description', sortable: true },
                { key: 'rate', label: 'Rate', sortable: true },
                { key: 'opening_stock_qty', label: 'Opening Stock', sortable: true },
                { key: 'opening_stock_amount', label: 'Opening Amount', sortable: true },
                { key: 'inward_qty', label: 'Stock Inward', sortable: true },
                { key: 'inward_amount', label: 'Inward Amount', sortable: true },
                { key: 'consumption_qty', label: 'Consumption', sortable: true },
                { key: 'consumption_amount', label: 'Consumption Amount', sortable: true },
                { key: 'balance_qty', label: 'Balance Stock', sortable: true },
                { key: 'balance_amount', label: 'Balance Amount', sortable: true },
              ],
              ((reportData as any).items || []).map((item: any) => (
                item.hasOwnProperty('rate') && typeof item.rate !== 'undefined'
                  ? { ...item, rate: `\u20b9${item.rate}` }
                  : item
              )),
              'item-',
              itemSort,
              setItemSort
            )}
          </div>
          {/* GROUP SUMMARY TABLE */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Group Summary</h2>
            <div className="overflow-x-auto rounded-xl shadow-md border border-gray-300 bg-white">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">SL NO</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Opening Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Opening Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Stock Inward</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Inward Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Consumption</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Consumption Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Balance Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Balance Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {((reportData as any).group_summary || []).map((row: any, idx: number) => (
                    <tr key={idx} className={row.description === 'TOTAL' ? 'bg-gray-200 font-bold' : ''}>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{idx + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.opening_stock_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.opening_stock_amount}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.inward_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.inward_amount}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.consumption_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.consumption_amount}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.balance_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.balance_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* DAILY ACTIVITIES */}
          <div>
            <div className="flex items-center mb-2 gap-3">
              <h2 className="text-lg font-semibold">Daily Activities</h2>
              <button
                onClick={handleDownloadActivities}
                disabled={isDownloading || !reportData || !reportData.transactions}
                className={`flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm ${isDownloading || !reportData || !reportData.transactions ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Download Daily Activities as Excel"
              >
                {isDownloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                {isDownloading ? 'Downloading...' : 'Download Excel'}
              </button>
            </div>
            {Object.entries(reportData.transactions).map(([date, txBlock]) => (
              <div key={date} className="mb-6">
                <div className="text-sm text-gray-500 mb-2">{date}</div>
                {renderActivities((txBlock as { operations: any[] }).operations)}
              </div>
            ))}
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Daily Report Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a date and click "Generate Report" to view the data
          </p>
        </div>
      )}
    </div>
  );
};

export default DailyReport;

