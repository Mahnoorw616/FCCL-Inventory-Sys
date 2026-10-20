import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import type { Supplier } from '../types/inventory';
import { btnOutline, btnPrimary, Empty, ErrorText, Field, FormRow, iconBtn, inputCls, Modal, PageTitle } from './ui';

function SupplierForm({ inv, supplier, onClose }: { inv: Inventory; supplier: Supplier | null; onClose: () => void }) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contact, setContact] = useState(supplier?.contact ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [supplies, setSupplies] = useState(supplier?.supplies ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const message = await inv.saveSupplier({ name, contact, phone, email, supplies }, supplier?.id);
      if (message) {
        setError(message);
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save supplier');
      setSaving(false);
    }
  };

  return (
    <Modal
      title={supplier ? 'Edit Supplier' : 'Register Supplier'}
      subtitle={supplier ? `Vendor: ${supplier.name}` : 'Vendor & parts distributor profile'}
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

        <FormRow label="Supplier Name" required hint="Company or vendor entity">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dell Technologies Pakistan"
            autoFocus
            required
          />
        </FormRow>

        <FormRow label="Contact Person" hint="Account manager or point of contact">
          <input
            className={inputCls}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="e.g. Sales Desk / Muhammad Ali"
          />
        </FormRow>

        <FormRow label="Phone Number" hint="Direct phone or mobile">
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +92 51 1234567"
          />
        </FormRow>

        <FormRow label="Email Address">
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. sales@vendor.com"
          />
        </FormRow>

        <FormRow label="What they supply" hint="Catalog tags or component categories">
          <input
            className={inputCls}
            value={supplies}
            onChange={(e) => setSupplies(e.target.value)}
            placeholder="e.g. Laptop parts, SSDs, memory, power supplies"
          />
        </FormRow>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving...' : supplier ? 'Save Changes' : 'Register Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SuppliersView({ inv }: { inv: Inventory }) {
  const { suppliers, stock } = inv.data;
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const [error, setError] = useState('');

  const remove = async (s: Supplier) => {
    if (!window.confirm(`Delete ${s.name}?`)) return;
    try {
      const err = await inv.deleteSupplier(s.id);
      setError(err);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete supplier');
    }
  };

  return (
    <div>
      <PageTitle
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        actions={
          <button type="button" className={btnPrimary} onClick={() => setEditing('new')}>
            <Plus size={16} /> Add supplier
          </button>
        }
      />
      {error ? (
        <div className="mb-4">
          <ErrorText message={error} />
        </div>
      ) : null}

      {suppliers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <Empty text="No suppliers yet." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-slate-900">{s.name}</h2>
                <span className="flex shrink-0">
                  <button type="button" className={iconBtn} onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className={iconBtn} onClick={() => remove(s)} aria-label={`Delete ${s.name}`}>
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
              {s.supplies ? <p className="mt-1 text-sm text-slate-600">{s.supplies}</p> : null}
              <dl className="mt-3 space-y-1 text-sm text-slate-700">
                {s.contact ? <div>Contact: {s.contact}</div> : null}
                {s.phone ? <div>Phone: {s.phone}</div> : null}
                {s.email ? <div>Email: {s.email}</div> : null}
              </dl>
              <p className="mt-3 text-xs text-slate-500">{stock.filter((x) => x.supplierId === s.id).length} stock items</p>
            </div>
          ))}
        </div>
      )}

      {editing ? <SupplierForm inv={inv} supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
