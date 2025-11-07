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
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import MoviePipelineTab from './components/MoviePipelineTab';
import { PayoutRequest, ActorSubmission, MoviePipelineEntry, Movie, Category, FestivalDay, FestivalConfig, AboutData } from './types';
import LoadingSpinner from './components/LoadingSpinner';

const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
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
                <form onSubmit={handlePasswordSubmit} className="p-8 bg-gray-800 rounded-lg shadow-lg">
                    <h1 className="text-2xl text-white mb-4">Admin Access</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 text-white"
                        placeholder="Enter password"
                    />
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
        { id: 'security', label: 'Security', roles: ['super_admin', 'master'] },
        { id: 'watch-party', label: 'Watch Party', roles: ['super_admin', 'master'] },
        { id: 'email', label: 'Email Sender', roles: ['super_admin', 'master'] },
        { id: 'fallback', label: 'Fallback Generator', roles: ['super_admin', 'master'] },
        { id: 'roku', label: 'Roku Admin', roles: ['super_admin', 'master'] },
        { id: 'actor-submissions', label: 'Actor Submissions', roles: ['super_admin', 'master', 'collaborator'] },
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
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'watch-party' && <WatchPartyManager allMovies={movies} onSave={async () => {}} />}
                {activeTab === 'email' && <EmailSender />}
                {activeTab === 'fallback' && aboutData && festivalConfig && <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />}
                {activeTab === 'roku' && <RokuAdminTab />}
                {activeTab === 'actor-submissions' && <ActorSubmissionsTab submissions={actorSubmissions} allMovies={movies} onApprove={async () => {}} onReject={async () => {}} />}
                {activeTab === 'movie-pipeline' && <MoviePipelineTab pipeline={moviePipeline} onCreateMovie={() => {}} />}
            </div>
        </div>
    );
};

export default AdminPage;
