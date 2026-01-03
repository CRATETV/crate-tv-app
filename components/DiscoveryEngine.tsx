
import React, { useState, useMemo } from 'react';
import { Movie, AnalyticsData, Category } from '../types';
import LoadingSpinner from './LoadingSpinner';
import PartnershipFinder from './PartnershipFinder';
import GrantWriter from './GrantWriter';

interface DiscoveryEngineProps {
    analytics: AnalyticsData | null;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    onUpdateCategories: (newCats: Record<string, Category>) => Promise<void>;
}

interface PlatformInsight {
    type: 'GEM' | 'GAP' | 'TREND';
    title: string;
    description: string;
    movieKeys?: string[];
    actionLabel?: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

const InsightCard: React.FC<{ insight: PlatformInsight; onAction: (i: PlatformInsight) => void; isProcessing: boolean }> = ({ insight, onAction, isProcessing }) => {
    const colorClass = insight.type === 'GEM' ? 'text-green-500 border-green-500/20 bg-green-500/5' : insight.type === 'GAP' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-blue-500 border-blue-500/20 bg-blue-500/5';
    
    return (
        <div className={`border p-8 rounded-[2.5rem] flex flex-col justify-between group transition-all hover:bg-white/[0.02] ${colorClass}`}>
            <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">{insight.type === 'GEM' ? 'Discovery Opportunity' : insight.type === 'GAP' ? 'Retention Warning' : 'Market Analysis'}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border border-current`}>{insight.impact} IMPACT</span>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">{insight.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">{insight.description}</p>
            </div>
            {insight.actionLabel && (
                <button 
                    onClick={() => onAction(insight)}
                    disabled={isProcessing}
                    className="mt-8 bg-white text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:scale-105 transition-all disabled:opacity-30"
                >
                    {isProcessing ? 'Executing Protocol...' : insight.actionLabel}
                </button>
            )}
        </div>
    );
};

const DiscoveryEngine: React.FC<DiscoveryEngineProps> = ({ analytics, movies, categories, onUpdateCategories }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [insights, setInsights] = useState<PlatformInsight[]>([]);
    const [activeSection, setActiveSection] = useState<'insights' | 'partners' | 'grantwriter'>('insights');

    const generateInsights = async () => {
        setIsAnalyzing(true);
        await new Promise(r => setTimeout(r, 2000));

        const movieArray = Object.values(movies) as Movie[];
        const gems = movieArray.filter(m => {
            const views = analytics?.viewCounts[m.key] || 0;
            return views > 10 && (m.likes || 0) / views > 0.2;
        }).slice(0, 3);

        const newInsights: PlatformInsight[] = [];

        if (gems.length > 0) {
            newInsights.push({
                type: 'GEM',
                title: "Undiscovered Heat",
                description: `"${gems[0].title}" has a 20%+ like-to-view ratio but lower than average impressions. Moving this to the Hero Spotlight could increase global revenue by ~14%.`,
                movieKeys: [gems[0].key],
                actionLabel: "Deploy to Hero Spotlight",
                impact: 'HIGH'
            });
        }

        newInsights.push({
            type: 'TREND',
            title: "Dynamic Collection",
            description: "Meta-analysis of recently viewed indie shorts suggests a high affinity for 'Grit-Drama' themes. Suggested row: 'The Edge: Urban Realism'.",
            movieKeys: movieArray.slice(0, 6).map(m => m.key),
            actionLabel: "Generate Row Manifest",
            impact: 'MEDIUM'
        });

        newInsights.push({
            type: 'GAP',
            title: "Metadata Desync",
            description: "Analytics show a high bounce rate on the movie page for 3 specific titles. The posters may be misrepresenting the pacing of the films.",
            impact: 'MEDIUM'
        });

        setInsights(newInsights);
        setIsAnalyzing(false);
    };

    const handleExecuteAction = async (insight: PlatformInsight) => {
        setIsProcessing(true);
        try {
            if (insight.type === 'GEM' && insight.movieKeys) {
                const newFeatured = { ...categories.featured, movieKeys: Array.from(new Set([insight.movieKeys[0], ...categories.featured.movieKeys])) };
                await onUpdateCategories({ ...categories, featured: newFeatured });
            } else if (insight.type === 'TREND' && insight.movieKeys) {
                const newRowKey = `ai_row_${Date.now()}`;
                await onUpdateCategories({ ...categories, [newRowKey]: { title: 'The Edge: Urban Realism', movieKeys: insight.movieKeys } });
            }
            alert("Strategic protocol executed successfully.");
            setInsights(prev => prev.filter(i => i.title !== insight.title));
        } catch (e) {
            alert("Action failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-[fadeIn_0.4s_ease-out]">
            <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/5 w-max mx-auto">
                <button 
                    onClick={() => setActiveSection('insights')}
                    className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'insights' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    Platform Insights
                </button>
                <button 
                    onClick={() => setActiveSection('partners')}
                    className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'partners' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    Grant Research
                </button>
                <button 
                    onClick={() => setActiveSection('grantwriter')}
                    className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSection === 'grantwriter' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    AI Grant Writer
                </button>
            </div>

            {activeSection === 'insights' && (
                <>
                    <div className="bg-gradient-to-br from-indigo-900/40 via-gray-900 to-black p-10 rounded-[3rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 max-w-3xl">
                            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Platform Intelligence</h2>
                            <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">Cross-referencing global telemetry with film metadata to discover strategic growth vectors.</p>
                            <button 
                                onClick={generateInsights} 
                                disabled={isAnalyzing}
                                className="bg-white text-black font-black px-12 py-5 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Scanning Platform Artifacts...' : 'Engage Discovery Engine'}
                            </button>
                        </div>
                    </div>

                    {insights.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.8s_ease-out]">
                            {insights.map((insight, idx) => (
                                <InsightCard key={idx} insight={insight} onAction={handleExecuteAction} isProcessing={isProcessing} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeSection === 'partners' && <PartnershipFinder />}
            {activeSection === 'grantwriter' && <GrantWriter />}
            
            {activeSection === 'insights' && insights.length === 0 && !isAnalyzing && (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
                    <p className="text-gray-500 font-black uppercase tracking-[0.5em]">System Idle // Awaiting Analysis Trigger</p>
                </div>
            )}
        </div>
    );
};

export default DiscoveryEngine;
