import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight
} from 'lucide-react';
import { makeApiRequest } from '../../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';





const MonthlyReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [itemSort, setItemSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'description', dir: 'asc' });
  const [groupSort, setGroupSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'description', dir: 'asc' });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response: any = await makeApiRequest({
        operation: 'GetMonthlyReport',
        month: selectedMonth,
        username: user.username,
      });
      setReportData(response);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch monthly report');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SORTING, SEARCH, TABLE ---
  function sortRows(rows: any[], field: string, dir: 'asc' | 'desc') {
    return [...rows].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return dir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      aVal = (aVal ?? '').toString().toLowerCase();
      bVal = (bVal ?? '').toString().toLowerCase();
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const renderTable = (
    columns: { key: string; label: string; sortable?: boolean }[],
    rows: any[],
    keyPrefix: string,
    sortState: { field: string; dir: 'asc' | 'desc' },
    setSort: (s: { field: string; dir: 'asc' | 'desc' }) => void
  ): JSX.Element => {
    // Group items by group_name
    const groupedRows = rows.reduce((acc, row) => {
      const groupName = row.group_name || 'Uncategorized';
      if (!acc[groupName]) acc[groupName] = [];
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

  // --- DOWNLOAD EXCEL LOGIC ---
  const handleDownloadExcel = () => {
    if (!reportData) return;
    setIsLoading(true);
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
        `monthly-report-${selectedMonth}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
      // Optionally handle error
    } finally {
      setIsLoading(false);
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
              placeholder="Select month"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-w-[140px] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            {isLoading ? 'Loading...' : 'Generate Report'}
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={isLoading || !reportData}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${
              isLoading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Downloading...' : 'Download Excel'}
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
            <h2 className="text-lg font-semibold mb-2">Items</h2>
            {(() => {
              // Enhanced grouping: Attach TOTAL rows to their group
              const items = (Array.isArray(reportData?.items) ? reportData.items : []);
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
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
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
                  {(Array.isArray(reportData?.group_summary) ? reportData.group_summary : []).map((row: any, idx: number) => (
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