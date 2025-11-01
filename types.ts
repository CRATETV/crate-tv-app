// FIX: Defined and exported all necessary types for the application.

// From moviesData
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
  tvPoster?: string;
  likes?: number;
  rating?: number;
  releaseDateTime?: string;
  mainPageExpiry?: string;
  isForSale?: boolean;
  price?: number;
  producers?: string;
  durationInMinutes?: number;
}

// From categoriesData
export interface Category {
  title: string;
  movieKeys: string[];
}

// From festivalData and festivalConfigData
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
    startDate: string;
    endDate: string;
}

// From aboutData
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

// From AuthContext.tsx
export interface User {
    uid: string;
    email: string;
    name?: string;
    isActor: boolean;
    isFilmmaker: boolean;
    avatar?: string;
    isPremiumSubscriber?: boolean;
    watchlist?: string[];
}

// From Admin & Firebase services
export interface ActorSubmission {
    id: string;
    actorName: string;
    email: string;
    bio: string;
    photoUrl: string;
    highResPhotoUrl: string;
    imdbUrl?: string;
    submissionDate: { seconds: number; nanoseconds: number };
    status: 'pending' | 'approved' | 'rejected';
}

export interface PayoutRequest {
    id: string;
    directorName: string;
    amount: number;
    payoutMethod: 'PayPal' | 'Venmo' | 'Other';
    payoutDetails: string;
    status: 'pending' | 'completed';
    requestDate: { seconds: number; nanoseconds: number };
    completionDate?: { seconds: number; nanoseconds: number };
}

export interface MoviePipelineEntry {
  id: string;
  title: string;
  posterUrl: string;
  movieUrl: string;
  cast: string;
  director: string;
  status: 'pending' | 'completed';
  submittedAt: { seconds: number; nanoseconds: number };
}

export interface LiveData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    aboutData: AboutData;
    actorSubmissions: ActorSubmission[];
    moviePipeline: MoviePipelineEntry[];
}

export interface FetchResult {
  data: LiveData;
  source: 'live' | 'fallback';
  timestamp: number;
}

// From Analytics
export interface FilmmakerPayout {
    movieTitle: string;
    director: string;
    totalDonations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    totalAdRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
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
    allUsers: { email: string; creationTime: string; }[];
    viewLocations: Record<string, Record<string, number>>;
    totalFestivalRevenue: number;
    festivalPassSales: { units: number, revenue: number };
    festivalBlockSales: { units: number, revenue: number };
    salesByBlock: Record<string, { units: number, revenue: number }>;
    totalMerchRevenue: number;
    crateTvMerchCut: number;
    merchSales: Record<string, { name: string, units: number, revenue: number }>;
    totalAdRevenue: number;
    crateTvAdShare: number;
    totalFilmmakerAdPayouts: number;
}

export interface FilmmakerFilmPerformance {
    key: string;
    title: string;
    views: number;
    likes: number;
    donations: number;
    adRevenue: number;
}

export interface FilmmakerAnalytics {
    totalDonations: number;
    totalAdRevenue: number;
    totalPaidOut: number;
    balance: number;
    films: FilmmakerFilmPerformance[];
}

// From Green Room Feed
export interface ActorPost {
    id: string;
    actorName: string;
    actorPhoto: string;
    content: string;
    imageUrl?: string;
    timestamp: { seconds: number, nanoseconds: number };
    likes: string[];
}

// From public actor profiles
export interface ActorProfile {
    name: string;
    slug: string;
    bio: string;
    photo: string;
    highResPhoto: string;
    imdbUrl: string;
}