import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface FestivalContextType {
    unlockedBlockIds: Set<string>;
    hasAllAccessPass: boolean;
    unlockBlock: (blockId: string) => void;
    grantAllAccess: () => void;
}

const FestivalContext = createContext<FestivalContextType | undefined>(undefined);

const UNLOCKED_BLOCKS_KEY = 'cratetv-unlockedBlocks';
const ALL_ACCESS_PASS_KEY = 'cratetv-allAccessPass';

export const FestivalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [unlockedBlockIds, setUnlockedBlockIds] = useState<Set<string>>(new Set());
    const [hasAllAccessPass, setHasAllAccessPass] = useState(false);

    useEffect(() => {
        try {
            const storedBlocks = localStorage.getItem(UNLOCKED_BLOCKS_KEY);
            if (storedBlocks) {
                setUnlockedBlockIds(new Set(JSON.parse(storedBlocks)));
            }
            const storedPass = localStorage.getItem(ALL_ACCESS_PASS_KEY);
            if (storedPass === 'true') {
                setHasAllAccessPass(true);
            }
        } catch (error) {
            console.error("Failed to load festival access state from localStorage", error);
        }
    }, []);

    const unlockBlock = (blockId: string) => {
        setUnlockedBlockIds(prevIds => {
            const newIds = new Set(prevIds);
            newIds.add(blockId);
            try {
                localStorage.setItem(UNLOCKED_BLOCKS_KEY, JSON.stringify(Array.from(newIds)));
            } catch (e) {
                console.error("Could not save unlocked blocks to localStorage", e);
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
    
    const value = { unlockedBlockIds, hasAllAccessPass, unlockBlock, grantAllAccess };

    return <FestivalContext.Provider value={value}>{children}</FestivalContext.Provider>;
};

export const useFestivalAccess = () => {
    const context = useContext(FestivalContext);
    if (context === undefined) {
        throw new Error('useFestivalAccess must be used within a FestivalProvider');
    }
    return context;
};