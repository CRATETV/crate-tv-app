
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
    "title": "Spotlight Selection",
    "movieKeys": ["meridian", "fighter", "gemini", "autumn"],
    "type": "featured"
  },
  "publicAccess": {
    "title": "Community Records",
    "movieKeys": ["time_service"],
    "type": "publicDomainIndie"
  },
  "publicDomainIndie": {
    "title": "Vintage Visions",
    "movieKeys": ["trip_to_moon", "the_cook", "a_fool_and_his_money", "suspense"]
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
    "likes": 1240,
    "publishedAt": "2025-01-10T12:00:00Z"
  },
  "meridian": {
    "key": "meridian",
    "title": "Meridian",
    "synopsis": "A group of technical specialists investigate a series of mysterious disappearances in a high-contrast cinematic environment. This film serves as a master-class in technical lighting and high-bitrate composition.",
    "cast": [
      {
        "name": "S. Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Leading figure in experimental technical performance.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Netflix Open Source",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/Meridian_Trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Meridian_Full_4K.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Meridian_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Meridian_Poster.webp",
    "likes": 850,
    "durationInMinutes": 12,
    "publishedAt": "2025-02-15T10:00:00Z"
  },
  "the_cook": {
    "key": "the_cook",
    "title": "The Cook",
    "synopsis": "A chaotic kitchen becomes the stage for comedic genius in this 1918 classic. Fatty Arbuckle and Buster Keaton demonstrate the absolute origins of physical cinema.",
    "cast": [
      {
        "name": "Buster Keaton",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "The Great Stone Face.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Roscoe Arbuckle",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/The_Cook_Restored.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/TheCook_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/TheCook_Poster.webp",
    "likes": 420,
    "publishedAt": "2025-01-05T09:00:00Z"
  },
  "autumn": {
    "key": "autumn",
    "title": "Autumn",
    "synopsis": "A moody, atmospheric exploration of isolation and the changing of seasons. Shot entirely on 16mm, this indie short focuses on the kinetic beauty of decay.",
    "cast": [],
    "director": "Independent Visionary",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn_Short.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn_Art.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn_Art.webp",
    "likes": 310,
    "publishedAt": "2025-03-01T15:00:00Z"
  },
  "gemini": {
    "key": "gemini",
    "title": "Gemini",
    "synopsis": "Dual natures collide in this sci-fi thriller about identity and the blurred lines between artificial and human intelligence. A tense, dialogue-driven performance piece.",
    "cast": [
      {
        "name": "Marcus Kane",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Specialist in psychological tension.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "The Collective",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemini_Short.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemini_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemini_Poster.webp",
    "likes": 560,
    "publishedAt": "2025-04-12T18:00:00Z"
  },
  "time_service": {
    "key": "time_service",
    "title": "Time Service",
    "synopsis": "A mesmerizing technical record of how time was measured and broadcast in the mid-century. A preservation of both history and the mechanical pulse of the era.",
    "cast": [],
    "director": "U.S. Naval Observatory (Archive)",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/TimeService_Archive.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/TimeService_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/TimeService_Poster.webp",
    "likes": 280,
    "publishedAt": "2025-02-20T11:00:00Z"
  },
  "trip_to_moon": {
    "key": "trip_to_moon",
    "title": "A Trip to the Moon",
    "synopsis": "The 1902 sci-fi masterpiece by Georges Méliès. Witness the first iconic image of space travel and the birth of special effects in cinema history.",
    "cast": [
      {
        "name": "Georges Méliès",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "The father of cinematic magic.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Georges Méliès",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "likes": 2100,
    "publishedAt": "2025-01-01T00:00:00Z"
  },
  "a_fool_and_his_money": {
    "key": "a_fool_and_his_money",
    "title": "A Fool and His Money",
    "synopsis": "The 1912 silent comedy by Alice Guy-Blaché, the first female director in cinema history. A milestone of early African American cinema.",
    "cast": [],
    "director": "Alice Guy-Blaché",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/A_Fool_and_His_Money_1912.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+fool+and+his+money+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+fool+and+his+money+.webp",
    "likes": 980,
    "publishedAt": "2025-01-01T00:00:00Z"
  },
  "suspense": {
    "key": "suspense",
    "title": "Suspense",
    "synopsis": "Lois Weber's 1913 innovative thriller. Features early examples of split-screen techniques and a tense home-invasion narrative that influenced the genre for decades.",
    "cast": [],
    "director": "Lois Weber",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense_1913.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+.webp",
    "likes": 750,
    "publishedAt": "2025-01-01T00:00:00Z"
  }
};

export const aboutData: AboutData = {
  missionStatement: "At Crate TV, we believe no great story should have an expiration date. Our mission is to liberate independent film from the festival circuit, creating a raw, authentic connection between the world's most daring creators and the viewers who seek them.",
  story: "Crate was born from the independent spirit of Philadelphia, providing a permanent distribution afterlife for films that deserve more than a weekend screening.",
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
