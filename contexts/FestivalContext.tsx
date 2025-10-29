import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface FestivalContextType {
    unlockedItemIds: Set<string>;
    hasAllAccessPass: boolean;
    unlockItem: (itemId: string) => void;
    grantAllAccess: () => void;
}

const FestivalContext = createContext<FestivalContextType | undefined>(undefined);

const UNLOCKED_ITEMS_KEY = 'cratetv-unlockedItems-v2';
const ALL_ACCESS_PASS_KEY = 'cratetv-allAccessPass';

export const FestivalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [unlockedItemIds, setUnlockedItemIds] = useState<Set<string>>(new Set());
    const [hasAllAccessPass, setHasAllAccessPass] = useState(false);

    useEffect(() => {
        try {
            const storedItems = localStorage.getItem(UNLOCKED_ITEMS_KEY);
            if (storedItems) {
                setUnlockedItemIds(new Set(JSON.parse(storedItems)));
            }
            const storedPass = localStorage.getItem(ALL_ACCESS_PASS_KEY);
            if (storedPass === 'true') {
                setHasAllAccessPass(true);
            }
        } catch (error) {
            console.error("Failed to load festival access state from localStorage", error);
        }
    }, []);

    const unlockItem = (itemId: string) => {
        setUnlockedItemIds(prevIds => {
            const newIds = new Set(prevIds);
            newIds.add(itemId);
            try {
                localStorage.setItem(UNLOCKED_ITEMS_KEY, JSON.stringify(Array.from(newIds)));
            } catch (e) {
                console.error("Could not save unlocked items to localStorage", e);
            }
            return newIds;
        });
    };

    const grantAllAccess = () => {
        setHasAllAccessPass(true);
        try {
            localStorage.setItem(ALL_ACCESS_PASS_KEY, 'true');
        } catch (e) {
            console.error("Could not save all-access pass to localStorage", e);
        }
    };
    
    const value = { unlockedItemIds, hasAllAccessPass, unlockItem, grantAllAccess };

    return <FestivalContext.Provider value={value}>{children}</FestivalContext.Provider>;
};

export const useFestivalAccess = () => {
    const context = useContext(FestivalContext);
    if (context === undefined) {
        throw new Error('useFestivalAccess must be used within a FestivalProvider');
    }
    return context;
};