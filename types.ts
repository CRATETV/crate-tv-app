// This file contains type definitions for the Crate TV application.

export interface Actor {
  name: string;
  photo: string;
  bio: string;
  highResPhoto: string;
  isAvailableForCasting?: boolean;
}

export interface Episode {
  id: string;
  title: string;
  synopsis: string;
  url: string;
  duration?: number;
  thumbnail?: string;
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
  publishedAt?: string; 
  autoReleaseDate?: string; // New: Date when the paywall automatically drops
  isUnlisted?: boolean; 
  isSeries?: boolean;
  episodes?: Episode[];
  durationInMinutes?: number;
  hasCopyrightMusic?: boolean;
  isSupportEnabled?: boolean;
  isWatchPartyEnabled?: boolean;
  watchPartyStartTime?: string;
  isWatchPartyPaid?: boolean;
  watchPartyPrice?: number;
  isForSale?: boolean;
  salePrice?: number;
  mainPageExpiry?: string;
  isCratemas?: boolean;
  awardName?: string;
  awardYear?: string;
  customLaurelUrl?: string;
}

export interface SentimentPoint {
    timestamp: number; // in seconds
    type: '🔥' | '😲' | '❤️' | '👏' | '😢';
}

export interface User {
  uid: string;
  email: string | null;
  name?: string;
  avatar?: string;
  isActor?: boolean;
  isFilmmaker?: boolean;
  isIndustryPro?: boolean; 
  isPremiumSubscriber?: boolean;
  watchlist?: string[];
  watchedMovies?: string[];
  likedMovies?: string[];
  hasFestivalAllAccess?: boolean;
  hasCrateFestPass?: boolean; 
  unlockedBlockIds?: string[];
  purchasedMovieKeys?: string[]; 
  rentals?: Record<string, string>; 
  unlockedWatchPartyKeys?: string[];
  rokuDeviceId?: string;
  actorProfileSlug?: string;
}

export interface CrateFestConfig {
  isActive: boolean;
  title: string;
  tagline: string;
  startDate: string;
  endDate: string;
  passPrice: number;
  featuredWatchPartyKey?: string;
  movieBlocks: {
    title: string;
    movieKeys: string[];
  }[];
}

export interface FilmmakerFilmPerformance {
    key: string;
    title: string;
    views: number;
    likes: number;
    watchlistAdds: number;
    grossDonations: number;
    grossAdRevenue: number;
    netDonationEarnings: number;
    netAdEarnings: number;
    totalEarnings: number;
    sentimentData?: SentimentPoint[];
}

export interface FilmmakerAnalytics {
    totalDonations: number;
    totalAdRevenue: number;
    totalPaidOut: number;
    balance: number;
    films: FilmmakerFilmPerformance[];
}

export interface Category {
  title: string;
  movieKeys: string[];
}

export interface SiteSettings {
  isHolidayModeActive?: boolean;
  holidayName?: string;
  holidayTagline?: string;
  holidayTheme?: 'christmas' | 'valentines' | 'gold' | 'generic';
  maintenanceMode?: boolean;
  pitchTargetCompany?: string;
  crateFestConfig?: CrateFestConfig;
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
    filmmakerUsers: { email: string }[] ;
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
    festivalUsers: string[];
    crateFestRevenue: number; 
}

export interface AdminPayout {
    id: string;
    amount: number;
    reason: string;
    payoutDate: any;
}

export interface BillSavingsTransaction {
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    reason: string;
    transactionDate: any;
}

export interface PayoutRequest {
  id: string;
  directorName: string;
  amount: number;
  payoutMethod: 'PayPal' | 'Venmo' | 'Other';
  payoutDetails: string;
  status: 'pending' | 'completed';
  requestDate: any;
  completionDate?: any;
}

export interface ChatMessage {
    id: string;
    userName: string;
    userAvatar: string;
    text: string;
    timestamp: any;
}

export interface WatchPartyState {
    isPlaying: boolean;
    currentTime: number;
    status: 'waiting' | 'live' | 'ended';
    lastUpdatedBy: string;
    lastUpdated?: any;
}

export interface MoviePipelineEntry {
  id: string;
  title: string;
  director: string;
  cast: string;
  posterUrl: string;
  movieUrl: string;
  submitterEmail: string;
  submitterName?: string;
  synopsis: string;
  submissionDate: any;
  status: 'pending' | 'approved' | 'rejected';
  musicRightsConfirmation: boolean;
}

export interface ActorSubmission {
    id: string;
    actorName: string;
    email: string;
    bio: string;
    photoUrl: string;
    highResPhotoUrl: string;
    imdbUrl?: string;
    submissionDate: any;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ActorProfile {
    name: string;
    slug: string;
    bio: string;
    photo: string;
    highResPhoto: string;
    imdbUrl: string;
    email: string; 
    isAvailableForCasting?: boolean;
    isContactable?: boolean; 
}

export interface ActorPost {
    id: string;
    actorName: string;
    actorPhoto: string;
    content: string;
    imageUrl?: string;
    timestamp: any;
    likes: string[];
}

export interface FestivalConfig {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isFestivalLive?: boolean;
}

export interface FestivalDay {
  day: number;
  date: string;
  blocks: FilmBlock[];
}

export interface FilmBlock {
  id: string;
  title: string;
  time: string;
  movieKeys: string[];
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

export interface FilmmakerPayout {
    movieTitle: string;
    totalDonations: number;
    crateTvCut: number;
    filmmakerDonationPayout: number;
    totalAdRevenue: number;
    filmmakerAdPayout: number;
    totalFilmmakerPayout: number;
}

export interface AdConfig {
}

export interface MonthlyDataPoint {
  month: string;
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
    audienceBreakdown: { total: number; actors: number; filmmakers: number };
    topCountries: { country: string; views: number }[];
    topEarningFilms: { title: string; totalRevenue: number; adRevenue: number; donationRevenue: number }[];
  };
  aboutData?: AboutData;
  avgMoMUserGrowth: number;
}

export interface AiGrowthAdvice {
  userGrowth: string[];
  revenueGrowth: string[];
  communityEngagement: string[];
  advertisingSuggestions?: string[];
}

export interface SecurityEvent {
  id: string;
  type: string;
  ip?: string;
  timestamp: any;
  details?: any;
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

/**
 * Global interface augmentation for window.aistudio
 */
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}