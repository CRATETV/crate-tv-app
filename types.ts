
// FIX: Removed circular import from './types'. The types are defined in this file and should not be imported from themselves.

export interface Actor {
  name: string;
  photo: string;
  bio: string;
  highResPhoto: string;
}

export interface Movie {
  key: string;
  title: string;
  synopsis: string;
  cast: Actor[];
  director: string;
  trailer: string;
  fullMovie: string;
  poster: string;
  tvPoster: string;
  likes: number;
  releaseDateTime?: string;
  mainPageExpiry?: string;
  durationInMinutes?: number;
  rating?: number;
}

export interface Category {
  title: string;
  movieKeys: string[];
}

export interface FilmBlock {
  id: string;
  title: string;
  time: string;
  movieKeys: string[];
}

export interface FestivalDay {
  day: number;
  date: string;
  blocks: FilmBlock[];
}

export interface FestivalConfig {
  title: string;
  description: string;
  isFestivalLive?: boolean;
}

export interface User {
  uid: string;
  email: string;
  avatar?: string;
  isPremiumSubscriber?: boolean;
  watchlist?: string[];
}

export interface FilmmakerPayout {
    movieTitle: string;
    director: string;
    totalDonations: number; // in cents
    crateTvCut: number; // in cents
    filmmakerPayout: number; // in cents
}

export interface AnalyticsData {
    totalRevenue: number;
    totalDonations: number;
    totalSales: number;
    salesByType: Record<string, number>;
    filmmakerPayouts: FilmmakerPayout[];
    viewCounts: Record<string, number>;
    movieLikes: Record<string, number>;
    totalUsers: number;
    recentUsers: { email: string; creationTime: string; }[];
}

export interface AboutData {
  missionStatement: string;
  story: string;
  belief1Title: string;
  belief1Body: string;
  belief2Title: string;
  belief2Body: string;
  belief3Title: string;
  belief3Body: string;
  founderName: string;
  founderTitle: string;
  founderBio: string;
  founderPhoto: string;
}

export interface LiveData {
  movies: Record<string, Movie>;
  categories: Record<string, Category>;
  festivalData: FestivalDay[];
  festivalConfig: FestivalConfig;
  aboutData: AboutData;
}

export interface FetchResult {
  data: LiveData;
  source: 'live' | 'fallback';
  timestamp: number;
}

export interface ActorSubmission {
  id: string; // Document ID
  actorName: string;
  email: string;
  bio: string;
  photoUrl: string;
  highResPhotoUrl: string;
  imdbUrl?: string;
  submissionDate: any; // Firestore timestamp
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ActorProfile {
  name: string;
  slug: string;
  bio: string;
  photo: string;
  highResPhoto: string;
  imdbUrl?: string;
}

export interface ActorPost {
  id: string;
  actorName: string;
  actorPhoto: string;
  content: string;
  imageUrl?: string;
  timestamp: any; // Firestore timestamp
  likes: string[]; // Array of actor names who liked it
}

export interface FilmmakerFilmPerformance {
    key: string;
    title: string;
    views: number;
    likes: number;
    donations: number; // in cents
}

export interface FilmmakerAnalytics {
    totalDonations: number; // in cents
    totalPaidOut: number; // in cents
    balance: number; // in cents
    films: FilmmakerFilmPerformance[];
}

export interface PayoutRequest {
    id: string;
    directorName: string;
    amount: number; // in cents
    payoutMethod: 'PayPal' | 'Venmo' | 'Other';
    payoutDetails: string;
    status: 'pending' | 'completed';
    requestDate: any; // Firestore timestamp
    completionDate?: any;
}