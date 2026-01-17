
export interface User {
  uid: string;
  email: string;
  name: string;
  isActor?: boolean;
  isFilmmaker?: boolean;
  isIndustryPro?: boolean;
  avatar?: string;
  isPremiumSubscriber?: boolean;
  watchlist: string[];
  watchedMovies: string[];
  likedMovies: string[];
  hasFestivalAllAccess?: boolean;
  hasCrateFestPass?: boolean;
  hasJuryPass?: boolean;
  unlockedBlockIds: string[];
  purchasedMovieKeys: string[];
  rentals: Record<string, string>;
  unlockedWatchPartyKeys?: string[];
  rokuDeviceId?: string;
}

export interface UserRecord extends User {
    joinDate?: any;
    lastSignIn?: any;
}

export interface AuditEntry {
    id: string;
    role: string;
    action: string;
    type: 'LOGIN' | 'MUTATION' | 'PURGE' | 'SECURITY';
    details: string;
    timestamp: any;
    ip?: string;
}

export interface ZineSection {
    id: string;
    type: 'text' | 'header' | 'quote' | 'image' | 'video';
    content: string;
}

export interface EditorialStory {
    id: string;
    title: string;
    subtitle: string;
    content: string; // Fallback for legacy stories
    sections?: ZineSection[];
    heroImage: string;
    author: string;
    linkedMovieKey?: string;
    linkedBlockId?: string;
    type: 'NEWS' | 'INTERVIEW' | 'DEEP_DIVE' | 'SPOTLIGHT' | 'FESTIVAL_HYPE' | 'TRIES';
    publishedAt: any;
}

export interface JuryVerdict {
    userId: string;
    userName: string;
    narrative: number;
    technique: number;
    impact: number;
    comment: string;
    timestamp: any;
}

export interface GrantApplication {
    id: string;
    organization: string;
    amount: number;
    status: 'pending' | 'submitted' | 'awarded' | 'declined';
    dateApplied: any;
    notes: string;
}

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
  likes: number;
  rating?: number;
  publishedAt?: string;
  releaseDateTime?: string;
  mainPageExpiry?: string;
  autoReleaseDate?: string;
  isUnlisted?: boolean;
  isSeries?: boolean;
  isEpisode?: boolean;
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
  customLaurelUrl?: string;
  awardName?: string;
  awardYear?: string;
  isCratemas?: boolean;
  isLiveStream?: boolean;
  liveStreamEmbed?: string;
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
  price?: number; 
  watchPartyStartTime?: string;
  isWatchPartyEnabled?: boolean;
}

export interface FestivalDay {
  day: number;
  date: string;
  blocks: FilmBlock[];
}

export interface FestivalConfig {
  isFestivalLive: boolean;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  payoutRecipientId?: string; // Square Customer ID for partner payouts
  payoutCardId?: string;
  payoutLastLinked?: any;
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

export interface MoviePipelineEntry {
  id: string;
  title: string;
  director: string;
  cast: string;
  synopsis: string;
  posterUrl: string;
  movieUrl: string;
  submitterEmail: string;
  submissionDate: any;
  status: 'pending' | 'approved' | 'rejected';
  source?: string;
  musicRightsConfirmation?: boolean;
}

export interface WatchPartyState {
  status: 'waiting' | 'live' | 'ended';
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: any;
  lastUpdatedBy?: string;
  backstageKey?: string;
  isQALive?: boolean;
  activeBlockId?: string;
  activeMovieIndex?: number;
  actualStartTime?: any; // Precise server timestamp when the session hit 0:00
  type: 'movie' | 'block';
}

export interface ChatMessage {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: any;
}

export interface SentimentPoint {
  type: string;
  timestamp: number;
  serverTimestamp: any;
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

export interface PayoutRequest {
    id: string;
    directorName: string;
    amount: number;
    payoutMethod: string;
    payoutDetails: string;
    status: 'pending' | 'completed';
    requestDate: any;
    completionDate?: any;
}

export interface AdminPayout {
  id: string;
  amount: number;
  reason: string;
  payoutDate: any;
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
  merchSales: Record<string, number>;
  totalFestivalRevenue: number; 
  totalCrateFestRevenue: number;
  festivalPassSales: { units: number; revenue: number };
  festivalBlockSales: { units: number; revenue: number };
  crateFestPassSales: { units: number; revenue: number };
  salesByBlock: Record<string, { units: number; revenue: number }>;
  festivalUsers: string[];
  crateFestRevenue: number;
  liveNodes: number;
  recentSpikes: { movieKey: string; title: string; count: number }[];
}

export interface BillSavingsTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string;
  transactionDate: any;
}

export interface MonthlyDataPoint {
  month: string;
  value: number;
}

export interface GrowthAnalyticsData {
  historical: { users: MonthlyDataPoint[]; revenue: MonthlyDataPoint[] };
  projections: { users: MonthlyDataPoint[]; revenue: MonthlyDataPoint[] };
  keyMetrics: any;
  aboutData?: AboutData;
  avgMoMUserGrowth: number;
  fundingProfile: {
    round: string;
    date: string;
    valuation: string;
    awsPercentage: string;
    marketingBudget: string;
  };
}

export interface AiGrowthAdvice {
  userGrowth: string[];
  revenueGrowth: string[];
  communityEngagement: string[];
}

export interface SecurityEvent {
  id: string;
  type: string;
  timestamp: any;
  ip?: string;
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
  rejectionReason?: string;
}

export interface ActorProfile {
  name: string;
  slug: string;
  bio: string;
  photo: string;
  highResPhoto: string;
  imdbUrl?: string;
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

export interface PromoCode {
  id: string;
  code: string;
  internalName?: string;
  type: 'one_time_access' | 'discount';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  itemId?: string;
  createdBy: string;
  createdAt: any;
  expiresAt?: any;
}

export interface StudioMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
  timestamp: any;
  type: 'CONTACT' | 'INQUIRY' | 'SUBMISSION' | 'GENERAL';
  status: string;
}

export interface AdConfig {
}

export interface CrateFestConfig {
  isActive: boolean;
  title: string;
  tagline: string;
  startDate: string;
  endDate: string;
  passPrice: number;
  featuredWatchPartyKey?: string;
  movieBlocks: { id: string; title: string; movieKeys: string[] }[];
}

export interface SiteSettings {
  isHolidayModeActive?: boolean;
  holidayName?: string;
  holidayTagline?: string;
  holidayTheme?: 'christmas' | 'valentines' | 'gold' | 'generic';
  maintenanceMode?: boolean;
  pitchTargetCompany?: string;
  pitchDeckCustomMessage?: string;
  crateFestConfig?: CrateFestConfig;
  businessEmail?: string;
  technicalEmail?: string;
  emailSignature?: string;
}

export interface ScoutReport {
  potentialScore: number;
  marketFit: string;
  performanceDna: string[];
  acquisitionStrategy: string;
  comparables: string[];
}
