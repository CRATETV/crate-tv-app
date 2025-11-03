import React, { useState } from 'react';

// Helper to get status color based on date
const getStatus = (dateString: string | null): { color: string; text: string; nextBillDate: Date | null } => {
    if (!dateString) return { color: 'gray', text: 'Not set', nextBillDate: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today for accurate comparison

    // The saved date is the anchor. We need to find the first occurrence of its day on or after today.
    let nextBillDate = new Date(dateString + 'T00:00:00');
    
    // While the calculated bill date is in the past, keep advancing it by a month until it's in the future.
    while (nextBillDate < today) {
        const originalDay = nextBillDate.getDate();
        nextBillDate.setMonth(nextBillDate.getMonth() + 1);
        
        // If advancing the month changed the day (e.g., from Jan 31 to Mar 2),
        // it means the next month is shorter. We should set it to the last day of that month.
        if (nextBillDate.getDate() !== originalDay) {
            nextBillDate.setDate(0); // Sets to the last day of the previous month
        }
    }

    const diffTime = nextBillDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { color: 'red', text: 'Due today', nextBillDate };
    if (diffDays <= 7) return { color: 'yellow', text: `Due in ${diffDays} day(s)`, nextBillDate };
    return { color: 'green', text: `Due in ${diffDays} day(s)`, nextBillDate };
};

const statusColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    gray: 'bg-gray-500',
};

const ServiceReminder: React.FC<{ serviceName: string; logoUrl: string; billingUrl: string; storageKey: string }> = ({ serviceName, logoUrl, billingUrl, storageKey }) => {
    const [savedDate, setSavedDate] = useState<string | null>(() => localStorage.getItem(storageKey));
    const [inputDate, setInputDate] = useState(savedDate || '');

    const handleSave = () => {
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
        if (status.nextBillDate) {
            // To advance, create a new date from the *current* next bill date,
            // advance it by one month, and save that as the new anchor.
            const currentBillDate = status.nextBillDate;
            const nextMonthDate = new Date(currentBillDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

            // Handle month-end issues (e.g., Jan 31 -> Feb 28)
            if (nextMonthDate.getDate() !== currentBillDate.getDate()) {
                nextMonthDate.setDate(0);
            }

            const newDateString = nextMonthDate.toISOString().split('T')[0];
            localStorage.setItem(storageKey, newDateString);
            setSavedDate(newDateString);
            setInputDate(newDateString);
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-xl flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <img src={logoUrl} alt={`${serviceName} logo`} className="w-12 h-12" />
                <div>
                    <h4 className="font-bold text-xl text-white">{serviceName} Billing</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-3 h-3 rounded-full ${statusColors[status.color as keyof typeof statusColors]}`}></span>
                        <span className="text-sm text-gray-300">
                           {status.text}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                 <p className="text-sm text-gray-400">Next Bill Date</p>
                 <p className="text-2xl font-bold text-white">{displayDate}</p>
            </div>
           
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <input 
                        type="date" 
                        value={inputDate}
                        onChange={(e) => setInputDate(e.target.value)}
                        className="form-input text-sm !py-2 flex-grow"
                    />
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors">
                        Save
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                     {status.nextBillDate && (
                         <button onClick={handleMarkAsPaid} className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors w-full">
                            Mark as Paid
                        </button>
                    )}
                    <a href={billingUrl} target="_blank" rel="noopener noreferrer" className="text-center bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors w-full">
                        Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
};


const BillingReminders: React.FC = () => {
    return (
        <div className="bg-gray-950 p-6 rounded-lg text-gray-200 mt-8">
             <div className="flex items-center gap-4 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                 <h2 className="text-2xl font-bold text-purple-400">External Billing Reminders</h2>
             </div>
             <p className="text-sm text-gray-400 mb-6">
                This tool helps you keep track of your monthly Vercel and AWS bills. Set the date of your next bill, and it will automatically remind you each month. This data is saved only in your browser.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ServiceReminder 
                    serviceName="Vercel"
                    logoUrl="https://cratetelevision.s3.us-east-1.amazonaws.com/vercel.png"
                    billingUrl="https://vercel.com/dashboard/billing"
                    storageKey="cratetv-vercel-billing-date"
                />
                 <ServiceReminder 
                    serviceName="Amazon Web Services"
                    logoUrl="https://cratetelevision.s3.us-east-1.amazonaws.com/aws.png"
                    billingUrl="https://console.aws.amazon.com/billing/"
                    storageKey="cratetv-aws-billing-date"
                />
             </div>
        </div>
    );
};

export default BillingReminders;