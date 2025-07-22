import React, { useEffect, useState } from 'react';
import { makeApiRequest } from '../utils/api';
import { NewGroupForm } from './NewGroupForm';
import { NewMaterialForm } from './NewMaterialForm';
import { Edit2, Trash2, Check, X, ArrowUpDown, Download, MessageCircle } from 'lucide-react';
import { StockAlerts } from './StockAlerts';
import { checkStockAlerts } from '../utils/stockMonitoring';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';
import StockAdjustModal from './StockAdjustModal';

// Types for API response
interface MaterialItem {
  item_id: string;
  name: string;
  quantity: number;
  defective: number;
  cost_per_unit: number;
  stock_limit: number;
  unit: string;
  total_cost: number;
  total_quantity: number;
  created_at?: string;
  updated_at?: string;
  // Add more fields as needed
}

interface GroupNode {
  group_id: string | null;
  group_name: string;
  items: MaterialItem[];
  subgroups: GroupNode[];
}

const GROUP_TABLE_HEADER = [
  { key: 'name', label: 'Material' },
  { key: 'quantity', label: 'Available' },
  { key: 'defective', label: 'Defective' },
  { key: 'total_quantity', label: 'Total Qty' },
  { key: 'unit', label: 'UNIT' },
  { key: 'cost_per_unit', label: 'Cost Per Unit' },
  { key: 'total_cost', label: 'Total Cost' },
  { key: 'stock_limit', label: 'Stock Limit' },
  { key: 'actions', label: 'ACTIONS' },
];

const GroupTree: React.FC = () => {
  const { user } = useAuth();
  const [tree, setTree] = useState<GroupNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showSubgroupForm, setShowSubgroupForm] = useState<{ parentId: string } | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState<{ groupId: string } | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<{ [id: string]: boolean }>({});
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mainGroupSortAsc, setMainGroupSortAsc] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupSearchTerms, setGroupSearchTerms] = useState<{ [key: string]: string }>({});
  const [deleteGroupLoading, setDeleteGroupLoading] = useState<string | null>(null);
  const [deleteGroupMessage, setDeleteGroupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string, name: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<'add' | 'subtract'>('add');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [isStockProcessing, setIsStockProcessing] = useState(false);
  const [showDefectiveModal, setShowDefectiveModal] = useState(false);
  const [defectiveModalMode, setDefectiveModalMode] = useState<'add' | 'subtract'>('add');
  const [selectedDefectiveMaterial, setSelectedDefectiveMaterial] = useState<MaterialItem | null>(null);
  const [isDefectiveProcessing, setIsDefectiveProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarksMaterial, setRemarksMaterial] = useState<MaterialItem | null>(null);
  const [remarksInput, setRemarksInput] = useState('');
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [viewedRemark, setViewedRemark] = useState<{ description: string; username: string; created_at: string } | null>(null);
  const [deepSearchTerm, setDeepSearchTerm] = useState('');

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line
  }, [refreshFlag]);

  async function fetchTree() {
    setLoading(true);
    try {
      const data = await makeApiRequest({ operation: 'GetAllStocks', username: user.username });
      setTree(data);
    } catch (e) {
      setTree([]);
    }
    setLoading(false);
  }

  // Add Main Group
  const handleAddGroup = async (name: string) => {
    await makeApiRequest({ operation: 'CreateGroup', name });
    setShowGroupForm(false);
    setRefreshFlag(f => f + 1);
  };

  // Add Subgroup
  const handleAddSubgroup = async (name: string, parentId: string) => {
    await makeApiRequest({ operation: 'CreateGroup', name, parent_id: parentId });
    setShowSubgroupForm(null);
    setRefreshFlag(f => f + 1);
  };

  // Add Material
  const handleAddMaterial = async (material: any, groupId: string) => {
    await makeApiRequest({
      operation: 'CreateStock',
      ...material,
      group_id: groupId,
      username: user.username
    });
    setShowMaterialForm(null);
    setRefreshFlag(f => f + 1);
  };

  const handleEdit = (item: any) => {
    setEditingMaterial(item.item_id);
    setEditValues({ ...item });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditValues((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditingMaterial(null);
    setEditValues({});
  };

  const handleEditSave = async (groupId: string, item: any) => {
    await makeApiRequest({
      operation: 'UpdateStock',
      item_id: item.item_id,
      group_id: groupId,
      name: editValues.name,
      quantity: Number(editValues.quantity),
      defective: Number(editValues.defective),
      cost_per_unit: Number(editValues.cost_per_unit),
      stock_limit: Number(editValues.stock_limit),
      unit: editValues.unit,
      username: user.username,
    });
    setEditingMaterial(null);
    setEditValues({});
    setRefreshFlag(f => f + 1);
  };

  const handleDelete = async (item: any) => {
    try {
      const response = await makeApiRequest({
        operation: 'DeleteStock',
        name: item.name,
        username: user.username
      });
      if (response && response.message && response.message.toLowerCase().includes('deleted successfully')) {
        setMessage('Stock deleted successfully.');
      }
      setRefreshFlag(f => f + 1);
    } catch (e: any) {
      setError(e.message || 'Failed to delete stock.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    setIsDeletingMaterial(true);
    try {
      await handleDelete(materialToDelete);
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDownloadGroupMaterials = (groupName: string, items: any[], group: GroupNode) => {
    try {
      // Define the columns for the Excel sheet (excluding 'actions')
      const excelColumns = [
        { key: 'subgroup', label: 'Subgroup' },
        ...GROUP_TABLE_HEADER.filter(col => col.key !== 'actions')
      ];

      // Recursively collect all materials from this group and its subgroups
      const collectAllMaterials = (currentGroup: GroupNode, parentName: string = ''): any[] => {
        let materials: any[] = [];
        
        // Add materials from current group
        if (currentGroup.items && currentGroup.items.length > 0) {
          materials = materials.concat(
            currentGroup.items.map(item => ({
              ...item,
              subgroup: parentName || 'Main Group'
            }))
          );
        }
        
        // Recursively add materials from subgroups
        if (currentGroup.subgroups && currentGroup.subgroups.length > 0) {
          currentGroup.subgroups.forEach(subgroup => {
            materials = materials.concat(
              collectAllMaterials(subgroup, subgroup.group_name)
            );
          });
        }
        
        return materials;
      };

      // Get all materials including those from subgroups
      const allMaterials = collectAllMaterials(group);

      // Group materials by subgroup
      const groupedMaterials = allMaterials.reduce((acc: { [key: string]: any[] }, material) => {
        const subgroup = material.subgroup;
        if (!acc[subgroup]) {
          acc[subgroup] = [];
        }
        acc[subgroup].push(material);
        return acc;
      }, {});

      // Sort subgroups alphabetically
      const sortedSubgroups = Object.keys(groupedMaterials).sort((a, b) => {
        if (a === 'Main Group') return -1;
        if (b === 'Main Group') return 1;
        return a.localeCompare(b);
      });

      // Prepare data for Excel with hierarchy
      const data: any[] = [];
      
      // Add header row
      data.push(excelColumns.map(col => col.label));

      // Process each subgroup
      sortedSubgroups.forEach(subgroup => {
        const materials = groupedMaterials[subgroup];
        
        // Add subgroup header
        data.push([subgroup, ...Array(excelColumns.length - 1).fill('')]);
        
        // Add materials for this subgroup
        const sortedMaterials = materials
          .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a, b) => {
            let aVal: any, bVal: any;
            if (sortField === 'name') {
              aVal = a.name.toLowerCase();
              bVal = b.name.toLowerCase();
            } else if (sortField === 'quantity') {
              aVal = a.quantity;
              bVal = b.quantity;
            } else if (sortField === 'defective') {
              aVal = a.defective;
              bVal = b.defective;
            } else if (sortField === 'unit') {
              aVal = a.unit.toLowerCase();
              bVal = b.unit.toLowerCase();
            } else if (sortField === 'cost_per_unit') {
              aVal = a.cost_per_unit;
              bVal = b.cost_per_unit;
            } else if (sortField === 'total_cost') {
              aVal = a.quantity * a.cost_per_unit;
              bVal = b.quantity * b.cost_per_unit;
            } else if (sortField === 'stock_limit') {
              aVal = a.stock_limit;
              bVal = b.stock_limit;
            } else {
              return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });

        // Add materials to data
        sortedMaterials.forEach(item => {
          const row: any = {};
          excelColumns.forEach(col => {
            if (col.key === 'total_cost') {
              row[col.label] = (Number(item.quantity) * Number(item.cost_per_unit)).toFixed(2);
            } else {
              row[col.label] = item[col.key];
            }
          });
          data.push(Object.values(row));
        });

        // Add subtotal row for this subgroup
        const subtotal = {
          quantity: materials.reduce((sum, item) => sum + item.quantity, 0),
          defective: materials.reduce((sum, item) => sum + item.defective, 0),
          total_cost: materials.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0)
        };
        
        data.push([
          `Subtotal for ${subgroup}`,
          '', // Material (empty)
          subtotal.quantity, // Available
          subtotal.defective, // Defective
          '', // Total Qty (empty)
          '', // Unit (empty)
          '', // Cost per unit (empty)
          subtotal.total_cost.toFixed(2), // Total Cost
          '' // Stock limit (empty)
        ]);

        // Add empty row for visual separation
        data.push(Array(excelColumns.length).fill(''));
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Set column widths (basic estimation)
      const colWidths = excelColumns.map(col => ({ wch: Math.max(col.label.length + 5, 15) }));
      ws['!cols'] = colWidths;

      // Add styling for subgroup headers and subtotals
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        if (cell && cell.v && typeof cell.v === 'string' && cell.v.includes('Subtotal')) {
          // Style subtotal rows
          cell.s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E2E8F0" } }
          };
        } else if (cell && cell.v && typeof cell.v === 'string' && 
                  (cell.v === 'Main Group' || !cell.v.includes('Subtotal'))) {
          // Style subgroup headers
          cell.s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "F0FDF4" } }
          };
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, groupName.substring(0, 31)); // Sheet name max 31 chars

      // Generate filename with group name and current date
      const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_ ')}-inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error downloading group inventory:', error);
      // Optionally show a user-friendly error message
    }
  };

  // Add this function to handle group-specific search
  const handleGroupSearch = (groupId: string, value: string) => {
    setGroupSearchTerms(prev => ({
      ...prev,
      [groupId]: value
    }));
  };

  // Recursive render for groups/subgroups/items
  function renderGroup(group: GroupNode, level = 0) {
    const groupKey = group.group_id || group.group_name;
    const expanded = expandedGroups[groupKey] ?? false;
    const isMainGroup = level === 0;
    const isNullGroup = group.group_id === null || group.group_name === 'null';

    // Card Layout for both main groups and subgroups
    const cardBase =
      'rounded-xl shadow-lg border border-lime-100 bg-gradient-to-br from-lime-50 to-white hover:shadow-xl transition-all duration-200';
    const headerBase =
      'flex flex-col sm:flex-row sm:items-center justify-between rounded-t-xl border-b border-lime-200 bg-gradient-to-r from-lime-200 via-lime-100 to-white';
    const groupScale = isMainGroup ? 'px-6 py-4' : 'px-4 py-2';
    const groupFont = isMainGroup ? 'text-xl' : 'text-base';
    const groupNameFont = isMainGroup ? 'font-extrabold' : 'font-bold';
    const groupIdFont = isMainGroup ? 'text-xs' : 'text-[10px]';
    const cardMargin = isMainGroup ? 'mb-6' : 'mb-3 ml-6';
    const actionBtn =
      'flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg border shadow-sm transition';
    const addSubgroupBtn = 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200';
    const addMaterialBtn = 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200';
    const expandBtn = 'flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow';

    // Filter and sort items within this group
    const filteredItems = group.items.filter(item =>
      item.name.toLowerCase().includes((groupSearchTerms[groupKey] || '').toLowerCase())
    );

    // Sort items
    const sortedItems = [...filteredItems].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === 'quantity') {
        aVal = a.quantity;
        bVal = b.quantity;
      } else if (sortField === 'defective') {
        aVal = a.defective;
        bVal = b.defective;
      } else if (sortField === 'unit') {
        aVal = a.unit.toLowerCase();
        bVal = b.unit.toLowerCase();
      } else if (sortField === 'cost_per_unit') {
        aVal = a.cost_per_unit;
        bVal = b.cost_per_unit;
      } else if (sortField === 'total_cost') {
        aVal = a.quantity * a.cost_per_unit;
        bVal = b.quantity * b.cost_per_unit;
      } else if (sortField === 'stock_limit') {
        aVal = a.stock_limit;
        bVal = b.stock_limit;
      } else {
        return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div key={groupKey} className={`${cardBase} ${cardMargin}`}>
        <div className={`${headerBase} ${groupScale}`}>
          <div className="flex items-center gap-3">
            <div>
              <div className={`${groupNameFont} text-gray-900`}>{group.group_name}</div>
              <div className={`${groupIdFont} text-gray-500`}>ID: {group.group_id || 'N/A'}</div>
            </div>
            {group.group_id && (
              <button
                className="ml-2 text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded-full p-1.5 transition shadow-sm"
                onClick={() => setGroupToDelete({ id: group.group_id!, name: group.group_name })}
                title="Delete Group"
                disabled={deleteGroupLoading === group.group_id}
              >
                {deleteGroupLoading === group.group_id ? (
                  <span className="animate-spin"><Trash2 size={18} /></span>
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {group.group_id && (
              <>
                <button
                  className={`${actionBtn} ${addSubgroupBtn}`}
                  style={{ fontSize: isMainGroup ? '0.85rem' : '0.75rem' }}
                  onClick={() => setShowSubgroupForm({ parentId: group.group_id! })}
                  title="Add Subgroup"
                >
                  <span className="hidden sm:inline">Add Subgroup</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  className={`${actionBtn} ${addMaterialBtn}`}
                  style={{ fontSize: isMainGroup ? '0.85rem' : '0.75rem' }}
                  onClick={() => setShowMaterialForm({ groupId: group.group_id! })}
                  title="Add Material"
                >
                  <span className="hidden sm:inline">Add Material</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  className={`${actionBtn} text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200`}
                  onClick={() => handleDownloadGroupMaterials(group.group_name, sortedItems, group)}
                  title={`Download '${group.group_name}' Inventory`}
                >
                  <span className="hidden sm:inline">Download</span>
                  <Download size={18} />
                </button>
              </>
            )}
            <button
              onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !expanded }))}
              className={`${expandBtn} ${groupFont}`}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        {expanded && (
          <div className="p-4">
            {/* Add search bar for this group */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search materials in this group..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition"
                value={groupSearchTerms[groupKey] || ''}
                onChange={(e) => handleGroupSearch(groupKey, e.target.value)}
              />
            </div>
            {/* Items as Table */}
            {sortedItems.length > 0 && (
              <div className="overflow-x-auto mt-2 animate-fade-in">
                <table className="min-w-full rounded-xl border border-gray-200 shadow-sm">
                  <thead>
                    <tr className="bg-lime-600">
                      {GROUP_TABLE_HEADER.map(col => (
                        <th
                          key={col.key}
                          className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider select-none cursor-pointer whitespace-nowrap"
                          onClick={() => col.key !== 'actions' && handleSort(col.key)}
                          style={{ position: 'sticky', top: 0, background: '#7ac943' }}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.key !== 'actions' && <ArrowUpDown size={14} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedItems.map((item, idx) => (
                      <tr
                        key={item.item_id}
                        className={
                          (idx % 2 === 0 ? 'bg-gray-50' : 'bg-white') +
                          ' transition-all duration-150 hover:bg-lime-50'
                        }
                        style={{ transition: 'background 0.2s' }}
                      >
                        {/* Material Name */}
                        <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                        {/* Available */}
                        <td className="px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-24 px-3 py-1 border border-lime-200 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition"
                              value={editValues.quantity}
                              onChange={e => handleEditChange('quantity', e.target.value)}
                              title="Available quantity"
                              placeholder="Available"
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSubtractStock(item)}
                                className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                                disabled={loadingId === item.item_id}
                                title="Subtract quantity"
                                aria-label="Subtract quantity"
                              >
                                −
                              </button>
                              <span>{item.quantity} {item.unit}</span>
                              <button
                                onClick={() => handleAddStock(item)}
                                className="px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50"
                                disabled={loadingId === item.item_id}
                                title="Add quantity"
                                aria-label="Add quantity"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>
                        {/* Defective */}
                        <td className="px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-24 px-3 py-1 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none transition"
                              value={editValues.defective}
                              onChange={e => handleEditChange('defective', e.target.value)}
                              title="Defective quantity"
                              placeholder="Defective"
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleSubtractDefective(item)}
                                className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                                disabled={loadingId === item.item_id}
                                title="Subtract defective quantity"
                                aria-label="Subtract defective quantity"
                              >
                                −
                              </button>
                              <span>{item.defective} {item.unit}</span>
                              <button
                                onClick={() => handleAddDefective(item)}
                                className="px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50"
                                disabled={loadingId === item.item_id}
                                title="Add defective quantity"
                                aria-label="Add defective quantity"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>
                        {/* Total Qty */}
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          {item.total_quantity !== undefined ? item.total_quantity : '-'}
                        </td>
                        {/* Unit */}
                        <td className="px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="text"
                              className="w-16 px-3 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
                              value={editValues.unit}
                              onChange={e => handleEditChange('unit', e.target.value)}
                              title="Unit"
                              placeholder="Unit"
                            />
                          ) : (
                            item.unit
                          )}
                        </td>
                        {/* Cost Per Unit */}
                        <td className="px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-28 px-3 py-1 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
                              value={editValues.cost_per_unit}
                              onChange={e => handleEditChange('cost_per_unit', e.target.value)}
                              title="Cost per unit"
                              placeholder="Cost per unit"
                            />
                          ) : (
                            `₹${item.cost_per_unit}`
                          )}
                        </td>
                        {/* Total Cost */}
                        <td className="px-6 py-3 whitespace-nowrap">₹{(editingMaterial === item.item_id ? (Number(editValues.quantity) * Number(editValues.cost_per_unit)) : (item.quantity * item.cost_per_unit)).toFixed(2)}</td>
                        {/* Stock Limit */}
                        <td className="px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-24 px-3 py-1 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 outline-none transition"
                              value={editValues.stock_limit}
                              onChange={e => handleEditChange('stock_limit', e.target.value)}
                              title="Stock limit"
                              placeholder="Stock limit"
                            />
                          ) : (
                            item.stock_limit
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <div className="flex gap-2">
                              <button
                                className="text-green-600 hover:text-green-800 bg-green-50 border border-green-200 rounded-full p-1.5 transition shadow-sm"
                                onClick={() => handleEditSave(String(group.group_id), item)}
                                title="Save"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                className="text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200 rounded-full p-1.5 transition shadow-sm"
                                onClick={handleEditCancel}
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                className="text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded-full p-1.5 transition shadow-sm"
                                onClick={() => handleEdit(item)}
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded-full p-1.5 transition shadow-sm"
                                onClick={() => handleDeleteClick(item)}
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                              <button
                                className="p-1 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 focus:outline-none transition"
                                title="Remarks"
                                aria-label="Remarks"
                                onClick={() => openRemarksModal(item)}
                              >
                                <MessageCircle size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Empty state for items */}
            {sortedItems.length === 0 && searchTerm !== '' && (
              <div className="text-gray-400 text-sm italic mt-2">No materials match your search in this group.</div>
            )}
            {sortedItems.length === 0 && searchTerm === '' && (
              <div className="text-gray-400 text-xs italic mt-2">No materials in this group.</div>
            )}

            {/* Subgroups */}
            {group.subgroups && group.subgroups.length > 0 && (
              <div className="mt-2">
                {group.subgroups
                  .slice()
                  .sort((a, b) => {
                    if (!a.group_name || !b.group_name) return 0;
                    if (mainGroupSortAsc) {
                      return a.group_name.localeCompare(b.group_name);
                    } else {
                      return b.group_name.localeCompare(a.group_name);
                    }
                  })
                  .map(sub => (
                    <React.Fragment key={sub.group_id || sub.group_name}>
                      {renderGroup(sub, level + 1)}
                    </React.Fragment>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Recursively filter groups and subgroups by name
  function filterGroups(groups: GroupNode[], term: string): GroupNode[] {
    if (!term.trim()) return groups;
    const lower = term.toLowerCase();
    return groups
      .map(g => {
        const subFiltered = filterGroups(g.subgroups, term);
        if (g.group_name.toLowerCase().includes(lower) || subFiltered.length > 0) {
          return { ...g, subgroups: subFiltered };
        }
        return null;
      })
      .filter(Boolean) as GroupNode[];
  }

  // Helper to flatten all items in the group tree, with subgroup and main group context
  function flattenItemsWithContext(groups: GroupNode[], mainGroupName: string | null = null, parentGroupName: string | null = null): any[] {
    return groups.flatMap(g => {
      const currentMain = mainGroupName || g.group_name;
      const currentSub = parentGroupName ? g.group_name : null;
      const itemsWithContext = (g.items || []).map(item => ({
        ...item,
        subgroup: currentSub || 'Main Group',
        mainGroup: currentMain,
      }));
      return [
        ...itemsWithContext,
        ...(g.subgroups ? flattenItemsWithContext(g.subgroups, currentMain, g.group_name) : [])
      ];
    });
  }

  // Deep search results
  const deepSearchResults = deepSearchTerm.trim()
    ? flattenItemsWithContext(tree).filter(item =>
        item.name.toLowerCase().includes(deepSearchTerm.trim().toLowerCase())
      )
    : [];

  const handleDeleteGroup = async (groupId: string) => {
    setDeleteGroupLoading(groupId);
    setDeleteGroupMessage(null);
    try {
      const response = await makeApiRequest({ operation: 'DeleteGroup', group_id: groupId });
      if (response.message === 'Group deleted successfully') {
        setDeleteGroupMessage({ type: 'success', text: 'Group deleted successfully' });
        setRefreshFlag(f => f + 1);
      } else {
        setDeleteGroupMessage({ type: 'error', text: 'Group not deleted, please try again.' });
      }
    } catch (e) {
      setDeleteGroupMessage({ type: 'error', text: 'Group not deleted, please try again.' });
    } finally {
      setDeleteGroupLoading(null);
      setGroupToDelete(null);
    }
  };

  // Add/subtract handlers
  const handleAddStock = (item: MaterialItem) => {
    setSelectedMaterial(item);
    setStockModalMode('add');
    setShowStockModal(true);
  };

  const handleSubtractStock = (item: MaterialItem) => {
    setSelectedMaterial(item);
    setStockModalMode('subtract');
    setShowStockModal(true);
  };

  const handleStockModalConfirm = async (quantity: number) => {
    if (!selectedMaterial) return;
    setIsStockProcessing(true);
    setError(null);
    try {
      if (stockModalMode === 'add') {
        await makeApiRequest({
          operation: 'AddStockQuantity',
          name: selectedMaterial.name,
          quantity_to_add: quantity,
          username: user.username
        });
        setMessage(`Added ${quantity} units to stock '${selectedMaterial.name}'.`);
      } else {
        await makeApiRequest({
          operation: 'SubtractStockQuantity',
          name: selectedMaterial.name,
          quantity_to_subtract: quantity,
          username: user.username
        });
        setMessage(`Subtracted ${quantity} units from stock '${selectedMaterial.name}'.`);
      }
      setShowStockModal(false);
      setSelectedMaterial(null);
      fetchTree();
    } catch (e: any) {
      setError(e.message || `Failed to ${stockModalMode} stock.`);
    } finally {
      setIsStockProcessing(false);
    }
  };

  const handleStockModalCancel = () => {
    setShowStockModal(false);
    setSelectedMaterial(null);
  };

  const handleAddDefective = (item: MaterialItem) => {
    setSelectedDefectiveMaterial(item);
    setDefectiveModalMode('add');
    setShowDefectiveModal(true);
  };

  const handleSubtractDefective = (item: MaterialItem) => {
    setSelectedDefectiveMaterial(item);
    setDefectiveModalMode('subtract');
    setShowDefectiveModal(true);
  };

  const handleDefectiveModalConfirm = async (quantity: number) => {
    if (!selectedDefectiveMaterial) return;
    setIsDefectiveProcessing(true);
    setError(null);
    try {
      if (defectiveModalMode === 'add') {
        await makeApiRequest({
          operation: 'AddDefectiveGoods',
          name: selectedDefectiveMaterial.name,
          defective_to_add: quantity,
          username: user.username
        });
        setMessage(`Added ${quantity} defective units to '${selectedDefectiveMaterial.name}'.`);
      } else {
        await makeApiRequest({
          operation: 'SubtractDefectiveGoods',
          name: selectedDefectiveMaterial.name,
          defective_to_subtract: quantity,
          username: user.username
        });
        setMessage(`Subtracted ${quantity} defective units from '${selectedDefectiveMaterial.name}'.`);
      }
      setShowDefectiveModal(false);
      setSelectedDefectiveMaterial(null);
      fetchTree();
    } catch (e: any) {
      setError(e.message || `Failed to ${defectiveModalMode} defective quantity.`);
    } finally {
      setIsDefectiveProcessing(false);
    }
  };

  const handleDefectiveModalCancel = () => {
    setShowDefectiveModal(false);
    setSelectedDefectiveMaterial(null);
  };

  const handleDeleteClick = (item: any) => {
    setMaterialToDelete(item);
    setShowDeleteDialog(true);
  };

  const openRemarksModal = (material: MaterialItem) => {
    setRemarksMaterial(material);
    setShowRemarksModal(true);
    setRemarksInput('');
    setViewedRemark(null);
    setRemarksError(null);
  };

  const closeRemarksModal = () => {
    setShowRemarksModal(false);
    setRemarksMaterial(null);
    setRemarksInput('');
    setViewedRemark(null);
    setRemarksError(null);
  };

  const handleViewRemark = async () => {
    console.log('View triggered');
    if (!remarksMaterial) return;
    setRemarksLoading(true);
    setRemarksError(null);
    try {
      const res = await makeApiRequest({
        operation: 'GetDescription',
        stock: remarksMaterial.name,
      });
      if (res && res.description) {
        setViewedRemark(res);
      } else {
        setViewedRemark(null);
        setRemarksError('No remark found.');
      }
    } catch (e: any) {
      setRemarksError(e.message || 'Failed to fetch description.');
    } finally {
      setRemarksLoading(false);
    }
  };

  const handleSaveRemark = async () => {
    console.log('Save triggered');
    if (!remarksMaterial) return;
    setRemarksLoading(true);
    setRemarksError(null);
    try {
      const res = await makeApiRequest({
        operation: 'CreateDescription',
        stock: remarksMaterial.name,
        description: remarksInput,
        username: user.username,
      });
      setMessage(res.message || 'Description saved successfully.');
      // After saving, refresh the displayed remarks
      await handleViewRemark();
      setRemarksInput('');
    } catch (e: any) {
      setRemarksError(e.message || 'Failed to save description.');
    } finally {
      setRemarksLoading(false);
    }
  };

  // Top-level render
  return (
    <div className="p-4">
      {/* Global Deep Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          className="w-full sm:w-96 px-4 py-2 border border-lime-300 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition"
          placeholder="Deep search materials/items across all groups..."
          value={deepSearchTerm}
          onChange={e => setDeepSearchTerm(e.target.value)}
        />
      </div>
      {/* Deep Search Results Table */}
      {deepSearchTerm.trim() && (
        <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto animate-fade-in">
          <table className="min-w-full">
            <thead className="bg-lime-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Material Name</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subgroup</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Main Group</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cost Per Unit</th>
              </tr>
            </thead>
            <tbody>
              {deepSearchResults.length > 0 ? (
                deepSearchResults.map((item, idx) => (
                  <tr key={item.item_id || idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.subgroup}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.mainGroup}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.unit}</td>
                    <td className="px-4 py-2 whitespace-nowrap">₹{item.cost_per_unit}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-gray-400 italic">No materials found matching "{deepSearchTerm}"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Only show the normal group tree if not deep searching */}
      {!deepSearchTerm.trim() && (
        <div>
          {/* Low Stock Alerts */}
          <StockAlerts
            alerts={checkStockAlerts(
              flattenItemsWithContext(tree).map((item: any) => ({
                id: item.item_id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                cost: item.cost_per_unit,
                available: item.quantity,
                minStockLimit: item.stock_limit,
                defectiveQuantity: item.defective,
                created_at: item.created_at || undefined
              }))
            )}
          />
          {deleteGroupMessage && (
            <div className={`mb-4 p-3 rounded-md border flex items-center gap-2 ${deleteGroupMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {deleteGroupMessage.type === 'success' ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : (
                <X className="h-5 w-5 text-red-400" />
              )}
              <span>{deleteGroupMessage.text}</span>
              <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setDeleteGroupMessage(null)} title="Close">✕</button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold">Inventory Management</h2>
            <div className="flex flex-1 gap-2 items-center justify-end">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search groups..."
                className="w-full sm:w-64 px-4 py-2 rounded-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition text-sm bg-white"
                style={{ maxWidth: 300 }}
              />
              <button
                className="bg-lime-600 text-white px-4 py-2 rounded hover:bg-lime-700 shadow-sm flex items-center gap-2"
                onClick={() => setMainGroupSortAsc((asc) => !asc)}
                title={`Sort Main Groups ${mainGroupSortAsc ? 'Z-A' : 'A-Z'}`}
              >
                <ArrowUpDown size={18} />
                {mainGroupSortAsc ? 'A-Z' : 'Z-A'}
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm"
                onClick={() => setShowGroupForm(true)}
              >
                + Add Main Group
              </button>
              <button
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 border"
                onClick={() => setRefreshFlag(f => f + 1)}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="bg-white rounded shadow p-4">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div>
                {tree.length === 0 && <div className="text-gray-400">No groups found.</div>}
                {filterGroups(
                  tree
                    .slice()
                    .sort((a, b) => {
                      if (!a.group_name || !b.group_name) return 0;
                      if (mainGroupSortAsc) {
                        return a.group_name.localeCompare(b.group_name);
                      } else {
                        return b.group_name.localeCompare(a.group_name);
                      }
                    }),
                  searchTerm
                ).map(group => renderGroup(group))}
              </div>
            )}
          </div>
          {/* Main Group Modal */}
          {showGroupForm && (
            <NewGroupForm
              onClose={() => setShowGroupForm(false)}
              onSuccess={() => setRefreshFlag(f => f + 1)}
            />
          )}
          {/* Subgroup Modal */}
          {showSubgroupForm && (
            <NewGroupForm
              onClose={() => setShowSubgroupForm(null)}
              onSuccess={() => setRefreshFlag(f => f + 1)}
              parentId={showSubgroupForm.parentId}
            />
          )}
          {/* Material Modal */}
          {showMaterialForm && (
            <NewMaterialForm
              inventory={[]}
              onAddMaterial={mat => handleAddMaterial(mat, showMaterialForm.groupId)}
              onClose={() => setShowMaterialForm(null)}
            />
          )}
          <DeleteConfirmationDialog
            isOpen={!!groupToDelete}
            title="Delete Group"
            message={`Are you sure you want to delete the group '${groupToDelete?.name}' (ID: ${groupToDelete?.id})? This action cannot be undone.`}
            isDeleting={!!deleteGroupLoading}
            onConfirm={() => groupToDelete && handleDeleteGroup(groupToDelete.id)}
            onCancel={() => setGroupToDelete(null)}
          />
          {/* Toast/alert for feedback */}
          {message && (
            <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
              {message}
              <button className="ml-2 text-white font-bold" onClick={() => setMessage(null)}>&times;</button>
            </div>
          )}
          {error && (
            <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
              {error}
              <button className="ml-2 text-white font-bold" onClick={() => setError(null)}>&times;</button>
            </div>
          )}
          <StockAdjustModal
            isOpen={showStockModal}
            mode={stockModalMode}
            materialName={selectedMaterial?.name || ''}
            unit={selectedMaterial?.unit || ''}
            isProcessing={isStockProcessing}
            onConfirm={handleStockModalConfirm}
            onCancel={handleStockModalCancel}
          />
          {/* Defective Adjust Modal */}
          <StockAdjustModal
            isOpen={showDefectiveModal}
            mode={defectiveModalMode}
            materialName={selectedDefectiveMaterial?.name || ''}
            unit={selectedDefectiveMaterial?.unit || ''}
            isProcessing={isDefectiveProcessing}
            onConfirm={handleDefectiveModalConfirm}
            onCancel={handleDefectiveModalCancel}
          />
          <DeleteConfirmationDialog
            isOpen={showDeleteDialog}
            title="Delete Material"
            message={`Are you sure you want to delete '${materialToDelete?.name}'? This action cannot be undone.`}
            isDeleting={isDeletingMaterial}
            onConfirm={handleConfirmDelete}
            onCancel={() => { setShowDeleteDialog(false); setMaterialToDelete(null); }}
          />
          {showRemarksModal && remarksMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  onClick={closeRemarksModal}
                  aria-label="Close"
                >
                  ×
                </button>
                <h2 className="text-lg font-bold mb-4">Remarks for {remarksMaterial.name}</h2>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSaveRemark();
                  }}
                  className="mb-4"
                >
                  <label className="block text-sm font-medium mb-1">Write Remarks</label>
                  <textarea
                    className="w-full border rounded p-2 min-h-[60px]"
                    value={remarksInput}
                    onChange={e => setRemarksInput(e.target.value)}
                    placeholder="Enter remarks..."
                    disabled={remarksLoading}
                    rows={3}
                  />
                  <button
                    type="submit"
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    disabled={!remarksInput.trim() || remarksLoading}
                  >
                    {remarksLoading ? 'Saving...' : 'Save'}
                  </button>
                </form>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium">View Remarks</span>
                  <button
                    type="button"
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    onClick={handleViewRemark}
                    disabled={remarksLoading}
                  >
                    {remarksLoading ? 'Loading...' : 'View'}
                  </button>
                </div>
                {remarksError && <div className="text-red-500 text-sm mb-2">{remarksError}</div>}
                {viewedRemark && (
                  <div className="bg-gray-50 rounded p-3 mt-2">
                    <div className="text-gray-800 whitespace-pre-line">{viewedRemark.description}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      By {viewedRemark.username} on {viewedRemark.created_at}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupTree; 