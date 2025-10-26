import { Category, Movie, FestivalDay, FestivalConfig, AboutData } from './types';

// Utility function to robustly check if a movie is past its release time.
export const isMovieReleased = (movie: Movie | undefined | null): boolean => {
    if (!movie || !movie.releaseDateTime) {
        return true; // No release date means it's always available
    }
    // Compare the release time with the current time
    return new Date(movie.releaseDateTime) <= new Date();
};

export const categoriesData: Record<string, Category> = {
  featured: {
    title: 'Featured Films',
    movieKeys: ['consumed', 'newmovie1756741314485', 'lifeless', 'foodiecalldirectorscut', 'juniper']
  },
  newReleases: {
    title: 'New Releases',
    movieKeys: [
        'thatloud',
        'results',
        'consumed',
        'newmovie1756741314485', // What If
        'newmovie1756501125076', // of Bees and Boobs
        'newmovie1756487626529', // Strange Encounters
        'newmovie1756487390550', // I Still Love Her
        'newmovie1756487215116', // Fling
        'newmovie1756486933392', // Power Trip
        'newmovie1756485973547', // Burst
    ]
  },
  awardWinners: {
    title: 'Award-Winning Films',
    movieKeys: ['lifeless', 'foodiecalldirectorscut', 'iloveyoublack', 'hair', 'juniper']
  },
  pwff12thAnnual: {
    title: 'PWFF-12th Annual Selections',
    movieKeys: [
      'newmovie1756487626529', // Strange Encounters
      'newmovie1756501125076', // of Bees and Boobs
      'newmovie1756487215116', // Fling
      'newmovie1756487390550', // I Still Love Her
      'newmovie1756485973547',  // Burst
      'newmovie1756486933392' // Power Trip
    ]
  },
  comedy: {
    title: 'Comedies',
    movieKeys: [
      'thatloud',
      'foodiecalldirectorscut',
      'foodiecalltheatricalcut',
      'eharmonycs',
      'youvsthem',
      'wrapitup',
      'newmovie1756485973547',
      'newmovie1756487390550',
      'newmovie1756501125076',
      'newmovie1756741314485',
      'twopeasinapod'
    ]
  },
  drama: {
    title: 'Dramas',
    movieKeys: [
      'results',
      'lifeless',
      'almasvows',
      'finallycaught',
      'iloveyoublack',
      'hair',
      'autumn',
      'silentlove',
      'juniper',
      'drive',
      'crossroads',
      'fatherdaughterdance',
      'newmovie1756486933392',
      'newmovie1756487626529',
      'newmovie1756487215116',
      'theneighbours',
      'tedandnatalie',
      'slap',
      'unhinged',
      'itsinyou'
    ]
  },
  documentary: {
    title: 'Documentaries',
    movieKeys: ['streeteatstheboot']
  },
  exploreTitles: {
    title: 'Explore These Titles',
    movieKeys: ['smirk', 'intrusivethoughts']
  },
  publicDomainIndie: {
    title: 'Public Domain Classics',
    movieKeys: [
      'atriptothemoon',
      'suspense',
      'thepawnshop',
      'theimmigrant',
      'thefallofthehouseofusher',
      'unchienandalou',
      'meshesofafternoon',
      'bridelessgroom',
    ]
  }
};

export const moviesData: Record<string, Movie> = {
  "unhinged": {
    "key": "unhinged",
    "title": "The Unhinged",
    "synopsis": "Information regarding this film is currently unavailable. A film by Robert Graves & Philaye Films.",
    "cast": [
      {
        "name": "Information currently unavailable.",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Robert Graves",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+Unhinged-+A+film+by+Robert+Graves+%26+Philaye+Films.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+unhinged+Movie+poster+.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+unhinged+Movie+poster+.JPG",
    "likes": 0,
    durationInMinutes: 9,
  },
  "consumed": {
    "key": "consumed",
    "title": "Consumed",
    "synopsis": "She gave everything to make her love complete, but a woman learns that her monumental act of self-sacrifice wasn't a noble gesture; it was the final permission her toxic relationship needed to devour her soul.<br/><br/>Coming October 31st.",
    "cast": [
      {
        "name": "Lucie Paige Krovatin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Allison Ferguson",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Richard Frohman, Akil Logan-Haye",
    "trailer": "",
    "fullMovie": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG",
    "likes": 0,
    "releaseDateTime": "2024-10-31T23:00:00Z",
    durationInMinutes: 11,
  },
  "thatloud": {
    "key": "thatloud",
    "title": "That Loud",
    "synopsis":" A stoner comedy. This short film was created for the Playhouse West-Philadelphia 3-3-3 Film Festival.",
    "cast": [
      {
        "name": "Aatiq Simmons",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Richard Frohman",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Lucie Paige Krovatin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Oskar Pierre Castro",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/That+Loud+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/That%20Loud.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/That%20Loud.png",
    "likes": 0
  },
  "lifeless": {
    "key": "lifeless",
    "title": "Lifeless",
    "synopsis": "When Valerie uncovers a devastating truth, she is forced to confront her fears as she prepares to deliver a chilling report to her unsuspecting fiancé.<br/><br/>Trivia: Lifeless opened the 2023 Playhouse West-Philadelphia Film Festival.",
    "cast": [
      {
        "name": "Darrah Lashley",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png",
        "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      },
      {
        "name": "Ajinkya Dhage",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ+Photo.png",
        "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj+bio+photo.png"
      },
      {
        "name": "Kathryn Wylde",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png",
        "bio": "Kathryn Wylde is an emerging actor with a passion for storytelling, demonstrating their skills both on screen and behind the camera.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png"
      }
    ],
    "director": "Darrah Lashley",
    "trailer": "https://cratetelevision.s3.amazonaws.com/LifelessTrailer.mp4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/LIFELESS.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/Lifeless+poster+remake+.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Lifeless.png",
    "likes": 0,
    durationInMinutes: 22,
  },
  "almasvows": {
    "key": "almasvows",
    "title": "Alma's Vows",
    "synopsis": "Alma struggles to move on after the death of her fiancé.",
    "cast": [
      {
        "name": "Alana Hill",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png",
        "bio": "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png"
      },
      {
        "name": "David Auspitz",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+A.png",
        "bio": "David Auspitz is a versatile actor with a knack for both comedic and dramatic roles. He brings a unique charm to every character he portrays, making him a beloved figure in the industry.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+A.png"
      },
      {
        "name": "Pratigya Paudel",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png",
        "bio": "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png"
      }
    ],
    "director": "Alana Hill",
    "trailer": "https://cratetelevision.s3.amazonaws.com/Almas+vow+cut+trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Almas+Vows.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Almas+Vows.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Alma_s+Vows.png",
    "likes": 0,
    durationInMinutes: 15
  }
};

// FIX: Added missing exports for festivalData, festivalConfigData, and aboutData to make them available for import in other modules.
export const aboutData: AboutData = {
  missionStatement: 'To provide a platform for independent filmmakers to showcase their work to a global audience.',
  story: 'Crate TV was founded with the belief that great stories can come from anywhere. We are dedicated to finding and promoting unique voices in cinema.<br/><br/>Our platform is built by filmmakers, for filmmakers, with a focus on fair revenue sharing and community building.',
  belief1Title: 'For the Artist',
  belief1Body: 'We believe in empowering filmmakers by giving them a space to share their vision without compromise.',
  belief2Title: 'For the Audience',
  belief2Body: 'We curate a diverse collection of films, ensuring that our viewers can always discover something new and exciting.',
  belief3Title: 'For the Community',
  belief3Body: 'We aim to build a community where creators and fans can connect and share their passion for film.',
  founderName: 'Richard Frohman',
  founderTitle: 'Founder',
  founderBio: 'Richard Frohman is a Philadelphia-based actor and filmmaker. A graduate of Playhouse West-Philadelphia, he created Crate TV to provide a dedicated home for the vibrant indie film scene and give talented artists the audience they deserve.',
  founderPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/founder_photo.jpg'
};

export const festivalConfigData: FestivalConfig = {
  title: "Playhouse West 12th Annual Film Festival",
  description: "Join us for a celebration of independent cinema, featuring a curated selection of short films from emerging talents at Playhouse West-Philadelphia.",
  isFestivalLive: true
};

export const festivalData: FestivalDay[] = [
  {
    day: 1,
    date: "Saturday, July 27th",
    blocks: [
      {
        id: "day1-block1",
        title: "Film Block 1",
        time: "7:00 PM EST",
        movieKeys: ["newmovie1756487626529", "newmovie1756501125076"]
      },
      {
        id: "day1-block2",
        title: "Film Block 2",
        time: "8:30 PM EST",
        movieKeys: ["newmovie1756487215116", "newmovie1756487390550"]
      }
    ]
  },
  {
    day: 2,
    date: "Sunday, July 28th",
    blocks: [
      {
        id: "day2-block1",
        title: "Film Block 3",
        time: "7:00 PM EST",
        movieKeys: ["newmovie1756485973547", "newmovie1756486933392"]
      }
    ]
  }
];
