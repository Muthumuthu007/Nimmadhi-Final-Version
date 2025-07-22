import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, Clock, User, ArrowDownRight, ArrowUpRight,
  AlertTriangle, Plus, Boxes, TrendingDown, DollarSign, BarChart3,
  Save, Box, Truck, Settings, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight
} from 'lucide-react';
import { makeApiRequest } from '../../utils/api';
import { format, parse } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { downloadCSV, generateWeeklyReportCSV } from '../../utils/csvExport';
import * as XLSX from 'xlsx';

const WeeklyReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

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

  const handleDownload = async () => {
    if (!reportData) return;
    
    setIsDownloading(true);
    try {
      const csvData = generateWeeklyReportCSV(reportData);
      const filename = `weekly-report-${format(new Date(reportData.report_period.start_date), 'yyyy-MM-dd')}-to-${format(new Date(reportData.report_period.end_date), 'yyyy-MM-dd')}.csv`;
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
      const response = await makeApiRequest<any>({
        operation: 'GetWeeklyReport',
        start_date: startDate,
        end_date: endDate,
        username: user.username
      });

      if (!response || !response.items || response.items.length === 0) {
        throw new Error('No data found for the selected date range');
      }

      setReportData(response);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      setError(error?.message || 'Failed to fetch weekly report data');
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

  // --- SORTING LOGIC ---
  function sortRows(rows: any[], field: string, dir: 'asc' | 'desc') {
    return [...rows].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
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

  // --- TABLE RENDERER ---
  const renderTable = (
    columns: { key: string; label: string; sortable?: boolean }[],
    rows: any[],
    keyPrefix: string,
    sortState: { field: string; dir: 'asc' | 'desc' },
    setSort: (s: { field: string; dir: 'asc' | 'desc' }) => void
  ) => {
    // Group items by group_name
    const groupedRows = rows.reduce((acc, row) => {
      const groupName = row.group_name || 'Uncategorized';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(row);
      return acc;
    }, {} as Record<string, any[]>);

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
              const sortedItems = sortRows(groupItems as any[], sortState.field, sortState.dir);
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
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

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

  // --- ACTIVITY CARD RENDERER ---
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
              className={`relative flex flex-col sm:flex-row items-stretch gap-4 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all ${getOperationColor(op)}`}
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

  // --- DOWNLOAD EXCEL LOGIC ---
  const handleDownloadExcel = () => {
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
        `weekly-report-${startDate}_to_${endDate}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
      // Optionally handle error
    } finally {
      setIsDownloading(false);
    }
  };

  // --- DOWNLOAD DAILY ACTIVITIES EXCEL LOGIC ---
  const handleDownloadActivitiesExcel = () => {
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
        `weekly-activities-${startDate}_to_${endDate}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
      // Optionally handle error
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
          <h1 className="text-2xl font-bold">Weekly Report</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
          </div>

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

          <button
            onClick={handleDownloadExcel}
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
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </button>

          <button
            onClick={handleDownloadActivitiesExcel}
            disabled={isDownloading || !reportData}
            className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[180px] ${
              isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Daily Activities'}
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
            {(() => {
              // Enhanced grouping: Attach TOTAL rows to their group
              const items = (reportData.items || []);
              const groupedRows: Record<string, any[]> = {};
              // First, group normal rows
              items.forEach(row => {
                if (row.description?.startsWith("TOTAL:")) return;
                const groupName = row.group_name || 'Uncategorized';
                const normGroupName = groupName.trim().toUpperCase();
                if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
                groupedRows[normGroupName].push(row.hasOwnProperty('rate') && typeof row.rate !== 'undefined' ? { ...row, rate: `₹${row.rate}` } : row);
              });
              // Now, attach TOTAL rows to their group
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
              return (
                <div className="overflow-x-auto rounded-xl shadow-md border border-gray-300 bg-white">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">SL NO</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Rate</th>
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
                      {Object.entries(groupedRows).map(([groupName, groupItems]) => {
                        const normalItems = groupItems.filter(item => !item.__isTotalRow);
                        const totalRows = groupItems.filter(item => item.__isTotalRow);
                        const sortedItems = sortRows(normalItems, itemSort.field, itemSort.dir);
                        const isExpanded = expandedGroups[groupName] !== false;
                        return (
                          <React.Fragment key={groupName}>
                            <tr className="bg-yellow-200">
                              <td colSpan={11} className="px-4 py-2 text-sm font-bold text-yellow-900 border-t border-b border-gray-300 cursor-pointer select-none" onClick={() => toggleGroup(groupName)}>
                                <span className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="inline h-4 w-4" /> : <ChevronRight className="inline h-4 w-4" />}
                                  {groupName}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && sortedItems.map((row, idx) => (
                              <tr key={row.id || idx} className="hover:bg-indigo-50 transition-colors duration-150">
                                <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.description}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 border-t border-r border-gray-300">{row.rate}</td>
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
                            {isExpanded && totalRows.map((totalRow, tIdx) => (
                              <tr key={`total-${tIdx}`} className="bg-gray-200 font-bold">
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">TOTAL</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{totalRow.description}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.rate === 'undefined' ? '' : totalRow.rate}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.opening_stock_qty === 'undefined' ? '' : totalRow.opening_stock_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.opening_stock_amount === 'undefined' ? '' : totalRow.opening_stock_amount}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.inward_qty === 'undefined' ? '' : totalRow.inward_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.inward_amount === 'undefined' ? '' : totalRow.inward_amount}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.consumption_qty === 'undefined' ? '' : totalRow.consumption_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.consumption_amount === 'undefined' ? '' : totalRow.consumption_amount}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.balance_qty === 'undefined' ? '' : totalRow.balance_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400">{typeof totalRow.balance_amount === 'undefined' ? '' : totalRow.balance_amount}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
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
                  {(reportData.group_summary || []).map((row: any, idx: number) => (
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
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Daily Activities</h2>
              <button
                onClick={handleDownloadActivitiesExcel}
                disabled={isDownloading || !reportData}
                className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[180px] ${
                  isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDownloading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                {isDownloading ? 'Downloading...' : 'Download Daily Activities'}
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Weekly Report Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a date range and click "Generate Report" to view the data
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;