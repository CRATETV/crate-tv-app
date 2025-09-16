import React, { useState, useEffect } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import LoadingSpinner from './components/LoadingSpinner.tsx';

type AdminView = 'dashboard' | 'movies' | 'festival';

const AdminPage: React.FC = () => {
    // Auth state
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Permission state
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [hasElevatedPrivileges, setHasElevatedPrivileges] = useState(false);

    // Data state
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '' });
    const [isLoadingData, setIsLoadingData] = useState(true);

    // UI State
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishMessage, setPublishMessage] = useState({ type: '', text: '' });
    const [dataDirty, setDataDirty] = useState(false);

    // Check session for login status on mount
    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        const storedIsDev = sessionStorage.getItem('isDeveloper') === 'true';
        const storedIsElevated = sessionStorage.getItem('hasElevatedPrivileges') === 'true';
        if (storedPassword) {
            setIsLoggedIn(true);
            setIsDeveloper(storedIsDev);
            setHasElevatedPrivileges(storedIsElevated);
        }
    }, []);

    // Fetch data once logged in
    useEffect(() => {
        if (isLoggedIn) {
            const loadAdminData = async () => {
                setIsLoadingData(true);
                invalidateCache();
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                setFestivalData(data.festivalData || []);
                setFestivalConfig(data.festivalConfig || { title: '', description: '' });
                setIsLoadingData(false);
                setDataDirty(false); // Reset dirty state on data load
            };
            loadAdminData();
        }
    }, [isLoggedIn]);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setAuthError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                sessionStorage.setItem('adminPassword', password);
                sessionStorage.setItem('isDeveloper', data.isDeveloper ? 'true' : 'false');
                sessionStorage.setItem('hasElevatedPrivileges', data.hasElevatedPrivileges ? 'true' : 'false');
                setIsLoggedIn(true);
                setIsDeveloper(data.isDeveloper);
                setHasElevatedPrivileges(data.hasElevatedPrivileges);
            } else {
                setAuthError(data.error || 'Login failed.');
            }
        } catch (error) {
            setAuthError('An error occurred. Please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        setIsLoggedIn(false);
        setPassword('');
        setCurrentView('dashboard');
    };

    const handleSaveMovie = (movieToSave: Movie) => {
        setMovies(prev => ({ ...prev, [movieToSave.key]: movieToSave }));
        setEditingMovie(null);
        setDataDirty(true);
    };

    const handleDeleteMovie = (movieKey: string) => {
        if (window.confirm(`Are you sure you want to delete the movie with key "${movieKey}"? This action cannot be undone.`)) {
            setMovies(