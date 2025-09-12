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
}

export interface Category {
  title: string;
  movieKeys: string[];
}

export interface FilmBlock {
  id: string;
  title: string;
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
}

// FIX: Added the User interface to be used by the AuthContext.
export interface User {
    email: string;
    isPremiumSubscriber: boolean;
}

export interface Transaction {
    id: string;
    date: string;
    item: string;
    amount: number;
}

export interface SalesData {
    totalRevenue: number;
    fullPassesSold: number;
    filmBlocksSold: number;
    individualFilmsSold: number;
    transactions: Transaction[];
}
