import React, { useState } from 'react';

// One "Money" place. Earnings & payouts, every payment (with refunds), bookkeeping and the
// older payout tools used to be four separate tabs; now they are sections of this one.
export type MoneySection = 'earnings' | 'payments' | 'books' | 'tools';

const SECTIONS: { id: MoneySection; label: string; icon: string }[] = [
    { id: 'earnings', label: 'Earnings & payouts', icon: '💸' },
    { id: 'payments', label: 'Payments & refunds', icon: '💳' },
    { id: 'books', label: 'Bookkeeping', icon: '📒' },
    { id: 'tools', label: 'More tools', icon: '🧰' },
];

const MoneyHub: React.FC<{ render: Record<MoneySection, () => React.ReactNode> }> = ({ render }) => {
    const [section, setSection] = useState<MoneySection>('earnings');
    return (
        <div className="space-y-8">
            <div role="tablist" aria-label="Money sections" className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {SECTIONS.map(s => (
                    <button key={s.id} role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)}
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold border transition-colors ${section === s.id ? 'bg-white text-black border-white' : 'bg-[#131318] text-[#A1A1AD] border-white/[0.07] hover:text-white'}`}>
                        <span aria-hidden className="mr-1.5">{s.icon}</span>{s.label}
                    </button>
                ))}
            </div>
            {render[section]()}
        </div>
    );
};
export default MoneyHub;
