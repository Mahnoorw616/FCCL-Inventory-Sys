import type { Inventory } from '../store/useInventory';
import { Empty, PageTitle } from './ui';

export default function ActivityLogView({ inv }: { inv: Inventory }) {
  const { log } = inv.data;
  return (
    <div>
      <PageTitle title="Activity Log" subtitle="The latest changes made in this app" />
      <div className="rounded-xl border border-slate-200 bg-white">
        {log.length === 0 ? (
          <Empty text="Nothing has happened yet." />
        ) : (
          <ul>
            {log.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0">
                <span className="text-slate-800">{e.text}</span>
                <time className="text-xs text-slate-500" dateTime={e.time}>
                  {new Date(e.time).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
