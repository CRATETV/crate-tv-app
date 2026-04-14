
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
  festivalPassExpiry?: string;
  hasCrateFestPass?: boolean;
  crateFestPassExpiry?: string;
  hasJuryPass?: boolean;
  unlockedBlockIds: string[];
  unlockedBlocks?: Record<string, string>;
  purchasedMovieKeys: string[];
  rentals: Record<string, string>;
  unlockedWatchPartyKeys?: string[];
  playbackProgress?: Record<string, number>; // movieKey -> seconds
  rokuDeviceId?: string;
  ticketStubs?: TicketStub[];
}

export interface TicketStub {
  id: string;
  movieKey: string;
  movieTitle: string;
  date: string;
  posterUrl: string;
}

export interface UserRecord extends User {
    joinDate?: any;
    lastSignIn?: any;
}

export interface RokuHeroItem {
  movieKey: string;
  order: number;
  customTitle?: string;
  customSubtitle?: string;
}

export interface RokuConfig {
  _version: number;
  _lastUpdated: any;
  _updatedBy: string;
  
  hero: {
    mode: 'auto' | 'manual';
    items: RokuHeroItem[];
  };

  topTen: {
    enabled: boolean;
    mode: 'auto' | 'manual';
    title: string;
    movieKeys: string[];
    showNumbers: boolean;
  };

  nowStreaming: {
    enabled: boolean;
    title: string;
    mode: 'auto' | 'manual';
    movieKeys: string[];
    daysBack?: number;
  };
  
  categories: {
    mode: 'all' | 'custom';
    hidden: string[];
    order: string[];
    customTitles: Record<string, string>;
    separateSection: string[]; 
  };
  
  content: {
    hiddenMovies: string[];
    featuredMovies: string[];
  };
  
  features: {
    liveStreaming: boolean;
    watchParties: boolean;
    paidContent: boolean;
    festivalMode: boolean;
  };
}

export interface RokuAsset {
  movieKey: string;
  heroImage?: string;
  tvPoster?: string;
  rokuStreamUrl?: string; 
  lastUpdated: any;
}

export interface RokuMovie extends Movie {
  id: string; 
  description: string;
  hdPosterUrl: string; 
  heroImage: string;
  streamUrl: string; 
  streamFormat: 'mp4' | 'hls' | 'dash';
  year: string;
  runtime: string;
  isFree: boolean;
  live: boolean;
  rank?: number; 
  isUnlocked?: boolean;
  purchaseUrl?: string;
  isWatchPartyEnabled?: boolean;
  isFestival?: boolean;
  bufferingStrategy?: string;
  bufferSize?: number;
  minBandwidth?: number;
  maxBandwidth?: number;
  preferredCaptions?: string;
}

export interface RokuFeed {
  version: number;
  timestamp: string;
  announcement?: string;
  heroItems: RokuMovie[];
  categories: { 
    title: string; 
    type?: 'standard' | 'ranked' | 'live';
    categoryType?: string; // Identifier for row logic
    festivalIsLive?: boolean;
    showNumbers?: boolean;
    children: RokuMovie[];
  }[];
  publicSquare: { title: string; categoryType?: string; children: RokuMovie[] }[];
  liveNow: any[];
}

export interface Movie {
  key: string;
  title: string;
  synopsis: string;
  cast: Actor[];
  director: string;
  producers?: string;
  trailer: string;
  trailerStart?: number; // seconds into the trailer to start preview
  fullMovie: string;
  rokuStreamUrl?: string;
  poster: string;
  posterVariants?: string[];
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
  rokuHeroImage?: string;
  liveStreamUrl?: string;
  liveStreamStatus?: 'offline' | 'live' | 'scheduled';
  zineUrl?: string;
  genres?: string[];
  subtitleUrl?: string;
  // ── FESTIVAL / PWFF FIELDS ────────────────────────────────────────────────
  festivalDirectorNote?: string;   // note from the director about the film
  festivalFilmmakerBio?: string;   // short filmmaker bio
  festivalFilmmakerPhoto?: string; // headshot URL
  festivalQuote?: string;          // pull quote for the hype section
  festivalAwards?: string;         // e.g. "Best Short — SXSW 2024"
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

export interface Category {
  title: string;
  movieKeys: string[];
  type?: string;
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
  subheader?: string;
  description: string;
  startDate: string;
  endDate: string;
  payoutRecipientId?: string; 
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
  key?: string;
  title: string;
  director: string;
  cast?: string;
  synopsis: string;
  posterUrl?: string;
  poster?: string;
  movieUrl?: string;
  fullMovie?: string;
  submitterEmail?: string;
  email?: string;
  submissionDate?: any;
  submittedAt?: any;
  createdAt?: any;
  status?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'consideration' | 'catalog';
  source?: string;
  musicRightsConfirmation?: boolean;
  runtime?: string;
  year?: string;
  genre?: string;
  website?: string;
  instagram?: string;
  submitterName?: string;
  isReviewed?: boolean;
  isApproved?: boolean;
  reviewNotes?: string;
}

export interface WatchPartyState {
  status: 'waiting' | 'live' | 'ended';
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: any;
  lastUpdatedBy?: string;
  backstageKey?: string;
  isQALive?: boolean;
  qaEmbed?: string;
  isWebcamLive?: boolean;
  activeBlockId?: string;
  activeMovieIndex?: number;
  intermissionUntil?: number;       // unix ms — if set, show intermission screen until this time
  filmStartTime?: any;              // Firestore timestamp — when the current film in the block started
  actualStartTime?: any; 
  type: 'movie' | 'block';
  activePoll?: Poll;
  directorWelcome?: string;
  directorThankYou?: string;
  applauseCount?: number;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<number, number>;
  voters: string[]; // UIDs
  isOpen: boolean;
}

export interface ChatMessage {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: any;
  isVerifiedDirector?: boolean;
  isAdmin?: boolean;
  isSystemMessage?: boolean;
}

export interface SentimentPoint {
  type: string;
  timestamp: number;
  serverTimestamp: any;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'discount' | 'one_time_access';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  internalName?: string;
  itemId?: string;
  createdBy?: string;
  createdAt?: any;
  expiresAt?: string;
}

export interface CrateFestConfig {
  isActive: boolean;
  title: string;
  tagline: string;
  startDate: string;
  endDate: string;
  passPrice: number;
  movieBlocks: FilmBlock[];
  featuredWatchPartyKey?: string;
}

export interface AdConfig {
    [key: string]: any;
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
  content: string;
  sections?: ZineSection[];
  heroImage: string;
  author: string;
  type: 'NEWS' | 'INTERVIEW' | 'SPOTLIGHT' | 'DEEP_DIVE';
  publishedAt?: any;
  linkedMovieKey?: string;
  linkedBlockId?: string;
}

export interface FilmmakerPayout {
  movieTitle: string;
  totalDonations: number;
  totalAdRevenue: number;
  crateTvCut: number;
  filmmakerDonationPayout: number;
  filmmakerAdPayout: number;
  totalFilmmakerPayout: number;
}

export interface SiteSettings {
  isHolidayModeActive: boolean;
  holidayName?: string;
  holidayTagline?: string;
  holidayTheme?: 'christmas' | 'valentines' | 'gold' | 'generic';
  maintenanceMode?: boolean;
  businessEmail?: string;
  technicalEmail?: string;
  emailSignature?: string;
  pitchTargetCompany?: string;
  pitchDeckCustomMessage?: string;
  crateFestConfig?: CrateFestConfig;
  playbackSpeed?: number;
  pwffProgramVisible?: boolean;   // controls whether /pwff shows full programme or teaser
  pwffFestivalDate?: string;      // e.g. "August 2026" shown on teaser
  pwffFestivalName?: string;      // e.g. "Playhouse West Film Festival"
  pwffTeaserDescription?: string; // tagline/description shown on teaser — changes each year
  pwffTeaserTagline?: string;     // short one-liner under the title e.g. "Presented by Crate TV"
  pwffUrlYear?: string;           // e.g. "2026" — makes the URL cratetv.net/pwff2026
  suppressAllBanners?: boolean;   // kill switch — turns off every banner instantly
}

export interface PwffInterestEntry {
  email: string;
  name?: string;
  submittedAt: any;
  source: 'teaser' | 'programme';
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
  email?: string;
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

export interface PayoutRequest {
  id: string;
  directorName: string;
  amount: number;
  payoutMethod: string;
  payoutDetails: string;
  status: 'pending' | 'completed' | 'ACTIVE';
  requestDate: any;
  completionDate?: any;
}

export interface FilmmakerFilmPerformance {
  key: string;
  title: string;
  views: number;
  likes: number;
  watchlistAdds: number;
  rokuViews?: number;
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

export interface BillSavingsTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string;
  transactionDate: any;
}

export interface AdminPayout {
  id: string;
  amount: number;
  reason: string;
  payoutDate: any;
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
    topCountries: any[];
    topEarningFilms: any[];
    topReferrers?: Record<string, number>;
  };
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
  advertisingSuggestions?: string[];
}

export interface SecurityEvent {
  id: string;
  type: string;
  timestamp: any;
  ip?: string;
  ipAddress?: string;
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

export interface ScoutReport {
  potentialScore: number;
  marketFit: string;
  performanceDna: string[];
  acquisitionStrategy: string;
  comparables: string[];
}

export interface JuryVerdict {
  userId: string;
  userName: string;
  filmId: string;
  filmTitle: string;
  narrative: number;
  technique: number;
  impact: number;
  comment: string;
  timestamp: any;
}

export interface AuditEntry {
  id: string;
  role: string;
  action: string;
  type: 'PURGE' | 'MUTATION' | 'LOGIN' | 'SECURITY' | 'VIEW';
  details: string;
  timestamp: any;
  ip?: string;
  ipAddress?: string;
}

export interface AuditRecord {
  id: string;
  role: string;
  action: string;
  type: 'PURGE' | 'MUTATION' | 'LOGIN' | 'SECURITY' | 'VIEW';
  details: string;
  timestamp: any;
  ip?: string;
  ipAddress?: string;
}

export interface Recommendation {
  movieKey: string;
  reasoning: string;
}

export interface GrantApplication {
  id: string;
  organization: string;
  status: 'pending' | 'awarded' | 'rejected';
  amount: number;
  dateApplied: any;
  notes?: string;
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

export interface AnalyticsData {
  totalRevenue: number;
  totalCrateTvRevenue: number;
  totalAdminPayouts: number;
  pastAdminPayouts: AdminPayout[];
  totalUsers: number;
  viewCounts: Record<string, number>;
  movieLikes: Record<string, number>;
  watchlistCounts: Record<string, number>;
  filmmakerPayouts: FilmmakerPayout[];
  totalDonations: number;
  totalSales: number;
  totalMerchRevenue: number;
  totalAdRevenue: number;
  totalFestivalRevenue: number; 
  totalCrateFestRevenue: number;
  festivalPassSales: { units: number; revenue: number };
  festivalBlockSales: { units: number; revenue: number };
  crateFestPassSales: { units: number; revenue: number };
  crateFestBlockSales: { units: number; revenue: number };
  salesByBlock: Record<string, { units: number; revenue: number }>;
  liveNodes: number;
  recentSpikes: { movieKey: string; title: string; count: number }[];
  billSavingsPotTotal: number;
  billSavingsTransactions: BillSavingsTransaction[];
  allUsers: { email: string }[];
  actorUsers: { email: string }[];
  filmmakerUsers: { email: string }[];
  merchSales: Record<string, number>;
  crateTvMerchCut: number;
  festivalUsers: string[];
  crateFestRevenue: number;
  viewLocations: Record<string, Record<string, number>>;
  topReferrers?: Record<string, number>;
  rokuEngagement?: {
    totalDevices: number;
    totalRokuViews: number;
    viewsByMovie: Record<string, number>;
  };
}
