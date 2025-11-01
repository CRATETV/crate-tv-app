
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
  likes: number;
  rating?: number;
  releaseDateTime?: string;
  mainPageExpiry?: string;
  durationInMinutes?: number;
  producers?: string;
  isForSale?: boolean;
  price?: number;
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
  startDate: string;
  endDate: string;
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

export interface ActorSubmission {
    id: string;
    actorName: string;
    email: string;
    bio: string;
    photoUrl: string;
    highResPhotoUrl: string;
    imdbUrl: string;
    submissionDate: { seconds: number; nanoseconds: number; };
    status: 'pending' | 'approved' | 'rejected';
}

export interface LiveData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig;
    festivalData: FestivalDay[];
    aboutData: AboutData;
    actorSubmissions: ActorSubmission[];
}

export interface FetchResult {
    data: LiveData;
    source: 'live' | 'fallback';
    timestamp: number;
}

export interface PayoutRequest {
    id: string;
    directorName: string;
    amount: number;
    payoutMethod: 'PayPal' | 'Venmo' | 'Other';
    payoutDetails: string;
    status: 'pending' | 'completed';
    requestDate: { seconds: number; nanoseconds?: number; };
    completionDate?: { seconds: number; nanoseconds?: number; };
}

export interface User {
    uid: string;
    email: string;
    name: string;
    isActor: boolean;
    isFilmmaker: boolean;
    avatar: string;
    isPremiumSubscriber: boolean;
    watchlist: string[];
}

export interface FilmmakerPayout {
    movieTitle: string;
    director: string;
    totalDonations: number;
    crateTvCut: number;
    filmmakerPayout: number;
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
}

export interface ActorPost {
    id: string;
    actorName: string;
    actorPhoto: string;
    content: string;
    imageUrl?: string;
    timestamp: { seconds: number; nanoseconds: number; };
    likes: string[];
}

export interface ActorProfile {
    name: string;
    slug: string;
    bio: string;
    photo: string;
    highResPhoto: string;
    imdbUrl: string;
}

export interface FilmmakerFilmPerformance {
    key: string;
    title: string;
    views: number;
    likes: number;
    donations: number;
}

export interface FilmmakerAnalytics {
    totalDonations: number;
    totalPaidOut: number;
    balance: number;
    films: FilmmakerFilmPerformance[];
}
