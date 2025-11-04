
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
  likes: number;
  rating?: number;
  awards?: string[];
  releaseDateTime?: string;
  mainPageExpiry?: string;
  durationInMinutes?: number;
  isForSale?: boolean;
  price?: number; // in cents
  hasCopyrightMusic?: boolean;
  isWatchPartyEligible?: boolean;
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
    email: string;
    name: string;
    avatar: string;
    watchlist: string[];
    isPremiumSubscriber?: boolean;
    isActor?: boolean;
    isFilmmaker?: boolean;
}

export interface ActorSubmission {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  bio: string;
  imdbUrl?: string;
  submittedAt: any; // Firestore timestamp
}

export interface MoviePipelineEntry {
  id: string;
  title: string;
  posterUrl: string;
  movieUrl: string;
  cast: string;
  director: string;
  status: 'pending' | 'created';
  submittedAt: any; // Firestore timestamp
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
  payoutMethod: 'PayPal' | 'Venmo' | 'Other';
  payoutDetails: string;
  status: 'pending' | 'completed';
  requestDate: any; // Firestore timestamp
  completionDate?: any; // Firestore timestamp
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

export interface AdminPayout {
    id: string;
    amount: number;
    reason: string;
    payoutDate: any; // Firestore timestamp
}

export interface BillSavingsTransaction {
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    reason: string;
    transactionDate: any; // Firestore timestamp
}

// FIX: Add FilmmakerPayout interface for analytics data.
export interface FilmmakerPayout {
    movieTitle: string;
    totalDonations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    totalAdRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
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
    // FIX: Update filmmakerPayouts to use the new strict type.
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
    merchSales: Record<string, { name: string; units: number; revenue: number }>;
    totalFestivalRevenue: number;
    festivalPassSales: { units: number; revenue: number };
    festivalBlockSales: { units: number; revenue: number };
    salesByBlock: Record<string, { units: number; revenue: number }>;
}

export interface ActorPost {
    id: string;
    actorName: string;
    actorPhoto: string;
    content: string;
    imageUrl?: string;
    timestamp: any; // Firestore Timestamp
    likes: string[]; // Array of actor names who liked it
}

export interface FilmmakerPost {
    id: string;
    filmmakerName: string;
    avatarId: string;
    content: string;
    imageUrl?: string;
    timestamp: any; // Firestore Timestamp
    likes: string[]; // Array of user UIDs who liked it
}

export interface ActorProfile {
    name: string;
    slug: string;
    bio: string;
    photo: string;
    highResPhoto: string;
    imdbUrl?: string;
}

export interface WatchPartySession {
    movieKey: string;
    state: 'playing' | 'paused';
    currentTime: number;
    host: string | null;
    createdAt: any; // Firestore Timestamp
    lastUpdatedAt: any; // Firestore Timestamp
}

export interface ChatMessage {
    id?: string;
    uid: string;
    name: string;
    avatar: string;
    text: string;
    timestamp: any; // Firestore Timestamp
}
