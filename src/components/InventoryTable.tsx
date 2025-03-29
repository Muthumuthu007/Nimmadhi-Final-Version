import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { format } from 'date-fns';

interface PendingChanges {
  stock?: number;
  defective?: number;
  unit?: string;
  cost?: number;
  stockLimit?: number;
}

interface InventoryTableProps {
  materials: RawMaterial[];
  onUpdateStock: (materialId: string, quantity: number) => void;
  onSubtractStock: (materialId: string, quantity: number) => void;
  onUpdateStockLimit: (materialId: string, limit: number) => void;
  onUpdateDefective: (materialId: string, quantity: number) => void;
  onSubtractDefective: (materialId: string, quantity: number) => void;
  onUpdateMaterialDetails: (materialId: string, updates: {
    unit?: string;
    cost?: number;
    defective?: number;
  }) => void;
  onDeleteStock: (materialId: string) => void;
}

interface EditableFieldState {
  materialId: string;
  type: 'stock' | 'defective' | 'unit' | 'cost' | 'stockLimit' | null;
}

type SortField = 'name' | 'available' | 'defective' | 'cost' | 'totalCost' | 'stockLimit' | 'createdAt';
type SortDirection = 'asc' | 'desc';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined) => {
  if (!dateString) {
    console.log('No date string provided');
    return null;
  }
  
  try {
    console.log('Raw date string:', dateString);
    
    // Try to convert ISO string first (standard format)
    let date = new Date(dateString);
    
    // If that fails, try different formats
    if (isNaN(date.getTime())) {
      // Try to parse DD/MM/YYYY
      const parts = dateString.split(/[\/\-]/);
      if (parts.length === 3) {
        // Try different date arrangements
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date after all attempts:', dateString);
      return null;
    }
    
    return {
      date: format(date, 'MMM d, yyyy'),
      time: format(date, 'h:mm a')
    };
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return null;
  }
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return '₹' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const InventoryTable: React.FC<InventoryTableProps> = ({
  materials,
  onUpdateStock,
  onSubtractStock,
  onUpdateStockLimit,
  onUpdateDefective,
  onSubtractDefective,
  onUpdateMaterialDetails,
  onDeleteStock
}) => {
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [editingField, setEditingField] = useState<EditableFieldState>({
    materialId: '',
    type: null
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMaterials = [...materials].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'available':
        comparison = a.available - b.available;
        break;
      case 'defective':
        comparison = (a.defectiveQuantity || 0) - (b.defectiveQuantity || 0);
        break;
      case 'cost':
        comparison = a.cost - b.cost;
        break;
      case 'totalCost':
        comparison = (a.cost * a.available) - (b.cost * b.available);
        break;
      case 'stockLimit':
        comparison = (a.minStockLimit || 0) - (b.minStockLimit || 0);
        break;
      case 'createdAt':
        const dateA = new Date((a as any).created_at || 0);
        const dateB = new Date((b as any).created_at || 0);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleStockLimitChange = (materialId: string, value: number) => {
    setPendingChanges(prev => ({
      ...prev,
      stockLimit: value
    }));
  };

  const handleUnitChange = (materialId: string, value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      unit: value
    }));
  };

  const handleCostChange = (materialId: string, value: number) => {
    setPendingChanges(prev => ({
      ...prev,
      cost: value
    }));
  };

  const handleUpdate = async (materialId: string) => {
    const changes = pendingChanges;
    if (!changes) return;

    if (changes.stockLimit !== undefined) {
      await onUpdateStockLimit(materialId, changes.stockLimit);
    }

    if (changes.unit !== undefined || changes.cost !== undefined) {
      await onUpdateMaterialDetails(materialId, {
        unit: changes.unit,
        cost: changes.cost
      });
    }

    setPendingChanges({});
    handleCloseEdit();
  };

  const handleClearDefective = async (materialId: string) => {
    await onUpdateMaterialDetails(materialId, { defective: 0 });
    handleCloseEdit();
  };

  const handleEditClick = (materialId: string, type: EditableFieldState['type']) => {
    setEditingField({
      materialId,
      type
    });
  };

  const handleCloseEdit = () => {
    setEditingField({
      materialId: '',
      type: null
    });
  };

  const handleDeleteClick = (materialId: string) => {
    setMaterialToDelete(materialId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    
    setIsDeletingMaterial(true);
    try {
      await onDeleteStock(materialToDelete);
    } finally {
      setIsDeletingMaterial(false);
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 w-full"
      title={`Sort by ${label}`}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <ArrowUpDown size={14} aria-hidden="true" />
    </button>
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-primary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="name" label="Material" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="available" label="Available" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="defective" label="Defective" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="cost" label="Cost Per Unit" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="totalCost" label="Total Cost" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="stockLimit" label="Stock Limit" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedMaterials.map((material) => {
              const changes = pendingChanges;
              const hasChanges = Object.keys(changes).length > 0;
              const isEditingDefective = editingField.materialId === material.id && editingField.type === 'defective';
              const isEditingStock = editingField.materialId === material.id && editingField.type === 'stock';
              const isEditingUnit = editingField.materialId === material.id && editingField.type === 'unit';
              const isEditingCost = editingField.materialId === material.id && editingField.type === 'cost';
              const isEditingStockLimit = editingField.materialId === material.id && editingField.type === 'stockLimit';

              return (
                <tr key={material.id} className={
                  material.minStockLimit && material.available <= material.minStockLimit
                    ? 'bg-yellow-50'
                    : ''
                }>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span>{material.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingStock ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={changes.stock}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              stock: Number(e.target.value)
                            }));
                          }}
                          className="w-20 px-2 py-1 border rounded"
                          title="Stock quantity"
                          aria-label="Stock quantity"
                          placeholder="Enter quantity"
                        />
                        <button
                          onClick={() => {
                            onUpdateStock(material.id, Number(changes.stock));
                            handleCloseEdit();
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Save changes"
                          aria-label="Save changes"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{material.available} {material.unit}</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'stock')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit stock quantity"
                          aria-label="Edit stock quantity"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {isEditingDefective ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={changes.defective}
                              onChange={(e) => {
                                setPendingChanges(prev => ({
                                  ...prev,
                                  defective: Number(e.target.value)
                                }));
                              }}
                              className="w-20 px-2 py-1 border rounded"
                              title="Defective quantity"
                              aria-label="Defective quantity"
                              placeholder="Enter quantity"
                            />
                            <button
                              onClick={() => {
                                onUpdateDefective(material.id, Number(changes.defective));
                                handleCloseEdit();
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Save changes"
                              aria-label="Save changes"
                            >
                              Save
                            </button>
                          </div>
                          <button
                            onClick={() => handleClearDefective(material.id)}
                            className="flex items-center justify-center space-x-1 text-red-600 hover:text-red-700 text-sm px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Clear All Defective</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{material.defectiveQuantity || 0} {material.unit}</span>
                          <button
                            onClick={() => handleEditClick(material.id, 'defective')}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit defective quantity"
                            aria-label="Edit defective quantity"
                          >
                            <Edit2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingUnit ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={changes.unit}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              unit: e.target.value
                            }));
                          }}
                          className="w-20 px-2 py-1 border rounded"
                          title="Unit"
                          aria-label="Unit"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{material.unit}</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'unit')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit unit"
                          aria-label="Edit unit"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingCost ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={changes.cost}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              cost: Number(e.target.value)
                            }));
                          }}
                          className="w-24 px-2 py-1 border rounded"
                          title="Cost per unit"
                          aria-label="Cost per unit"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>₹{material.cost}</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'cost')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit cost"
                          aria-label="Edit cost"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatCurrency(material.cost * material.available)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {isEditingStockLimit ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={changes.stockLimit}
                            onChange={(e) => {
                              setPendingChanges(prev => ({
                                ...prev,
                                stockLimit: Number(e.target.value)
                              }));
                            }}
                            className="w-20 px-2 py-1 border rounded text-sm"
                            title="Stock limit"
                            aria-label="Stock limit"
                            placeholder="Enter limit"
                          />
                          <span className="text-sm text-gray-500">{material.unit}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{material.minStockLimit || 0} {material.unit}</span>
                          <button
                            onClick={() => handleEditClick(material.id, 'stockLimit')}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit stock limit"
                            aria-label="Edit stock limit"
                          >
                            <Edit2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {hasChanges && (
                        <button
                          onClick={() => handleUpdate(material.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Save Changes
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(material.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete material"
                        aria-label="Delete material"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Material"
        message="Are you sure you want to delete this material? This action cannot be undone."
        isDeleting={isDeletingMaterial}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setMaterialToDelete(null);
        }}
      />
    </>
  );
};

export default InventoryTable;