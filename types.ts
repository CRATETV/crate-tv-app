import { FieldValue } from 'firebase-admin/firestore';

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
  producers?: string;
  trailer: string;
  fullMovie: string;
  poster: string;
  tvPoster?: string;
  likes?: number;
  rating?: number;
  releaseDateTime?: string;
  mainPageExpiry?: string;
  durationInMinutes?: number;
  hasCopyrightMusic?: boolean;
  // New properties for Watch Party scheduling
  isWatchPartyEnabled?: boolean;
  watchPartyStartTime?: string;
  // New properties for monetization
  isForSale?: boolean;
  salePrice?: number;
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

export interface User {
  uid: string;
  email: string | null;
  name?: string;
  avatar?: string;
  isActor?: boolean;
  isFilmmaker?: boolean;
  isPremiumSubscriber?: boolean;
  watchlist: string[];
  watchedMovies: string[];
  likedMovies: string[];
  // Festival & Purchase related
  hasFestivalAllAccess?: boolean;
  unlockedBlockIds?: string[];
  purchasedMovieKeys?: string[];
}

export interface ActorSubmission {
  id: string;
  actorName: string;
  email: string;
  bio: string;
  photoUrl: string;
  highResPhotoUrl: string;
  imdbUrl?: string;
  submissionDate: {
    seconds: number;
    nanoseconds: number;
  };
  status: 'pending' | 'approved' | 'rejected';
}

export interface MoviePipelineEntry {
  id: string;
  title: string;
  posterUrl: string;
  movieUrl: string;
  cast: string;
  director: string;
  submittedAt: any; // Firestore timestamp
  status: 'pending' | 'processed';
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

export interface PayoutRequest {
  id: string;
  directorName: string;
  amount: number;
  payoutMethod: string;
  payoutDetails: string;
  status: 'pending' | 'completed';
  requestDate: { seconds: number; nanoseconds: number; };
  completionDate?: { seconds: number; nanoseconds: number; };
}

export interface AdminPayout {
  id: string;
  amount: number;
  reason: string;
  payoutDate: { seconds: number, nanoseconds: number };
}

export interface BillSavingsTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string;
  transactionDate: { seconds: number, nanoseconds: number };
}

export interface AnalyticsData {
  totalRevenue: number;
  totalCrateTvRevenue: number;
  totalAdminPayouts: number;
  pastAdminPayouts: AdminPayout[];
  billSavingsPotTotal: number;
  billSavingsTransactions: BillSavingsTransaction[];
  totalUsers: number;
  viewCounts: Record<string, number>;
  movieLikes: Record<string, number>;
  filmmakerPayouts: FilmmakerPayout[];
  viewLocations: Record<string, Record<string, number>>;
  allUsers: { email: string }[];
  actorUsers: { email: string }[];
  filmmakerUsers: { email: string }[];
  totalDonations: number;
  totalSales: number;
  totalMerchRevenue: number;
  totalAdRevenue: number;
  crateTvMerchCut: number;
  merchSales: Record<string, { name: string; units: number; revenue: number; }>;
  totalFestivalRevenue: number;
  festivalPassSales: { units: number; revenue: number; };
  festivalBlockSales: { units: number; revenue: number; };
  salesByBlock: Record<string, { units: number; revenue: number; }>;
}

export interface FilmmakerPayout {
    movieTitle: string;
    totalDonations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    totalAdRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
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

export interface ActorProfile {
    name: string;
    slug: string;
    bio: string;
    photo: string;
    highResPhoto: string;
    imdbUrl: string;
}

export interface ActorPost {
    id: string;
    actorName: string;
    actorPhoto: string;
    content: string;
    imageUrl?: string;
    timestamp: any; // Firestore timestamp
    likes: string[];
}

export interface ChatMessage {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: any; // Firestore timestamp
}

export interface WatchPartyState {
  isPlaying: boolean;
  currentTime: number;
  lastUpdatedBy?: string;
  lastUpdated?: any; // Firestore server timestamp
}

// Types for the new Growth Analytics feature
export interface MonthlyDataPoint {
  month: string; // e.g., "Jul '24"
  value: number;
}

export interface GrowthAnalyticsData {
  historical: {
    users: MonthlyDataPoint[];
    revenue: MonthlyDataPoint[];
  };
  projections: {
    users: MonthlyDataPoint[];
    revenue: MonthlyDataPoint[];
  };
  keyMetrics: {
    totalUsers: number;
    totalRevenue: number;
    projectedUsersYtd: number;
    projectedRevenueYtd: number;
  };
}

export interface AiGrowthAdvice {
  userGrowth: string[];
  revenueGrowth: string[];
  communityEngagement: string[];
}