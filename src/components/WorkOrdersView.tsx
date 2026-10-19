import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Inventory } from '../store/useInventory';
import { PRIORITIES, WORK_STATUSES, type Priority, type WorkStatus } from '../types/inventory';
import { Badge, btnOutline, btnPrimary, Empty, ErrorText, Field, formatDate, iconBtn, inputCls, Modal, PageTitle } from './ui';

function NewOrder({ inv, onClose }: { inv: Inventory; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [assignee, setAssignee] = useState('IT team');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    const message = inv.addWorkOrder({ title, deviceSerial, priority, assignee, notes });
    if (message) setError(message);
    else onClose();
  };

  return (
    <Modal title="New work order" onClose={onClose}>
      <div className="space-y-4">
        <ErrorText message={error} />
        <Field label="What needs to be done?">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Device (optional)">
          <select className={inputCls} value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)}>
            <option value="">No device</option>
            {inv.data.devices.map((d) => (
              <option key={d.id} value={d.serial}>
                {d.name} — {d.serial}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned to">
            <input className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={save}>
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function WorkOrdersView({ inv }: { inv: Inventory }) {
  const { workOrders, devices } = inv.data;
  const [filter, setFilter] = useState<'active' | 'all' | WorkStatus>('active');
  const [adding, setAdding] = useState(false);

  const shown = workOrders
    .filter((w) => (filter === 'all' ? true : filter === 'active' ? w.status !== 'Done' : w.status === filter))
    .sort((a, b) => b.no - a.no);

  const deviceName = (serial: string) => devices.find((d) => d.serial === serial)?.name ?? '';

  return (
    <div>
      <PageTitle
        title="Work Orders"
        subtitle={`${workOrders.filter((w) => w.status !== 'Done').length} not finished`}
        actions={
          <>
            <select className={`${inputCls} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Show">
              <option value="active">Not finished</option>
              <option value="all">All</option>
              {WORK_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>
              <Plus size={16} /> New work order
            </button>
          </>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {shown.length === 0 ? (
          <Empty text="No work orders here." />
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">No.</th>
                <th className="px-4 py-2.5">Work</th>
                <th className="px-4 py-2.5">Device</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Assigned to</th>
                <th className="px-4 py-2.5">Created</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 align-top last:border-b-0">
                  <td className="px-4 py-2.5 text-slate-500">{w.no}</td>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium text-slate-900">{w.title}</span>
                    {w.notes ? <span className="block text-xs text-slate-500">{w.notes}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {w.deviceSerial ? (
                      <>
                        <span className="block">{deviceName(w.deviceSerial) || 'Device not in list'}</span>
                        <span className="block font-mono text-xs text-slate-500">{w.deviceSerial}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={w.priority === 'High' ? 'red' : w.priority === 'Medium' ? 'orange' : 'gray'}>{w.priority}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{w.assignee || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatDate(w.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                      value={w.status}
                      onChange={(e) => inv.setWorkStatus(w.id, e.target.value as WorkStatus)}
                      aria-label={`Status of work order ${w.no}`}
                    >
                      {WORK_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={`Delete work order ${w.no}`}
                      onClick={() => window.confirm(`Delete work order #${w.no}?`) && inv.deleteWorkOrder(w.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding ? <NewOrder inv={inv} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}
