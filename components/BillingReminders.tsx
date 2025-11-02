import React, { useState } from 'react';

// Helper to get status color based on date
const getStatus = (dateString: string | null): { color: string; text: string } => {
    if (!dateString) return { color: 'gray', text: 'Not set' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today in local time
    
    // The date from the input is YYYY-MM-DD. When parsed as `new Date()`, it's treated as UTC midnight.
    // To compare correctly, we ensure the bill date is also treated as local time by adding T00:00:00.
    const billDate = new Date(dateString + 'T00:00:00');
    
    const diffTime = billDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { color: 'red', text: `Overdue by ${Math.abs(diffDays)} day(s)` };
    if (diffDays === 0) return { color: 'red', text: 'Due today' };
    if (diffDays <= 7) return { color: 'yellow', text: `Due in ${diffDays} day(s)` };
    return { color: 'green', text: `Due in ${diffDays} day(s)` };
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
    const displayDate = savedDate 
        ? new Date(savedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Not set';

    return (
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img src={logoUrl} alt={`${serviceName} logo`} className="w-24 h-auto flex-shrink-0" />
            <div className="flex-grow">
                <h4 className="font-bold text-lg text-white">{serviceName} Billing</h4>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`w-3 h-3 rounded-full ${statusColors[status.color as keyof typeof statusColors]}`}></span>
                    <span className="text-sm text-gray-300">
                        Next Bill: {displayDate}
                        <span className="ml-2 font-semibold">({status.text})</span>
                    </span>
                </div>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                    <input 
                        type="date" 
                        value={inputDate}
                        onChange={(e) => setInputDate(e.target.value)}
                        className="form-input text-sm !py-1.5"
                    />
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors">
                        Save Date
                    </button>
                    <a href={billingUrl} target="_blank" rel="noopener noreferrer" className="text-center bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm py-2 px-4 rounded-md transition-colors">
                        Go to Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
};


const BillingReminders: React.FC = () => {
    return (
        <div className="bg-gray-950 p-6 rounded-lg text-gray-200 mt-8">
             <h2 className="text-2xl font-bold mb-4 text-purple-400">External Billing Reminders</h2>
             <p className="text-sm text-gray-400 mb-6">
                This is a simple, manual tool to help you keep track of your Vercel and AWS billing dates. Set your next estimated billing date, and we'll show you a reminder. This data is saved only in your browser.
             </p>
             <div className="space-y-6">
                <ServiceReminder 
                    serviceName="Vercel"
                    logoUrl="https://cratetelevision.s3.us-east-1.amazonaws.com/vercel-logo.svg"
                    billingUrl="https://vercel.com/dashboard/billing"
                    storageKey="cratetv-vercel-billing-date"
                />
                 <ServiceReminder 
                    serviceName="Amazon Web Services"
                    logoUrl="https://cratetelevision.s3.us-east-1.amazonaws.com/aws-logo.svg"
                    billingUrl="https://console.aws.amazon.com/billing/"
                    storageKey="cratetv-aws-billing-date"
                />
             </div>
        </div>
    );
};

export default BillingReminders;