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
  hasCopyrightMusic?: boolean;
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
    imdbUrl?: string;
    submissionDate: { seconds: number; nanoseconds: number; };
    status: 'pending' | 'approved' | 'rejected';
}

export interface MoviePipelineEntry {
    id: string;
    title: string;
    posterUrl: string;
    movieUrl: string;
    cast: string;
    director: string;
    submittedAt?: any; // Using `any` as it can be a server timestamp
    status?: 'pending' | 'created';
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

export interface User {
    uid: string;
    email: string;
    name: string;
    isActor: boolean;
    isFilmmaker: boolean;
    avatar: string;
    isPremiumSubscriber?: boolean;
    watchlist?: string[];
}

export interface PayoutRequest {
  id: string;
  directorName: string;
  amount: number; // in cents
  payoutMethod: 'PayPal' | 'Venmo' | 'Other';
  payoutDetails: string;
  status: 'pending' | 'completed';
  requestDate: { seconds: number; nanoseconds: number; };
  completionDate?: { seconds: number; nanoseconds: number; };
}

export interface AdminPayout {
    id: string;
    amount: number; // in cents
    reason: string;
    payoutDate: { seconds: number; nanoseconds: number; };
}

export interface BillSavingsTransaction {
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number; // in cents
    reason: string;
    transactionDate: { seconds: number; nanoseconds: number; };
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

    filmmakerPayouts: FilmmakerPayout[];
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
    imdbUrl?: string;
}