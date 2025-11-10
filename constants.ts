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
    movieKeys: ['newmovie1756741314485', 'lifeless', 'foodiecalltheatricalcut', 'juniper']
  },
  newReleases: {
    title: 'New Releases',
    movieKeys: ['geminitimeservice', 'consumed', 'results', 'theneighbours', 'twopeasinapod', 'slap', 'tedandnatalie', 'itsinyou']
  },
  awardWinners: {
    title: 'Award-Winning Films',
    // FIX: Removed 'foodiecalldirectorscut' as it was an incomplete object.
    movieKeys: ['lifeless', 'iloveyoublack', 'hair', 'juniper']
  },
  pwff12thAnnual: {
    title: 'PWFF-12th Annual Selections',
    movieKeys: []
  },
  comedy: {
    title: 'Comedies',
    // FIX: Removed 'foodiecalldirectorscut' as it was an incomplete object.
    movieKeys: [
      'thatloud',
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
      'consumed',
      'itsinyou',
      'unhinged'
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
  "geminitimeservice": {
    "key": "geminitimeservice",
    "title": "Gemini Time Service",
    "synopsis": "In a world where everyone knows their expiration date, Fern is anxious about her broken time device and seeks help in an unexpected place.",
    "cast": [
        {
            "name": "Cyan Zhong",
            "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
            "bio": "Information regarding this actor is currently unavailable.",
            "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
        },
        {
            "name": "Sumner Sykes",
            "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
            "bio": "Information regarding this actor is currently unavailable.",
            "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
        },
        {
            "name": "Sara Montse",
            "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
            "bio": "Information regarding this actor is currently unavailable.",
            "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
        }
    ],
    "director": "Cyan Zhong",
    "producers": "Cyan Zhong",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemini+Time+Service+-+xiani+zhong+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemeni+Time+Service.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemeni+Time+Service.JPG",
    "likes": 0
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
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah%20head%20shot.png",
        "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah%20bio%20picjpg.jpg"
      },
      {
        "name": "Ajinkya Dhage",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ%20Photo.png",
        "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj%20bio%20photo.png"
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
    "poster": "https://cratetelevision.s3.amazonaws.com/Lifeless%20poster%20remake.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant%20tv%20posters%20folder/Lifeless.png",
    "likes": 0,
    "rating": 8.8
  },
  "almasvows": {
    "key": "almasvows",
    "title": "Alma's Vows",
    "synopsis": "Alma struggles to move on after the death of her fiancé.",
    "cast": [
      {
        "name": "Alana Hill",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana%20Hill%202%20.png",
        "bio": "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana%20Hill%202%20.png"
      },
      {
        "name": "David Auspitz",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David%20A.png",
        "bio": "David Auspitz is a versatile actor with a knack for both comedic and dramatic roles. He brings a unique charm to every character he portrays, making him a beloved figure in the industry.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David%20A.png"
      },
      {
        "name": "Pratigya Paudel",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya%20Paudel.png",
        "bio": "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya%20Paudel.png"
      }
    ],
    "director": "Alana Hill",
    "trailer": "https://cratetelevision.s3.amazonaws.com/Almas+vow+cut+trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Almas%20Vows%20-%20Alana%20Hill.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's%20vows%20poster%20remake.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's%20vows%20poster%20remake.png",
    "likes": 0
  }
// FIX: The file was truncated here. The incomplete 'foodiecalldirectorscut' movie object has been removed and the `moviesData` object has been properly closed.
};

// FIX: Added placeholder data for festivalData, festivalConfigData, and aboutData, and exported them.
// This resolves import errors in multiple files.
export const festivalData: FestivalDay[] = [
  {
    day: 1,
    date: 'October 20, 2025',
    blocks: [
      {
        id: 'day1-block1',
        title: 'Opening Night Shorts',
        time: '7:00 PM EST',
        movieKeys: ['lifeless', 'almasvows'],
      },
      {
        id: 'day1-block2',
        title: 'Comedy Hour',
        time: '9:00 PM EST',
        movieKeys: ['thatloud', 'foodiecalltheatricalcut'],
      },
    ],
  },
  {
    day: 2,
    date: 'October 21, 2025',
    blocks: [
      {
        id: 'day2-block1',
        title: 'Dramatic Features',
        time: '8:00 PM EST',
        movieKeys: ['juniper', 'results'],
      },
    ],
  },
];

export const festivalConfigData: FestivalConfig = {
  title: 'Crate TV Film Festival',
  description: 'An annual celebration of independent cinema, showcasing the best and brightest new talent.',
  startDate: '2025-10-20T17:00:00.000Z',
  endDate: '2025-10-27T23:59:00.000Z',
};

export const aboutData: AboutData = {
  missionStatement: 'Our mission is to empower independent filmmakers by providing a platform to showcase their work and connect with a global audience.',
  story: 'Crate TV was founded on the belief that great stories can come from anywhere. We are dedicated to finding and promoting unique voices in cinema.',
  belief1Title: 'Creator First',
  belief1Body: 'We prioritize the needs of filmmakers, ensuring they have the tools and support to succeed.',
  belief2Title: 'Community Driven',
  belief2Body: 'We foster a vibrant community of film lovers and creators who share a passion for storytelling.',
  belief3Title: 'Accessible Art',
  belief3Body: 'We believe that powerful films should be accessible to everyone, everywhere.',
  founderName: 'John Doe',
  founderTitle: 'Founder & CEO',
  founderBio: 'John is a lifelong film enthusiast and advocate for independent artists.',
  founderPhoto: 'https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png',
};