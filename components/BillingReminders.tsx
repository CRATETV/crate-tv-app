
import React, { useState, useEffect } from 'react';

interface Bill {
    name: string;
    logoUrl: string;
    billingUrl: string;
    storageKey: string;
}

// Helper to get status color based on date
const getStatus = (dateString: string | null): { color: string; text: string; nextBillDate: Date | null; diffDays: number } => {
    if (!dateString) return { color: 'gray', text: 'Not set', nextBillDate: null, diffDays: Infinity };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today for accurate comparison

    let nextBillDate = new Date(dateString + 'T00:00:00');
    
    while (nextBillDate < today) {
        const originalDay = nextBillDate.getDate();
        nextBillDate.setMonth(nextBillDate.getMonth() + 1);
        
        if (nextBillDate.getDate() !== originalDay) {
            nextBillDate.setDate(0);
        }
    }

    const diffTime = nextBillDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      const text = diffDays === 0 ? 'Due today' : `Overdue by ${Math.abs(diffDays)} day(s)`;
      return { color: 'red', text, nextBillDate, diffDays };
    }
    if (diffDays <= 7) return { color: 'yellow', text: `Due in ${diffDays} day(s)`, nextBillDate, diffDays };
    return { color: 'green', text: `Due in ${diffDays} day(s)`, nextBillDate, diffDays };
};

const statusColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    gray: 'bg-gray-500',
};

const ServiceReminder: React.FC<{ bill: Bill; onDelete: (storageKey: string) => void; }> = ({ bill, onDelete }) => {
    const { name, logoUrl, billingUrl, storageKey } = bill;
    const [savedDate, setSavedDate] = useState<string | null>(() => localStorage.getItem(storageKey));
    const [inputDate, setInputDate] = useState(savedDate || '');

    const handleSaveDate = () => {
        if (inputDate) {
            localStorage.setItem(storageKey, inputDate);
            setSavedDate(inputDate);
        } else {
            localStorage.removeItem(storageKey);
            setSavedDate(null);
        }
    };
    
    const status = getStatus(savedDate);
    const displayDate = status.nextBillDate
        ? status.nextBillDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Not set';

    const handleMarkAsPaid = () => {
        if (!status.nextBillDate) return;
        
        const currentBillDate = status.nextBillDate;
        const nextPeriodDate = new Date(currentBillDate);
        nextPeriodDate.setMonth(nextPeriodDate.getMonth() + 1);

        if (nextPeriodDate.getDate() !== currentBillDate.getDate()) {
            nextPeriodDate.setDate(0);
        }

        const newDateString = nextPeriodDate.toISOString().split('T')[0];
        localStorage.setItem(storageKey, newDateString);
        setSavedDate(newDateString);
        setInputDate(newDateString);
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-xl flex flex-col gap-6 relative">
            <button 
                onClick={() => onDelete(storageKey)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-400 text-xs font-bold"
                aria-label={`Delete ${name} reminder`}
            >
                DELETE
            </button>
            <div className="flex items-center gap-4">
                {logoUrl && <img src={logoUrl} alt={`${name} logo`} className="w-12 h-12" />}
                <div>
                    <h4 className="font-bold text-xl text-white">{name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-3 h-3 rounded-full ${statusColors[status.color as keyof typeof statusColors]}`}></span>
                        <span className="text-sm text-gray-300">{status.text}</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                 <p className="text-sm text-gray-400">Next Bill Date</p>
                 <p className="text-2xl font-bold text-white">{displayDate}</p>
            </div>
           
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} className="form-input text-sm !py-2 flex-grow" />
                    <button onClick={handleSaveDate} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors">Save</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                     {status.nextBillDate && (
                         <button onClick={handleMarkAsPaid} disabled={status.diffDays > 0} title={status.diffDays > 0 ? `This button becomes active on the due date.` : 'Mark this bill as paid'} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm py-2 px-4 rounded-md transition-colors w-full">Mark as Paid</button>
                    )}
                    <a href={billingUrl} target="_blank" rel="noopener noreferrer" className="text-center bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors w-full">Dashboard</a>
                </div>
            </div>
        </div>
    );
};

const AddBillForm: React.FC<{ onAdd: (bill: Omit<Bill, 'storageKey'>) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [billingUrl, setBillingUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !billingUrl) return;
        onAdd({ name, logoUrl, billingUrl });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
            <h4 className="font-bold text-lg text-white">Add New Bill Reminder</h4>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Service Name (e.g., Vercel)" className="form-input" required />
            <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Logo URL (Optional)" className="form-input" />
            <input type="url" value={billingUrl} onChange={e => setBillingUrl(e.target.value)} placeholder="Billing Dashboard URL" className="form-input" required />
            <div className="flex gap-4">
                <button type="submit" className="submit-btn bg-green-600 hover:bg-green-700 w-full">Add Bill</button>
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md w-full">Cancel</button>
            </div>
        </form>
    );
};

const BillingReminders: React.FC = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const savedBills = localStorage.getItem('cratetv-custom-bills');
        if (savedBills) {
            setBills(JSON.parse(savedBills));
        } else {
            const defaultBills: Bill[] = [
                { name: 'Vercel', logoUrl: 'https://cratetelevision.s3.us-east-1.amazonaws.com/vercel.png', billingUrl: 'https://vercel.com/dashboard/billing', storageKey: 'cratetv-vercel-billing-date' },
                { name: 'Amazon Web Services', logoUrl: 'https://cratetelevision.s3.us-east-1.amazonaws.com/aws.png', billingUrl: 'https://console.aws.amazon.com/billing/', storageKey: 'cratetv-aws-billing-date' }
            ];
            setBills(defaultBills);
            localStorage.setItem('cratetv-custom-bills', JSON.stringify(defaultBills));
        }
    }, []);

    const handleAddBill = (newBillData: Omit<Bill, 'storageKey'>) => {
        const newBill: Bill = {
            ...newBillData,
            storageKey: `cratetv-bill-${Date.now()}`
        };
        const updatedBills = [...bills, newBill];
        setBills(updatedBills);
        localStorage.setItem('cratetv-custom-bills', JSON.stringify(updatedBills));
        setIsAdding(false);
    };

    const handleDeleteBill = (storageKeyToDelete: string) => {
        if (!window.confirm("Are you sure you want to delete this bill reminder?")) return;
        const updatedBills = bills.filter(b => b.storageKey !== storageKeyToDelete);
        setBills(updatedBills);
        localStorage.setItem('cratetv-custom-bills', JSON.stringify(updatedBills));
        localStorage.removeItem(storageKeyToDelete); // Also clean up the date
    };

    return (
        <div className="bg-gray-950 p-6 rounded-lg text-gray-200 mt-8">
             <div className="flex items-center gap-4 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <h2 className="text-2xl font-bold text-purple-400">External Billing Reminders</h2>
             </div>
             <p className="text-sm text-gray-400 mb-6">Keep track of your monthly bills. Set a bill's due date, and this tool will automatically calculate the next payment date each month. This data is saved only in your browser.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bills.map(bill => (
                    <ServiceReminder key={bill.storageKey} bill={bill} onDelete={handleDeleteBill} />
                ))}
                {isAdding ? (
                    <AddBillForm onAdd={handleAddBill} onCancel={() => setIsAdding(false)} />
                ) : (
                    <button onClick={() => setIsAdding(true)} className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 text-gray-400 font-bold py-12 rounded-xl transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add New Bill
                    </button>
                )}
             </div>
        </div>
    );
};

export default BillingReminders;
