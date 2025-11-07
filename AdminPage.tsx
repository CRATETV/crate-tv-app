import React, { useState, useEffect } from 'react';
import { useFestival } from './contexts/FestivalContext';
import { MovieEditor } from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import FestivalEditor from './components/FestivalEditor';
import AnalyticsPage from './components/AnalyticsPage';
import PayoutsTab from './components/PayoutsTab';
import SecurityTab from './components/SecurityTab';
import WatchPartyManager from './components/WatchPartyManager';
import EmailSender from './components/EmailSender';
import FallbackGenerator from './components/FallbackGenerator';
import RokuAdminTab from './components/RokuAdminTab';
import MoviePipelineTab from './components/MoviePipelineTab';
import { PayoutRequest, ActorSubmission, MoviePipelineEntry } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import ContractsTab from './components/ContractsTab';

const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('analytics');
    
    // Additional state for data fetched after auth
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [actorSubmissions, setActorSubmissions] = useState<ActorSubmission[]>([]);
    const [moviePipeline, setMoviePipeline] = useState<MoviePipelineEntry[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const { movies, categories, festivalData, festivalConfig, aboutData, isLoading: isFestivalLoading } = useFestival();

    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        if (storedPassword) {
            setPassword(storedPassword);
            handleLogin(storedPassword);
        }
    }, []);

    const handleLogin = async (pw: string) => {
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw }),
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('adminPassword', pw);
                setIsAuthenticated(true);
                setRole(data.role);
                fetchAllAdminData(pw);
            } else {
                alert('Invalid password');
            }
        } catch (error) {
            alert('Login failed');
        }
    };
    
    const fetchAllAdminData = async (pw: string) => {
        setIsDataLoading(true);
        // Implement fetching for payouts, submissions, etc.
        // This is a placeholder for where you'd fetch all necessary admin data
        setIsDataLoading(false);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin(password);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <form onSubmit={handlePasswordSubmit} className="p-8 bg-gray-800 rounded-lg shadow-lg w-full max-w-sm">
                    <h1 className="text-2xl text-white mb-4">Admin Access</h1>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white pr-10"
                            placeholder="Enter password"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" /></svg>
                            )}
                        </button>
                    </div>
                    <button type="submit" className="w-full mt-4 p-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Login
                    </button>
                </form>
            </div>
        );
    }
    
    if (isFestivalLoading || isDataLoading) {
        return <LoadingSpinner />;
    }

    const tabs: { id: string; label: string; roles: string[] }[] = [
        { id: 'analytics', label: 'Analytics', roles: ['super_admin', 'master'] },
        { id: 'movies', label: 'Movie Editor', roles: ['super_admin', 'master'] },
        { id: 'categories', label: 'Category Editor', roles: ['super_admin', 'master'] },
        { id: 'festival', label: 'Festival Editor', roles: ['super_admin', 'master', 'festival_admin'] },
        { id: 'payouts', label: 'Payouts', roles: ['super_admin', 'master'] },
        { id: 'contracts', label: 'File Cabinet', roles: ['super_admin', 'master'] },
        { id: 'security', label: 'Security', roles: ['super_admin', 'master'] },
        { id: 'watch-party', label: 'Watch Party', roles: ['super_admin', 'master'] },
        { id: 'email', label: 'Email Sender', roles: ['super_admin', 'master'] },
        { id: 'fallback', label: 'Fallback Generator', roles: ['super_admin', 'master'] },
        { id: 'roku', label: 'Roku Admin', roles: ['super_admin', 'master'] },
        { id: 'movie-pipeline', label: 'Movie Pipeline', roles: ['super_admin', 'master', 'collaborator'] },
    ];

    const accessibleTabs = tabs.filter(tab => role && tab.roles.includes(role));

    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-8">
            <h1 className="text-3xl font-bold mb-6">Crate TV Admin Panel</h1>
            <div className="flex flex-wrap border-b border-gray-700 mb-6">
                {accessibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-4 text-sm font-medium ${activeTab === tab.id ? 'border-b-2 border-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg">
                {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                {activeTab === 'movies' && <MovieEditor allMovies={Object.values(movies)} categories={categories} onSave={async () => {}} onDelete={async () => {}} />}
                {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={async () => {}} />}
                {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={() => {}} onConfigChange={() => {}} onSave={() => {}} />}
                {activeTab === 'payouts' && <PayoutsTab payoutRequests={payoutRequests} onCompletePayout={async () => {}} />}
                {activeTab === 'contracts' && <ContractsTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'watch-party' && <WatchPartyManager allMovies={movies} onSave={async () => {}} />}
                {activeTab === 'email' && <EmailSender />}
                {activeTab === 'fallback' && aboutData && festivalConfig && <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />}
                {activeTab === 'roku' && <RokuAdminTab />}
                {activeTab === 'movie-pipeline' && <MoviePipelineTab pipeline={moviePipeline} onCreateMovie={() => {}} />}
            </div>
        </div>
    );
};

export default AdminPage;