import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import AboutEditor from './components/AboutEditor';
import FestivalEditor from './components/FestivalEditor';
import AnalyticsPage from './components/AnalyticsPage';
import WatchPartyManager from './components/WatchPartyManager';
import SecurityTab from './components/SecurityTab';
import FallbackGenerator from './components/FallbackGenerator';
import EmailSender from './components/EmailSender';
import SaveStatusToast from './components/SaveStatusToast';
import MonetizationTab from './components/MonetizationTab';
import HeroManager from './components/HeroManager';
import LaurelManager from './components/LaurelManager';
import PitchDeckManager from './components/PitchDeckManager';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import JuryPortal from './components/JuryPortal';

// Removed 'actors' tab as requested
const ALL_TABS: Record<string, string> = {
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    jury: '⚖️ Jury Room',
    analytics: '📊 Analytics',
    hero: '🎬 Hero',
    laurels: '🏆 Laurels',
    pitch: '📽️ Pitch Deck',
    categories: '📂 Categories',
    festival: '🎪 Festival',
    watchParty: '🍿 Watch Party',
    about: '📄 About',
    email: '✉️ Email',
    monetization: '💰 Revenue',
    security: '🛡️ Security',
    fallback: '💾 Fallback'
};

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [activeTab, setActiveTab] = useState('movies');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveError, setSaveError] = useState('');

    const [pendingPromotion, setPendingPromotion] = useState<MoviePipelineEntry | null>(null);

    const fetchAllData = useCallback(async (adminPassword: string) => {
        setIsLoading(true);
        try {
            const [liveDataRes, pipelineRes] = await Promise.all([
                fetch(`/api/get-live-data?noCache=true&t=${Date.now()}`),
                fetch('/api/get-pipeline-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                })
            ]);

            if (liveDataRes.ok) {
                const data = await liveDataRes.json();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                setAboutData(data.aboutData || null);
                setFestivalData(data.festivalData || []);
                setFestivalConfig(data.festivalConfig || null);
            }

            if (pipelineRes && pipelineRes.ok) {
                const data = await pipelineRes.json();
                setPipeline(data.pipeline || []);
            }

        } catch (err) {
            console.warn("Background data load issue:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleLogin = async (e?: React.FormEvent | null, storedPassword?: string) => {
        e?.preventDefault();
        const passToTry = storedPassword || password;
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passToTry }),
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('adminPassword', passToTry);
                setIsAuthenticated(true);
                fetchAllData(passToTry);
            } else {
                setError('Invalid access token.');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Authentication service unreachable.');
            setIsLoading(false);
        }
    };

    const handleSaveData = async (type: string, dataToSave: any) => {
        setIsSaving(true);
        setSaveMessage('');
        setSaveError('');
        const pass = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass, type, data: dataToSave }),
            });
            if (response.ok) {
                const displayType = type === 'delete_movie' ? 'Movie' : type.charAt(0).toUpperCase() + type.slice(1);
                const verb = type === 'delete_movie' ? 'removed' : 'deployed';
                setSaveMessage(`${displayType} ${verb} successfully.`);
                fetchAllData(pass!);
            } else {
                throw new Error("Server rejected changes.");
            }
        } catch (err) {
            setSaveError("Failed to sync changes with live site.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetNowStreaming = async (movieKey: string) => {
        setIsSaving(true);
        const pass = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass, type: 'set_now_streaming', data: { key: movieKey } }),
            });
            if (response.ok) {
                setSaveMessage(`Featured banner updated.`);
                fetchAllData(pass!);
            }
        } catch (err) {
            setSaveError("Banner update failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePromoteToCatalog = (item: MoviePipelineEntry) => {
        setPendingPromotion(item);
        setActiveTab('movies');
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
                <div className="w-full max-w-sm">
                    <form onSubmit={handleLogin} className="bg-gray-900 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
                        <div className="text-center mb-10">
                            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-32 mx-auto mb-6" alt="Crate TV" />
                            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-gray-600">Secure Terminal</h1>
                        </div>
                        <div className="mb-8">
                            <label className="form-label" htmlFor="password">Operator Key</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input text-center tracking-widest bg-black/40 border-white/5"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs font-bold mb-6 text-center">{error}</p>}
                        <button className="submit-btn w-full !rounded-2xl py-4 bg-red-600 hover:bg-red-700 transition-colors" type="submit">Establish Uplink</button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 border-b border-white/5 pb-10">
                    <div className="flex items-center gap-6">
                         <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-20" alt="Logo" />
                         <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Studio <span className="text-red-600">Command</span></h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-[9px] font-black uppercase tracking-widest text-green-500">Infrastructure Online // Global Node Ready</p>
                            </div>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {isSaving && <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>}
                        <button 
                            onClick={() => { sessionStorage.clear(); window.location.reload(); }} 
                            className="bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10"
                        >
                            Terminate Session
                        </button>
                    </div>
                </div>
                
                <div className="flex overflow-x-auto pb-4 mb-10 gap-2 scrollbar-hide border-b border-white/5">
                   {Object.entries(ALL_TABS).map(([tabId, label]) => (
                        <button
                            key={tabId}
                            onClick={() => {
                                setActiveTab(tabId);
                                if (tabId !== 'movies') setPendingPromotion(null);
                            }}
                            className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all whitespace-nowrap border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-xl shadow-red-900/30' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                        >
                            {label}
                        </button>
                   ))}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={handleSetNowStreaming} movieToCreate={pendingPromotion} onCreationDone={() => setPendingPromotion(null)} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={handlePromoteToCatalog} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'jury' && <JuryPortal pipeline={pipeline} />}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'hero' && <HeroManager allMovies={Object.values(movies)} featuredKeys={categories.featured?.movieKeys || []} onSave={(keys) => handleSaveData('categories', { featured: { title: 'Featured Films', movieKeys: keys } })} isSaving={isSaving} />}
                    {activeTab === 'laurels' && <LaurelManager allMovies={Object.values(movies)} />}
                    {activeTab === 'pitch' && <PitchDeckManager onSave={(settings) => handleSaveData('settings', settings)} isSaving={isSaving} />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={(newData) => handleSaveData('categories', newData)} isSaving={isSaving} />}
                    {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={(d) => setFestivalData(d)} onConfigChange={(c) => setFestivalConfig(c)} onSave={() => handleSaveData('festival', { config: festivalConfig, schedule: festivalData })} isSaving={isSaving} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'about' && aboutData && <AboutEditor initialData={aboutData} onSave={(newData) => handleSaveData('about', newData)} isSaving={isSaving} />}
                    {activeTab === 'email' && <EmailSender />}
                    {activeTab === 'monetization' && <MonetizationTab />}
                    {activeTab === 'security' && <SecurityTab />}
                    {activeTab === 'fallback' && <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />}
                </div>
            </div>
            {(saveMessage || saveError) && (
                <SaveStatusToast 
                    message={saveMessage || saveError} 
                    isError={!!saveError} 
                    onClose={() => { setSaveMessage(''); setSaveError(''); }} 
                />
            )}
        </div>
    );
};

export default AdminPage;