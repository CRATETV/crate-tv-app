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
  // FIX: Added isPremiumSubscriber to the User type to track subscription status.
  isPremiumSubscriber?: boolean;
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