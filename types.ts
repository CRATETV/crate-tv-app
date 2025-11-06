// types.ts

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
  isWatchPartyEnabled?: boolean;
  watchPartyStartTime?: string;
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
    email: string;
    name?: string;
    isActor?: boolean;
    isFilmmaker?: boolean;
    avatar?: string;
    isPremiumSubscriber?: boolean;
    watchlist?: string[];
    watchedMovies?: string[];
    likedMovies?: string[];
    hasFestivalAllAccess?: boolean;
    unlockedBlockIds?: string[];
    purchasedMovieKeys?: string[];
    rokuDeviceId?: string;
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
    transactionDate: { seconds: number; nanoseconds: number; };
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
    merchSales: Record<string, { name: string; units: number; revenue: number }>;
    totalFestivalRevenue: number;
    festivalPassSales: { units: number; revenue: number };
    festivalBlockSales: { units: number; revenue: number };
    salesByBlock: Record<string, { units: number; revenue: number }>;
}

export interface ActorSubmission {
    id: string;
    actorName: string;
    email: string;
    bio: string;
    photoUrl: string;
    highResPhotoUrl: string;
    imdbUrl?: string;
    submissionDate: { seconds: number, nanoseconds: number };
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
    festivalConfig: FestivalConfig;
    festivalData: FestivalDay[];
    aboutData: AboutData;
    actorSubmissions: ActorSubmission[];
    moviePipeline: MoviePipelineEntry[];
}

export interface FetchResult {
    data: LiveData;
    source: 'live' | 'fallback';
    timestamp: number;
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
  status: 'waiting' | 'live' | 'ended';
  lastUpdatedBy: string;
  lastUpdated?: any; // Firestore timestamp
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

export interface ActorProfile {
    name: string;
    slug: string;
    bio: string;
    photo: string;
    highResPhoto: string;
    imdbUrl: string;
}

export interface MonthlyDataPoint {
  month: string;
  value: number;
}

export interface AiGrowthAdvice {
    userGrowth: string[];
    revenueGrowth: string[];
    communityEngagement: string[];
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
        totalVisitors: number;
        totalUsers: number;
        conversionRate: number;
        dailyActiveUsers: number;
        weeklyActiveUsers: number;
        totalRevenue: number;
        projectedUsersYtd: number;
        projectedRevenueYtd: number;
        totalViews: number;
        totalLikes: number;
        totalWatchlistAdds: number;
        totalFilms: number;
        mostViewedFilm: { title: string; views: number };
        mostLikedFilm: { title: string; likes: number };
        avgRevenuePerUser: number;
        totalDonations: number;
        totalSales: number;
        audienceBreakdown: {
            total: number;
            actors: number;
            filmmakers: number;
        };
        topCountries: { country: string; views: number }[];
        topEarningFilms: { title: string; totalRevenue: number }[];
    };
    aboutData?: AboutData;
    avgMoMUserGrowth?: number;
}

// FIX: Added missing types for Filmmaker Analytics
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

// --- NEW SECURITY TYPES ---

export interface SecurityEvent {
    id?: string;
    type: 'FAILED_ADMIN_LOGIN' | 'FAILED_PAYMENT' | 'CONTACT_SENT' | 'SUBMISSION_SENT';
    ip: string | null;
    timestamp: any; // Firestore timestamp
    details?: Record<string, any>;
}

export interface SecurityReport {
    totalEvents: number;
    eventsByType: Record<string, number>;
    suspiciousIps: { ip: string; count: number; types: string[] }[];
    recentEvents: SecurityEvent[];
    threatLevel: 'red' | 'yellow' | 'green';
}

export interface AiSecurityAdvice {
    summary: string;
    recommendations: string[];
}