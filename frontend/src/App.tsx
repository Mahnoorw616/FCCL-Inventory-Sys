import { useState } from 'react';
import ActivityLogView from './components/ActivityLogView';
import DashboardOverview from './components/DashboardOverview';
import DeviceFormModal from './components/DeviceFormModal';
import DevicesView from './components/DevicesView';
import NavigationHeader from './components/NavigationHeader';
import RacksView from './components/RacksView';
import SideDrawer from './components/SideDrawer';
import StockView from './components/StockView';
import SuppliersView from './components/SuppliersView';
import WorkOrdersView from './components/WorkOrdersView';
import { useInventory } from './store/useInventory';
import type { Device, ViewId } from './types/inventory';

export default function App() {
  const inv = useInventory();
  const [view, setView] = useState<ViewId>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  // undefined = closed, null = adding a new device, Device = editing it
  const [deviceForm, setDeviceForm] = useState<Device | null | undefined>(undefined);

  const go = (v: ViewId) => {
    setView(v);
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  };

  const search = (q: string) => {
    setQuery(q);
    if (q.trim() && view !== 'devices') setView('devices');
  };

  const reset = async () => {
    if (window.confirm('Replace everything with the sample data? Your own changes will be lost.')) {
      await inv.reset();
      setQuery('');
      go('overview');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <NavigationHeader
        view={view}
        query={query}
        status={inv.status}
        isSyncing={inv.isSyncing}
        onRefresh={inv.refresh}
        onQuery={search}
        onNavigate={go}
        onOpenDrawer={() => setDrawerOpen(true)}
        onAddDevice={() => setDeviceForm(null)}
      />
      <SideDrawer open={drawerOpen} view={view} onClose={() => setDrawerOpen(false)} onNavigate={go} onReset={reset} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === 'overview' && <DashboardOverview inv={inv} onNavigate={go} />}
        {view === 'devices' && (
          <DevicesView inv={inv} query={query} onClearQuery={() => setQuery('')} onAdd={() => setDeviceForm(null)} onEdit={(d) => setDeviceForm(d)} />
        )}
        {view === 'work' && <WorkOrdersView inv={inv} />}
        {view === 'stock' && <StockView inv={inv} />}
        {view === 'racks' && <RacksView inv={inv} />}
        {view === 'suppliers' && <SuppliersView inv={inv} />}
        {view === 'log' && <ActivityLogView inv={inv} />}
      </main>

      {deviceForm !== undefined && (
        <DeviceFormModal key={deviceForm?.id ?? 'new'} inv={inv} device={deviceForm} onClose={() => setDeviceForm(undefined)} />
      )}
    </div>
  );
}
