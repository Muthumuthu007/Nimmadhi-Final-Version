import React, { useState, useEffect } from 'react';
import GroupTree from '../components/GroupTree';
import { Plus, Package2, ArrowUpDown, Save, Download } from 'lucide-react';
import { NewProductForm } from '../components/NewProductForm';
import { useInventory } from '../hooks/useInventory';
import { makeApiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { RawMaterial } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const Inventory = () => {
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOpeningStockSummary, setShowOpeningStockSummary] = useState(false);
  const [openingStockSummary, setOpeningStockSummary] = useState<any>(null);
  const [isSavingOpeningStock, setIsSavingOpeningStock] = useState(false);
  const [showClosingStockSummary, setShowClosingStockSummary] = useState(false);
  const [closingStockSummary, setClosingStockSummary] = useState<any>(null);
  const { user } = useAuth();
  const { refreshInventory, inventory } = useInventory();

  useEffect(() => {
    console.log("Inventory data:", inventory);
  }, [inventory]);

  const handleOpeningStock = async () => {
    setIsLoading(true);
    try {
      await makeApiRequest({
        operation: "UpdateOpeningStock",
        username: user.username
      });
      await refreshInventory();
    } catch (error: any) {
      console.error('Failed to update opening stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosingStock = async () => {
    setIsLoading(true);
    setClosingStockSummary(null);
    try {
      const response = await makeApiRequest({
        operation: "SaveClosingStock",
        username: user.username
      });
      if (response && response.message === "Closing stock saved successfully.") {
        setClosingStockSummary({
          message: response.message,
          date: response.date,
          timestamp: response.timestamp,
          aggregate_closing_qty: response.aggregate_closing_qty,
          aggregate_closing_amount: response.aggregate_closing_amount
        });
        setShowClosingStockSummary(true);
      }
    } catch (error: any) {
      setClosingStockSummary({
        message: error?.message || 'Failed to save closing stock.'
      });
      setShowClosingStockSummary(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOpeningStock = async () => {
    setIsSavingOpeningStock(true);
    setOpeningStockSummary(null);
    try {
      const response = await makeApiRequest({
        operation: "SaveOpeningStock",
        username: user.username
      });
      if (response && response.message === "Opening stock saved successfully.") {
        setOpeningStockSummary({
          message: response.message,
          report_date: response.report_date,
          timestamp: response.timestamp,
          aggregate_opening_qty: response.aggregate_opening_qty,
          aggregate_opening_amount: response.aggregate_opening_amount
        });
        setShowOpeningStockSummary(true);
      }
    } catch (error: any) {
      setOpeningStockSummary({
        message: error?.message || 'Failed to save opening stock.'
      });
      setShowOpeningStockSummary(true);
    } finally {
      setIsSavingOpeningStock(false);
    }
  };

  // --- DOWNLOAD EXCEL LOGIC ---
  const handleDownloadAllInventory = async () => {
    try {
      // Fetch the full group tree (same as GroupTree)
      const data: any[] = await makeApiRequest({ operation: 'GetAllStocks', username: user.username });
      // GroupNode type: { group_id, group_name, items, subgroups }
      const excelColumns = [
        { key: 'subgroup', label: 'Subgroup' },
        { key: 'name', label: 'Material' },
        { key: 'quantity', label: 'Available' },
        { key: 'defective', label: 'Defective' },
        { key: 'total_quantity', label: 'Total Qty' },
        { key: 'unit', label: 'UNIT' },
        { key: 'cost_per_unit', label: 'Cost Per Unit' },
        { key: 'total_cost', label: 'Total Cost' },
        { key: 'stock_limit', label: 'Stock Limit' },
      ];
      // Recursively collect all materials from all groups and subgroups
      const collectAllMaterials = (currentGroup: any, parentName: string = ''): any[] => {
        let materials: any[] = [];
        if (currentGroup.items && currentGroup.items.length > 0) {
          materials = materials.concat(
            currentGroup.items.map((item: any) => ({
              ...item,
              subgroup: parentName || 'Main Group',
            }))
          );
        }
        if (currentGroup.subgroups && currentGroup.subgroups.length > 0) {
          currentGroup.subgroups.forEach((subgroup: any) => {
            materials = materials.concat(
              collectAllMaterials(subgroup, subgroup.group_name)
            );
          });
        }
        return materials;
      };
      // Collect all materials from all main groups
      let allMaterials: any[] = [];
      for (const group of data) {
        allMaterials = allMaterials.concat(collectAllMaterials(group, group.group_name));
      }
      // Group materials by subgroup
      const groupedMaterials: { [key: string]: any[] } = allMaterials.reduce((acc: { [key: string]: any[] }, material: any) => {
        const subgroup = material.subgroup;
        if (!acc[subgroup]) acc[subgroup] = [];
        acc[subgroup].push(material);
        return acc;
      }, {} as { [key: string]: any[] });
      // Sort subgroups alphabetically, but keep Main Group first
      const sortedSubgroups = Object.keys(groupedMaterials).sort((a, b) => {
        if (a === 'Main Group') return -1;
        if (b === 'Main Group') return 1;
        return a.localeCompare(b);
      });
      // Prepare data for Excel with hierarchy
      const dataRows: any[] = [];
      dataRows.push(excelColumns.map(col => col.label)); // Header row
      sortedSubgroups.forEach((subgroup: string) => {
        const materials = groupedMaterials[subgroup];
        // Add subgroup header
        dataRows.push([subgroup, ...Array(excelColumns.length - 1).fill('')]);
        // Add materials for this subgroup
        materials.forEach((item: any) => {
          const row: { [key: string]: any } = {};
          excelColumns.forEach(col => {
            if (col.key === 'total_cost') {
              row[col.label] = (Number(item.quantity) * Number(item.cost_per_unit)).toFixed(2);
            } else {
              row[col.label] = item[col.key];
            }
          });
          dataRows.push(Object.values(row));
        });
        // Add subtotal row for this subgroup
        const subtotal = {
          quantity: materials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
          defective: materials.reduce((sum: number, item: any) => sum + (item.defective || 0), 0),
          total_cost: materials.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.cost_per_unit || 0)), 0),
        };
        dataRows.push([
          `Subtotal for ${subgroup}`,
          '',
          subtotal.quantity,
          subtotal.defective,
          '', '', '',
          subtotal.total_cost.toFixed(2),
          ''
        ]);
        dataRows.push(Array(excelColumns.length).fill(''));
      });
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      ws['!cols'] = excelColumns.map(col => ({ wch: Math.max(col.label.length + 5, 15) }));
      // Add styling for subgroup headers and subtotals
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        if (cell && cell.v && typeof cell.v === 'string' && cell.v.includes('Subtotal')) {
          cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } } };
        } else if (cell && cell.v && typeof cell.v === 'string' && (cell.v === 'Main Group' || !cell.v.includes('Subtotal'))) {
          cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F0FDF4' } } };
        }
      }
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      // Download file
      XLSX.writeFile(wb, `full-inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      // Optionally show a user-friendly error message
      console.error('Error downloading inventory:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowNewProduct(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Product
          </button>
          <button
            onClick={handleSaveOpeningStock}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            disabled={isSavingOpeningStock}
            title="Save Opening Stock"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSavingOpeningStock ? 'Saving...' : 'Save Opening Stock'}
          </button>
          <button
            onClick={handleClosingStock}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Closing Stock
          </button>
          <button
            onClick={handleDownloadAllInventory}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            title="Download Inventory Excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </button>
        </div>
      </div>
      
      <GroupTree />
      <DefectiveReport />

      {showNewProduct && (
        <NewProductForm
          inventory={inventory}
          onClose={() => setShowNewProduct(false)}
          onAddProduct={async (product) => {
            try {
              await makeApiRequest({
                operation: "AddProduct",
                username: user.username,
                product: product
              });
              setShowNewProduct(false);
              await refreshInventory();
            } catch (error: any) {
              console.error('Failed to add product:', error);
            }
          }}
        />
      )}

      {/* Opening Stock Summary Modal */}
      {showOpeningStockSummary && openingStockSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowOpeningStockSummary(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-green-700 flex items-center">
              <Save className="w-5 h-5 mr-2 text-green-600" />
              Opening Stock Saved
            </h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">✅ Message:</span> {openingStockSummary.message}</div>
              {openingStockSummary.report_date && (
                <div><span className="font-semibold">🗓 Report Date:</span> {openingStockSummary.report_date}</div>
              )}
              {openingStockSummary.timestamp && (
                <div><span className="font-semibold">⏱ Timestamp:</span> {openingStockSummary.timestamp}</div>
              )}
              {openingStockSummary.aggregate_opening_qty !== undefined && (
                <div><span className="font-semibold">📊 Aggregate Opening Qty:</span> {openingStockSummary.aggregate_opening_qty}</div>
              )}
              {openingStockSummary.aggregate_opening_amount !== undefined && (
                <div><span className="font-semibold">💰 Aggregate Opening Amount:</span> {openingStockSummary.aggregate_opening_amount}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closing Stock Summary Modal */}
      {showClosingStockSummary && closingStockSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowClosingStockSummary(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-blue-700 flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2 text-blue-600" />
              Closing Stock Saved
            </h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">✅ Message:</span> {closingStockSummary.message}</div>
              {closingStockSummary.date && (
                <div><span className="font-semibold">🗓 Date:</span> {closingStockSummary.date}</div>
              )}
              {closingStockSummary.timestamp && (
                <div><span className="font-semibold">⏱ Timestamp:</span> {closingStockSummary.timestamp}</div>
              )}
              {closingStockSummary.aggregate_closing_qty !== undefined && (
                <div><span className="font-semibold">📊 Aggregate Closing Qty:</span> {closingStockSummary.aggregate_closing_qty}</div>
              )}
              {closingStockSummary.aggregate_closing_amount !== undefined && (
                <div><span className="font-semibold">💰 Aggregate Closing Amount:</span> {closingStockSummary.aggregate_closing_amount}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DefectiveReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchDefectiveReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await makeApiRequest({ operation: 'GetAllDescriptions' });
      setData(Array.isArray(res) ? res : []);
      setExpanded(true);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch defective report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data.length) return;
    const worksheetData = data.map(row => ({
      'Stock': row.stock,
      'Username': row.username,
      'Created At': row.created_at,
      'Description': row.description,
    }));
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defective Report');
    XLSX.writeFile(wb, `defective-report-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="mb-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <span role="img" aria-label="defective">🛑</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Defective Report</h3>
                <p className="text-sm text-red-600">{data.length} records found</p>
              </div>
            </div>
            <div className="flex flex-1 gap-2 items-center justify-end">
              <button
                onClick={fetchDefectiveReport}
                disabled={loading}
                className={`p-2 text-red-700 hover:text-red-900 hover:bg-red-100 rounded-md transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Fetch Defective Report"
                title="Fetch Defective Report"
              >
                {loading ? 'Loading...' : 'Show Defective Report'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!data.length}
                className={`p-2 text-red-700 hover:text-red-900 hover:bg-red-100 rounded-md transition-colors ${!data.length ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Download Defective Report"
                title="Download as Excel"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2 text-red-700 hover:text-red-900 hover:bg-red-100 rounded-md transition-colors"
                aria-label={expanded ? "Collapse report" : "Expand report"}
              >
                {expanded ? '−' : '+'}
              </button>
            </div>
          </div>
        </div>
        {expanded && (
          <div className="overflow-x-auto">
            {error && <div className="text-red-600 p-4">{error}</div>}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.created_at}</td>
                    <td className="px-6 py-4 whitespace-pre-line text-sm text-gray-900">{row.description}</td>
                  </tr>
                ))}
                {data.length === 0 && !loading && !error && (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;