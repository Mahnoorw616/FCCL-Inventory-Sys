import { useState } from 'react';
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import type { StockItem } from '../types/inventory';
import { isLowStock } from '../utils/inventoryRules';
import { Badge, btnOutline, btnPrimary, Empty, ErrorText, Field, FormRow, iconBtn, inputCls, Modal, PageTitle } from './ui';

function StockForm({ inv, item, onClose }: { inv: Inventory; item: StockItem | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 0));
  const [minimum, setMinimum] = useState(String(item?.minimum ?? 1));
  const [location, setLocation] = useState(item?.location ?? '');
  const [supplierId, setSupplierId] = useState(item?.supplierId ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const draft = { name, category: category.trim(), quantity: Number(quantity), minimum: Number(minimum), location: location.trim(), supplierId };
    try {
      const message = await (item ? inv.updateStock(item.id, draft) : inv.addStock(draft));
      if (message) {
        setError(message);
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save stock item');
      setSaving(false);
    }
  };

  const nextNo = item?.no ?? ((inv.data.stock.reduce((m, s) => Math.max(m, s.no), 0)) + 1);

  return (
    <Modal
      title={item ? `Edit Stock Item #${item.no}` : 'Register Stock Item'}
      subtitle={`Assigned Number: Item #${nextNo}`}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-3"
      >
        <ErrorText message={error} />

        <FormRow label="Item Number" hint="Sequential inventory index">
          <input
            className={`${inputCls} bg-slate-50 font-mono text-slate-500 cursor-not-allowed`}
            value={`Item #${nextNo}`}
            disabled
            readOnly
          />
        </FormRow>

        <FormRow label="Item Name" required hint="Part name or description">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Laptop battery (Latitude 5440)"
            autoFocus
            required
          />
        </FormRow>

        <FormRow label="Category / Group" hint="Classification group">
          <input
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Laptop parts, Storage, Cables"
          />
        </FormRow>

        <FormRow label="Storage Location" hint="Room or shelf location">
          <input
            className={inputCls}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Main Plant store, Cabinet 3"
          />
        </FormRow>

        <FormRow label="Quantity in Stock" required hint="Current physical units count">
          <input
            className={inputCls}
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </FormRow>

        <FormRow label="Minimum Alert Level" hint="Warn when stock drops at or below">
          <input
            className={inputCls}
            type="number"
            min={0}
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </FormRow>

        <FormRow label="Primary Supplier">
          <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">None / Unknown</option>
            {inv.data.suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.supplies || 'General'})
              </option>
            ))}
          </select>
        </FormRow>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving...' : item ? 'Save Changes' : 'Register Stock Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function StockView({ inv }: { inv: Inventory }) {
  const { stock, suppliers } = inv.data;
  const [editing, setEditing] = useState<StockItem | 'new' | null>(null);
  const [lowOnly, setLowOnly] = useState(false);

  const shown = stock.filter((s) => !lowOnly || isLowStock(s));
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? '—';

  return (
    <div>
      <PageTitle
        title="Stock & Spares"
        subtitle={`${stock.filter(isLowStock).length} items are low`}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
            </label>
            <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
              <Plus size={16} /> Add item
            </button>
          </>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {shown.length === 0 ? (
          <Empty text="No stock items." />
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">No.</th>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Supplier</th>
                <th className="px-4 py-2.5">In stock</th>
                <th className="px-4 py-2.5">Use / add</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-2.5 text-slate-500">{s.no}</td>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium text-slate-900">{s.name}</span>
                    <span className="block text-xs text-slate-500">{s.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{s.location || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{supplierName(s.supplierId)}</td>
                  <td className="px-4 py-2.5">
                    <span className="mr-2 text-base font-bold text-slate-900">{s.quantity}</span>
                    {s.quantity === 0 ? <Badge tone="red">Out</Badge> : isLowStock(s) ? <Badge tone="orange">Low</Badge> : <Badge tone="green">OK</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex gap-1">
                      <button type="button" className={`${btnOutline} !px-2 !py-1`} onClick={() => inv.changeStock(s.id, -1)} disabled={s.quantity === 0} aria-label={`Use one ${s.name}`}>
                        <Minus size={14} />
                      </button>
                      <button type="button" className={`${btnOutline} !px-2 !py-1`} onClick={() => inv.changeStock(s.id, 1)} aria-label={`Add one ${s.name}`}>
                        <Plus size={14} />
                      </button>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex justify-end gap-1">
                      <button type="button" className={iconBtn} onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className={iconBtn} onClick={() => window.confirm(`Delete ${s.name}?`) && inv.deleteStock(s.id)} aria-label={`Delete ${s.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing ? <StockForm inv={inv} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
