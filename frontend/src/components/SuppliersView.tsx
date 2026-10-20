import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import type { Supplier } from '../types/inventory';
import { btnOutline, btnPrimary, Empty, ErrorText, Field, iconBtn, inputCls, Modal, PageTitle } from './ui';

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
    <Modal title={supplier ? 'Edit supplier' : 'Add supplier'} onClose={onClose}>
      <div className="space-y-4">
        <ErrorText message={error} />
        <Field label="Supplier name">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact person">
            <input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="What they supply">
          <input className={inputCls} value={supplies} onChange={(e) => setSupplies(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? 'Saving...' : supplier ? 'Save changes' : 'Add supplier'}
          </button>
        </div>
      </div>
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
