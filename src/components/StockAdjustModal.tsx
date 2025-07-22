import React, { useState } from 'react';
import { X, Plus, Minus, Loader2 } from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  mode: 'add' | 'subtract';
  materialName: string;
  unit: string;
  isProcessing: boolean;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  mode,
  materialName,
  unit,
  isProcessing,
  onConfirm,
  onCancel,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setQuantity('1');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdd = mode === 'add';
  const icon = isAdd ? <Plus className="h-7 w-7 text-green-600 bg-green-100 p-1.5 rounded-full" /> : <Minus className="h-7 w-7 text-red-600 bg-red-100 p-1.5 rounded-full" />;
  const title = isAdd ? 'Add Stock' : 'Subtract Stock';
  const actionText = isAdd ? 'Add' : 'Subtract';
  const actionColor = isAdd ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

  const handleConfirm = () => {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    setError(null);
    onConfirm(Number(quantity));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fadeInUp">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-gray-700 text-base mb-2">
            {isAdd ? 'Enter the quantity to add to' : 'Enter the quantity to subtract from'} <span className="font-semibold text-indigo-700">{materialName}</span>:
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="stock-quantity-input" className="sr-only">
              Quantity
            </label>
            <input
              id="stock-quantity-input"
              type="number"
              min={1}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              disabled={isProcessing}
              autoFocus
              placeholder="Enter quantity"
              title="Quantity"
            />
            <span className="text-gray-500 text-lg">{unit}</span>
          </div>
          {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition flex items-center gap-2 ${actionColor} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustModal; 