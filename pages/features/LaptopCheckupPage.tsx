import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../services/apiService';
import { AuthContext } from '../../context/AuthContext';
import { NotificationsContext } from '../../context/NotificationsContext';
import { Laptop, Role } from '../../types';

const LaptopCheckupPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { add: notify } = useContext(NotificationsContext);
  const isLibrarian = user?.role === Role.Librarian;

  const [loading, setLoading] = useState(true);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [newNumber, setNewNumber] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getLaptops();
      setLaptops(data);
    } catch (e: any) {
      notify({ type: 'error', title: 'Load Failed', message: e.message || 'Could not load laptops' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => [...laptops].sort((a,b) => a.number - b.number), [laptops]);

  const addLaptop = async () => {
    if (!isLibrarian) return;
    if (!newNumber || !Number.isInteger(newNumber as number) || (newNumber as number) < 1) {
      notify({ type: 'error', title: 'Invalid number', message: 'Enter a positive integer.' });
      return;
    }
    setBusy(true);
    try {
      await api.createLaptop(Number(newNumber));
      setNewNumber('');
      await load();
      notify({ type: 'info', title: 'Added', message: 'Laptop created' });
    } catch (e: any) {
      notify({ type: 'error', title: 'Add Failed', message: e.message || 'Could not create laptop' });
    } finally {
      setBusy(false);
    }
  };

  const toggleAccessible = async (l: Laptop) => {
    if (!isLibrarian) return;
    try {
      const updated = await api.updateLaptop(l.id, { isAccessible: !l.isAccessible });
      setLaptops(prev => prev.map(x => x.id === l.id ? { ...x, ...updated } : x));
    } catch (e: any) {
      notify({ type: 'error', title: 'Update Failed', message: e.message || 'Could not update laptop' });
    }
  };

  const saveNote = async (l: Laptop, note: string) => {
    if (!isLibrarian) return;
    try {
      const updated = await api.updateLaptop(l.id, { note });
      setLaptops(prev => prev.map(x => x.id === l.id ? { ...x, ...updated } : x));
    } catch (e: any) {
      notify({ type: 'error', title: 'Update Failed', message: e.message || 'Could not update note' });
    }
  };

  const remove = async (l: Laptop) => {
    if (!isLibrarian) return;
    if (!confirm(`Delete Laptop ${l.number}? This will remove its record (history stays in checkouts table).`)) return;
    try {
      await api.deleteLaptop(l.id);
      await load();
      notify({ type: 'info', title: 'Deleted', message: `Laptop ${l.number} removed` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Delete Failed', message: e.message || 'Could not delete' });
    }
  };

  const exportJson = async () => {
    if (!isLibrarian) return;
    try {
      const data = await api.exportLaptops();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'laptops.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      notify({ type: 'error', title: 'Export Failed', message: e.message || 'Could not export' });
    }
  };

  const importJson = async (file: File) => {
    if (!isLibrarian) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await api.importLaptops(parsed.laptops);
      setLaptops(result.laptops);
      notify({ type: 'info', title: 'Imported', message: `Imported ${parsed?.laptops?.length || 0} laptops` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Import Failed', message: e.message || 'Could not import' });
    }
  };

  if (loading) return <div className="p-4"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laptop Check Up</h1>
        {isLibrarian && (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              className="border rounded px-2 py-1 w-28"
              placeholder="New number"
              value={newNumber}
              onChange={e => setNewNumber(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <Button onClick={addLaptop} disabled={busy || newNumber === ''}>{busy ? 'Working...' : 'Add Laptop'}</Button>
            <Button variant="secondary" onClick={exportJson}>Export JSON</Button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={e => e.target.files && importJson(e.target.files[0])} />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</Button>
          </div>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {sorted.map(l => {
            const status: 'available' | 'checkedout' | 'unavailable' = !l.isAccessible
              ? 'unavailable'
              : l.currentCheckout ? 'checkedout' : 'available';
            const colors = status === 'available'
              ? 'bg-green-50 border-green-400 text-green-900'
              : status === 'checkedout'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                : 'bg-red-50 border-red-400 text-red-900';
            return (
              <div key={l.id} className={`relative border rounded p-3 ${colors}`}>
                <div className="text-xs opacity-75">Laptop</div>
                {isLibrarian ? (
                  <input
                    type="number"
                    className="w-20 border rounded px-1 py-0.5 text-lg font-bold"
                    defaultValue={l.number}
                    onBlur={async (e) => {
                      const newVal = Number(e.target.value);
                      if (!Number.isInteger(newVal) || newVal < 1 || newVal === l.number) return;
                      try {
                        await api.updateLaptop(l.id, { number: newVal });
                        await load();
                        notify({ type: 'info', title: 'Number Updated', message: `Laptop ${l.number} → ${newVal}` });
                      } catch (err: any) {
                        notify({ type: 'error', title: 'Update Failed', message: err.message || 'Could not update number' });
                        e.target.value = String(l.number);
                      }
                    }}
                  />
                ) : (
                  <div className="text-2xl font-bold leading-none">{l.number}</div>
                )}
                {status === 'checkedout' && (
                  <div className="mt-1 text-xs">Out</div>
                )}
                {status === 'unavailable' && (
                  <div className="mt-1 text-xs">Unavailable</div>
                )}
                {isLibrarian && (
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center space-x-2 text-xs">
                      <input type="checkbox" checked={l.isAccessible} onChange={() => toggleAccessible(l)} />
                      <span>Accessible</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1 text-xs"
                      defaultValue={l.note || ''}
                      placeholder="Note (e.g., broken)"
                      onBlur={(e) => saveNote(l, e.target.value)}
                    />
                    <Button variant="secondary" className="w-full py-1 text-xs" onClick={() => remove(l)}>Delete</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {!isLibrarian && (
        <Card className="bg-blue-50 border-l-4 border-blue-500">
          <p className="text-sm">
            This page is read-only for monitors. Please use Kiosk Mode to check out or check in laptops.
          </p>
        </Card>
      )}
    </div>
  );
};

export default LaptopCheckupPage;
