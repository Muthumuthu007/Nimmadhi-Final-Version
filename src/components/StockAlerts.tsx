import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { StockAlert } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface StockAlertsProps {
  alerts: StockAlert[];
}

export const StockAlerts: React.FC<StockAlertsProps> = ({ alerts }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (alerts.length === 0) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Prepare data for Excel
      const data = alerts.map(alert => ({
        'Material Name': alert.materialName,
        'Available Quantity': alert.available,
        'Minimum Stock Limit': alert.minStockLimit,
        'Status': 'Low Stock',
        'Shortage': alert.minStockLimit - alert.available
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = [
        { wch: 30 }, // Material Name
        { wch: 15 }, // Available Quantity
        { wch: 15 }, // Minimum Stock Limit
        { wch: 10 }, // Status
        { wch: 10 }  // Shortage
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Low Stock Alerts');

      // Generate filename with current date
      const fileName = `low-stock-alerts-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error downloading alerts:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">Low Stock Alerts ({alerts.length})</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`p-1.5 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded-md transition-colors
                ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Download alerts"
              title="Download alerts as Excel"
            >
              <Download className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded-md transition-colors"
              aria-label={isExpanded ? "Collapse alerts" : "Expand alerts"}
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-3 border-t border-yellow-200 pt-3">
            <ul className="list-disc list-inside space-y-1">
              {alerts.map(alert => (
                <li key={alert.materialId} className="text-sm text-yellow-700">
                  <span className="font-medium">{alert.materialName}</span>: {alert.available} units available 
                  (Minimum limit: {alert.minStockLimit})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};