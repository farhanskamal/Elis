import React, { useEffect, useMemo, useState, useContext } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../services/apiService';
import { Laptop, LaptopCheckout, Role } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import { NotificationsContext } from '../../context/NotificationsContext';

const formatTime = (iso?: string | null) => iso ? new Date(iso).toLocaleString() : '';

const LaptopCheckup: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { add: notify } = useContext(NotificationsContext);

  const isLibrarian = user?.role === Role.Librarian;

  const [loading, setLoading] = useState(true);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [bulkCount, setBulkCount] = useState<number>(15);
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  // Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLaptop, setCheckoutLaptop] = useState<Laptop | null>(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [ossis, setOssis] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLaptops();
      setLaptops(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load laptops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const available = useMemo(() => laptops.filter(l => l.isAccessible && !l.currentCheckout), [laptops]);
  const checkedOut = useMemo(() => laptops.filter(l => !!l.currentCheckout), [laptops]);
  const unavailable = useMemo(() => laptops.filter(l => !l.isAccessible), [laptops]);

  // Build a cart grid of numbered slots (sorted by number)
  const sorted = useMemo(() => [...laptops].sort((a,b) => a.number - b.number), [laptops]);

  const handleBulkCreate = async () => {
    try {
      setIsBulkCreating(true);
      const n = Math.max(1, Math.min(200, Math.floor(bulkCount || 0)));
      const res = await api.bulkCreateLaptops(n);
      setLaptops(res.laptops);
      notify({ type: 'info', title: 'Laptops Initialized', message: `Created ${res.created} laptops` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Initialization Failed', message: e.message || 'Failed to initialize laptops' });
    } finally {
      setIsBulkCreating(false);
    }
  };

  const toggleAccessible = async (l: Laptop) => {
    try {
      const updated = await api.updateLaptop(l.id, { isAccessible: !l.isAccessible });
      setLaptops(prev => prev.map(x => x.id === l.id ? { ...x, ...updated } : x));
    } catch (e: any) {
      notify({ type: 'error', title: 'Update Failed', message: e.message || 'Could not update laptop' });
    }
  };

  const saveNote = async (l: Laptop, note: string) => {
    try {
      const updated = await api.updateLaptop(l.id, { note });
      setLaptops(prev => prev.map(x => x.id === l.id ? { ...x, ...updated } : x));
      notify({ type: 'info', title: 'Note Saved', message: `Laptop ${l.number} note updated` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Update Failed', message: e.message || 'Could not update note' });
    }
  };

  const openCheckout = (l: Laptop) => {
    setCheckoutLaptop(l);
    setBorrowerName('');
    setOssis('');
    setCheckoutOpen(true);
  };

  const submitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutLaptop) return;
    try {
      setCheckingOut(true);
      await api.checkoutLaptop(checkoutLaptop.id, borrowerName.trim(), ossis.trim() || undefined);
      setCheckoutOpen(false);
      await load();
      notify({ type: 'info', title: 'Laptop Checked Out', message: `Laptop ${checkoutLaptop.number} checked out to ${borrowerName}` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Checkout Failed', message: e.message || 'Could not check out laptop' });
    } finally {
      setCheckingOut(false);
    }
  };

  const checkin = async (l: Laptop) => {
    try {
      await api.checkinLaptop(l.id);
      await load();
      notify({ type: 'info', title: 'Laptop Checked In', message: `Laptop ${l.number} is now available` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Check-in Failed', message: e.message || 'Could not check in laptop' });
    }
  };

  if (loading) return <div className="p-4"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Laptop Check Up</h2>
      </div>

      {error && <Card className="bg-red-50 border-l-4 border-red-500"><p className="text-sm text-red-700">{error}</p></Card>}

      <Card>
        <h3 className="text-xl font-semibold mb-3">Cart</h3>
        <div className="rounded border p-3 bg-gray-50">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {sorted.map(l => {
              const status: 'available' | 'checkedout' | 'unavailable' = !l.isAccessible
                ? 'unavailable'
                : l.currentCheckout ? 'checkedout' : 'available';
              const colors = status === 'available'
                ? 'bg-green-100 border-green-400 text-green-900'
                : status === 'checkedout'
                  ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
                  : 'bg-red-100 border-red-400 text-red-900';
              return (
                <button
                  key={l.id}
                  className={`relative border rounded p-3 text-center ${colors} hover:opacity-90 transition`}
                  onClick={() => {
                    if (status === 'available') openCheckout(l);
                    else if (status === 'checkedout') checkin(l);
                  }}
                  disabled={!l.isAccessible}
                  title={l.note || (l.currentCheckout ? `To ${l.currentCheckout.borrowerName}` : 'Available')}
                >
                  <div className="text-xs opacity-75">Laptop</div>
                  <div className="text-2xl font-bold leading-none">{l.number}</div>
                  {status === 'checkedout' && (
                    <div className="mt-1 text-xs">
                      Out: {l.currentCheckout?.borrowerName}
                    </div>
                  )}
                  {status === 'unavailable' && (
                    <div className="mt-1 text-xs">Unavailable</div>
                  )}
                  {isLibrarian && (
                    <div className="absolute top-1 right-1 flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={l.isAccessible}
                        onChange={(e) => toggleAccessible(l)}
                        title="Toggle accessibility"
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Legend: <span className="px-2 py-0.5 rounded bg-green-100 border border-green-400 mr-2">Available</span>
            <span className="px-2 py-0.5 rounded bg-yellow-100 border border-yellow-400 mr-2">Checked Out</span>
            <span className="px-2 py-0.5 rounded bg-red-100 border border-red-400">Unavailable</span>
          </div>
        </div>
      </Card>

      {checkoutOpen && checkoutLaptop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <Card className="w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Check Out Laptop {checkoutLaptop.number}</h2>
            <form onSubmit={submitCheckout} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Borrower Name</label>
                <input type="text" className="mt-1 w-full p-2 border rounded-md" value={borrowerName} onChange={e => setBorrowerName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">OSSIS (optional)</label>
                <input type="text" className="mt-1 w-full p-2 border rounded-md" value={ossis} onChange={e => setOssis(e.target.value)} placeholder="e.g., 123456789" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={checkingOut}>{checkingOut ? 'Checking out...' : 'Confirm'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LaptopCheckup;
