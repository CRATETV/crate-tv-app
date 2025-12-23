
// This file contains type definitions for the Crate TV application.

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
  tvPoster: string;
  likes?: number;
  rating?: number;
  releaseDateTime?: string;
  durationInMinutes?: number;
  hasCopyrightMusic?: boolean;
  isWatchPartyEnabled?: boolean;
  watchPartyStartTime?: string;
  isWatchPartyPaid?: boolean; // New: Toggle for paid parties
  watchPartyPrice?: number;   // New: Ticket price in USD
  isForSale?: boolean;
  salePrice?: number;
  mainPageExpiry?: string;
  isCratemas?: boolean; // New: Flag for automatic Cratemas categorization
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
  isFestivalLive?: boolean;
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

export interface AdConfig {
    socialBarScript?: string;
    vastTagUrl?: string;
}

export interface User {
  uid: string;
  email: string | null;
  name?: string;
  avatar?: string;
  isActor?: boolean;
  isFilmmaker?: boolean;
  isPremiumSubscriber?: boolean;
  watchlist?: string[];
  watchedMovies?: string[];
  likedMovies?: string[];
  hasFestivalAllAccess?: boolean;
  unlockedBlockIds?: string[];
  purchasedMovieKeys?: string[];
  unlockedWatchPartyKeys?: string[]; // New: Track paid tickets
  rokuDeviceId?: string;
  actorProfileSlug?: string;
}

export interface MoviePipelineEntry {
  id: string;
  title: string;
  director: string;
  cast: string;
  posterUrl: string;
  movieUrl: string;
  submitterEmail: string;
  synopsis: string;
  submissionDate: any; // Firestore Timestamp
  status: 'pending' | 'approved' | 'rejected';
  musicRightsConfirmation: boolean; // New field for legal protection
}

export interface ActorSubmission {
    id: string;
    actorName: string;
    email: string;
    bio: string;
    photoUrl: string;
    highResPhotoUrl: string;
    imdbUrl?: string;
    submissionDate: any; // Firestore Timestamp
    status: 'pending' | 'approved' | 'rejected';
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
    timestamp: any; // Firestore Timestamp
    likes: string[];
}

export interface PayoutRequest {
  id: string;
  directorName: string;
  amount: number; // in cents
  payoutMethod: 'PayPal' | 'Venmo' | 'Other';
  payoutDetails: string;
  status: 'pending' | 'completed';
  requestDate: any; // Firestore Timestamp
  completionDate?: any; // Firestore Timestamp
}

export interface AdminPayout {
    id: string;
    amount: number; // in cents
    reason: string;
    payoutDate: any; // Firestore Timestamp
}

export interface BillSavingsTransaction {
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number; // in cents
    reason: string;
    transactionDate: any; // Firestore Timestamp
}

export interface SecurityEvent {
    id: string;
    type: string;
    ip: string | null;
    timestamp: any; // Firestore Timestamp
    details: Record<string, any>;
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
        audienceBreakdown: { total: number, actors: number, filmmakers: number };
        topCountries: { country: string, views: number }[];
        topEarningFilms: { title: string, totalRevenue: number }[];
    };
    aboutData?: AboutData;
    avgMoMUserGrowth: number;
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


export interface FilmmakerFilmPerformance {
    key: string;
    title: string;
    views: number;
    likes: number;
    watchlistAdds: number;
    grossDonations: number; // in cents
    grossAdRevenue: number; // in cents
    netDonationEarnings: number; // in cents
    netAdEarnings: number; // in cents
    totalEarnings: number; // in cents
}

export interface FilmmakerAnalytics {
    totalDonations: number; // NET total donation earnings for filmmaker, in cents
    totalAdRevenue: number; // NET total ad revenue earnings for filmmaker, in cents
    totalPaidOut: number; // in cents
    balance: number; // in cents
    films: FilmmakerFilmPerformance[];
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
    watchlistCounts: Record<string, number>;
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
    festivalPassSales: { units: number, revenue: number };
    festivalBlockSales: { units: number, revenue: number };
    salesByBlock: Record<string, { units: number, revenue: number }>;
    festivalUsers: string[]; // Emails of users who have festival access
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

export interface ChatMessage {
    id: string;
    userName: string;
    userAvatar: string;
    text: string;
    timestamp: any; // Firestore Timestamp
}

export interface WatchPartyState {
    isPlaying: boolean;
    currentTime: number;
    status: 'waiting' | 'live' | 'ended';
    lastUpdatedBy: string;
    lastUpdated?: any; // Firestore Timestamp
}
