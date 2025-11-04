import React, { useState } from 'react';
import { BillSavingsTransaction } from '../types';
import SquarePaymentModal from './SquarePaymentModal';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;

interface BillSavingsPotProps {
    currentBalance: number;
    availablePlatformBalance: number;
    transactions: BillSavingsTransaction[];
    onRefreshData: () => void;
}

const BillSavingsPot: React.FC<BillSavingsPotProps> = ({ currentBalance, availablePlatformBalance, transactions, onRefreshData }) => {
    const [activeTab, setActiveTab] = useState<'add' | 'pay'>('add');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setMessage('Please enter a valid amount.');
            setStatus('error');
            return;
        }

        if (activeTab === 'add' && numericAmount * 100 > availablePlatformBalance) {
            setMessage('Cannot add more than the available platform balance.');
            setStatus('error');
            return;
        }

        if (activeTab === 'pay' && numericAmount * 100 > currentBalance) {
            setMessage('Cannot record a payment greater than the current pot balance.');
            setStatus('error');
            return;
        }

        await processTransaction(activeTab === 'add' ? 'deposit' : 'withdrawal', numericAmount, reason);
    };

    const handlePaymentSuccess = async (details: { paymentType: 'billSavingsDeposit', amount: number }) => {
        setIsPaymentModalOpen(false);
        await processTransaction('deposit', details.amount, 'Deposit from Card');
    };

    const processTransaction = async (type: 'deposit' | 'withdrawal', transactionAmount: number, transactionReason: string) => {
        setStatus('processing');
        setMessage('');
        const password = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/manage-bill-savings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    type,
                    amount: transactionAmount,
                    reason: transactionReason,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Transaction failed.');

            setStatus('success');
            setMessage(`Transaction recorded successfully!`);
            setAmount('');
            setReason('');
            onRefreshData(); // Refresh parent component's data
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    return (
        <>
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left side: Form */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-1">Bill Savings Pot</h3>
                <p className="text-sm text-gray-400 mb-4">Set aside money from your platform earnings for bills.</p>
                
                <div className="text-center bg-gray-900/50 p-4 rounded-lg mb-6">
                    <p className="text-sm text-gray-400">Current Pot Balance</p>
                    <p className="text-4xl font-bold text-cyan-400">{formatCurrency(currentBalance)}</p>
                </div>

                <div className="flex bg-gray-700/50 rounded-lg p-1 mb-4">
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'add' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>Add Funds</button>
                    <button onClick={() => setActiveTab('pay')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'pay' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>Record Payment</button>
                </div>
                
                {activeTab === 'add' && (
                    <button type="button" onClick={() => setIsPaymentModalOpen(true)} className="w-full mb-4 text-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                        Add from Card
                    </button>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                     <p className="text-xs text-gray-500">
                        {activeTab === 'add' ? `Add from platform balance (Max: ${formatCurrency(availablePlatformBalance)})` : `Record a payment from the pot (Max: ${formatCurrency(currentBalance)})`}
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)" min="0.01" step="0.01" className="form-input col-span-1" required />
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (e.g., Vercel Bill)" className="form-input col-span-2" required />
                    </div>
                    <button type="submit" disabled={status === 'processing'} className="submit-btn bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800">
                        {status === 'processing' ? 'Saving...' : (activeTab === 'add' ? 'Add to Pot' : 'Record Payment')}
                    </button>
                     {message && <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
                </form>
            </div>

            {/* Right side: History */}
            <div>
                 <h4 className="text-md font-semibold text-gray-300 mb-4">Transaction History</h4>
                <div className="max-h-96 overflow-y-auto pr-2">
                    {transactions.length > 0 ? (
                        <ul className="space-y-2">
                            {transactions.map(t => (
                                <li key={t.id} className="flex justify-between items-center text-sm p-2 bg-gray-700/50 rounded-md">
                                    <div>
                                        <span className="font-semibold text-white">{t.reason}</span>
                                        <span className="text-xs text-gray-500 ml-2">{new Date(t.transactionDate.seconds * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <span className={`font-bold ${t.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {t.type === 'deposit' ? '+' : '-'}
                                        {formatCurrency(t.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-gray-500 text-center py-8">No transactions yet.</p>}
                </div>
            </div>
        </div>
        {isPaymentModalOpen && (
            <SquarePaymentModal
                paymentType="billSavingsDeposit"
                onClose={() => setIsPaymentModalOpen(false)}
                onPaymentSuccess={handlePaymentSuccess as any}
            />
        )}
        </>
    );
};

export default BillSavingsPot;