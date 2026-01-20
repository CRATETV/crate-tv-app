
import { Category, Movie, FestivalDay, FestivalConfig, AboutData, PromoCode } from './types';

// Utility function to robustly check if a movie is past its release time.
export const isMovieReleased = (movie: Movie | undefined | null): boolean => {
    if (!movie || !movie.releaseDateTime) {
        return true; // No release date means it's always available
    }
    // Compare the release time with the current time
    return new Date(movie.releaseDateTime) <= new Date();
};

export const promoCodesData: Record<string, Partial<PromoCode>> = {
  "PULSE_25": {
    "code": "PULSE_25",
    "type": "discount",
    "discountValue": 25,
    "maxUses": 500,
    "usedCount": 0,
    "internalName": "Weekly Riddle Reward"
  }
};

export const categoriesData: Record<string, Category> = {
  "featured": {
    "title": "Featured Films",
    "movieKeys": ["fighter"]
  }
};

export const moviesData: Record<string, Movie> = {
  "fighter": {
    "key": "fighter",
    "title": "Fighter",
    "synopsis": "Minutes before a career-defining match, a teenage boxer with Down’s syndrome must fight his family and a skeptical committee for his right to enter the ring.",
    "cast": [
      {
        "name": "Tommy Jessop",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Tommy is a legendary actor—the first with Down syndrome to play Hamlet on stage.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Bugsy Steel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Fighter+Short+Film.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Fighter+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Fighter+.webp",
    "likes": 0,
    "publishedAt": new Date().toISOString()
  }
};

export const aboutData: AboutData = {
  missionStatement: "Championing the bold and the unique in independent cinema.",
  story: "Crate TV was born out of a desire to provide a permanent home for films that often disappear after their festival run.",
  belief1Title: "Art First",
  belief1Body: "We believe in curation over algorithms.",
  belief2Title: "Direct Support",
  belief2Body: "Our 70/30 model ensures filmmakers are directly supported by their audience.",
  belief3Title: "Global Access",
  belief3Body: "Bringing independent cinema to every screen, from mobile to Roku.",
  founderName: "Salome Denoon",
  founderTitle: "Founder & Architect",
  founderBio: "A filmmaker and developer dedicated to the future of distribution.",
  founderPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
};

export const festivalConfigData: FestivalConfig = {
  isFestivalLive: false,
  title: "Crate Film Festival",
  subheader: "12th Annual Official Selections",
  description: "A three-day digital experience celebrating cinematic innovation.",
  startDate: "2026-10-01T00:00:00Z",
  endDate: "2026-10-03T23:59:59Z"
};

// Start with an empty array so Admin can add the 3 specific days manually without doubles
export const festivalData: FestivalDay[] = [];
