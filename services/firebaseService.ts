import { getDbInstance } from './firebaseClient';
import { MoviePipelineEntry } from '../types';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export const addMoviePipelineEntry = async (entry: Omit<MoviePipelineEntry, 'id'>) => {
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('movie_pipeline').add({
        ...entry,
        submissionDate: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const deleteMoviePipelineEntry = async (id: string) => {
    const password = sessionStorage.getItem('adminPassword');
    if (!password) {
        throw new Error("Authentication required to delete pipeline entries.");
    }
    const response = await fetch('/api/delete-pipeline-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete pipeline entry.');
    }
};
