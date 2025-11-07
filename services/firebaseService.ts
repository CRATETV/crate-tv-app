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
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('movie_pipeline').doc(id).delete();
};
