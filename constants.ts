
import { Category, Movie, FestivalDay, FestivalConfig, AboutData, PromoCode } from './types';

// Utility function to robustly check if a movie is past its release time.
export const isMovieReleased = (movie: Movie | undefined | null): boolean => {
    if (!movie || !movie.releaseDateTime) {
        return true; // No release date means it's always available
    }
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
    "type": "featured",
    "movieKeys": ["meridian", "fighter", "gemini", "autumn"]
  },
  "publicAccess": {
    "title": "The Square",
    "type": "publicDomainIndie",
    "movieKeys": ["trip_to_moon", "the_cook", "time_service"]
  },
  "publicDomainIndie": {
    "title": "Vintage Visions",
    "type": "publicDomainIndie",
    "movieKeys": [
      "a_fool_and_his_money",
      "brideless_groom",
      "meshes_of_the_afternoon",
      "un_chien_andalou",
      "house_of_usher",
      "chaplin_immigrant",
      "chaplin_pawnshop",
      "suspense"
    ]
  }
};

export const moviesData: Record<string, Movie> = {
  "fighter": {
    "key": "fighter",
    "title": "Fighter",
    "synopsis": "Minutes before a career-defining match, a teenage boxer with Down's syndrome must fight his family and a skeptical committee for his right to enter the ring.",
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
    "publishedAt": "2025-01-10T12:00:00Z",
    "isUnlisted": false
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
    "publishedAt": "2025-02-15T10:00:00Z",
    "isUnlisted": false
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
    "publishedAt": "2025-01-05T09:00:00Z",
    "isUnlisted": false
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
    "publishedAt": "2025-03-01T15:00:00Z",
    "isUnlisted": false
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
    "publishedAt": "2025-04-12T18:00:00Z",
    "isUnlisted": false
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
    "publishedAt": "2025-02-20T11:00:00Z",
    "isUnlisted": false
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
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/TripToTheMoon_1902.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "likes": 2100,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false,
    "posterVariants": [
       "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
       "https://cratetelevision.s3.us-east-1.amazonaws.com/Meridian_Poster.webp"
    ]
  },
  "a_fool_and_his_money": {
    "key": "a_fool_and_his_money",
    "title": "A Fool and His Money",
    "synopsis": "A 1912 silent comedy featuring one of the earliest all-African American casts in cinema. A groundbreaking work of early film history.",
    "cast": [
      {
        "name": "James Russell",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Early silent film actor.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Alice Guy-Blaché",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/AFoolAndHisMoney.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/AFoolAndHisMoney_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/AFoolAndHisMoney_Poster.webp",
    "likes": 150,
    "durationInMinutes": 14,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "brideless_groom": {
    "key": "brideless_groom",
    "title": "Brideless Groom",
    "synopsis": "A 1947 Three Stooges comedy short. Shemp must get married within hours to inherit a fortune, leading to slapstick chaos.",
    "cast": [
      {
        "name": "Shemp Howard",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "One of the Three Stooges.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Edward Bernds",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/BridelessGroom.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/BridelessGroom_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/BridelessGroom_Poster.webp",
    "likes": 420,
    "durationInMinutes": 17,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "meshes_of_the_afternoon": {
    "key": "meshes_of_the_afternoon",
    "title": "Meshes of the Afternoon",
    "synopsis": "A 1943 experimental short film and a landmark of American avant-garde cinema. A woman's mysterious journey through dreamlike repetition.",
    "cast": [
      {
        "name": "Maya Deren",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Pioneer of experimental cinema.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Maya Deren & Alexander Hammid",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/MeshesOfTheAfternoon.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/MeshesOfTheAfternoon_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/MeshesOfTheAfternoon_Poster.webp",
    "likes": 680,
    "durationInMinutes": 14,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "un_chien_andalou": {
    "key": "un_chien_andalou",
    "title": "Un Chien Andalou",
    "synopsis": "Luis Buñuel and Salvador Dalí's 1929 surrealist masterpiece. A shocking, dreamlike assault on conventional narrative.",
    "cast": [
      {
        "name": "Simone Mareuil",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "French silent film actress.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Luis Buñuel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/UnChienAndalou.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/UnChienAndalou_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/UnChienAndalou_Poster.webp",
    "likes": 890,
    "durationInMinutes": 16,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "house_of_usher": {
    "key": "house_of_usher",
    "title": "The Fall of the House of Usher",
    "synopsis": "A 1928 French silent horror film based on Edgar Allan Poe's classic tale. A Gothic masterpiece of atmosphere and dread.",
    "cast": [
      {
        "name": "Marguerite Gance",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "French silent film actress.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Jean Epstein",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/HouseOfUsher.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/HouseOfUsher_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/HouseOfUsher_Poster.webp",
    "likes": 520,
    "durationInMinutes": 63,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "chaplin_immigrant": {
    "key": "chaplin_immigrant",
    "title": "The Immigrant",
    "synopsis": "Charlie Chaplin's 1917 comedy about the journey to America. The Little Tramp encounters romance and hardship on a ship full of immigrants.",
    "cast": [
      {
        "name": "Charlie Chaplin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "The Little Tramp himself.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ChaplinImmigrant.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ChaplinImmigrant_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ChaplinImmigrant_Poster.webp",
    "likes": 1100,
    "durationInMinutes": 24,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "chaplin_pawnshop": {
    "key": "chaplin_pawnshop",
    "title": "The Pawnshop",
    "synopsis": "Charlie Chaplin's 1916 comedy set in a pawnshop. The Little Tramp creates chaos while trying to work as an assistant.",
    "cast": [
      {
        "name": "Charlie Chaplin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "The Little Tramp himself.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ChaplinPawnshop.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ChaplinPawnshop_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ChaplinPawnshop_Poster.webp",
    "likes": 950,
    "durationInMinutes": 26,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
  },
  "suspense": {
    "key": "suspense",
    "title": "Suspense",
    "synopsis": "A 1913 silent thriller considered one of the earliest suspense films. A woman and child are threatened by a tramp while the husband races home.",
    "cast": [
      {
        "name": "Lois Weber",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Pioneer female director and actress.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Lois Weber & Phillips Smalley",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense_Poster.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense_Poster.webp",
    "likes": 340,
    "durationInMinutes": 10,
    "publishedAt": "2025-01-01T00:00:00Z",
    "isUnlisted": false
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

export const festivalData: FestivalDay[] = [];
