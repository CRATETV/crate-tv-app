import { Category, Movie, FestivalDay, FestivalConfig } from './types';

export const festivalConfigData: FestivalConfig = {
  "title": "Crate TV Film Festival",
  "description": "Discover the next generation of indie filmmakers. Three days of incredible shorts, exclusive premieres, and unforgettable stories.",
  "isFestivalLive": false
};

export const categoriesData: Record<string, Category> = {
  "featured": {
    "title": "Featured Films",
    "movieKeys": [
      "newmovie1756741314485",
      "lifeless",
      "foodiecalldirectorscut",
      "juniper"
    ]
  },
  "newReleases": {
    "title": "New Releases",
    "movieKeys": [
      "Neighbours",
      "two-peas-in-a-pod",
      "slap",
      "newmovie1756741314485",
      "newmovie1756501125076",
      "newmovie1756487626529",
      "newmovie1756487390550",
      "newmovie1756487215116",
      "newmovie1756486933392",
      "newmovie1756485973547"
    ]
  },
  "awardWinners": {
    "title": "Award-Winning Films",
    "movieKeys": [
      "lifeless",
      "foodiecalldirectorscut",
      "iloveyoublack",
      "hair",
      "juniper"
    ]
  },
  "pwff12thAnnual": {
    "title": "PWFF-12th Annual Selections",
    "movieKeys": [
      "newmovie1756487626529",
      "newmovie1756501125076",
      "newmovie1756487215116",
      "newmovie1756487390550",
      "newmovie1756485973547",
      "newmovie1756486933392"
    ]
  },
  "publicDomainIndie": {
    "title": "Classic Independent Films",
    "movieKeys": [
      "atriptothemoon",
      "thegreattrainrobbery",
      "suspense",
      "thepawnshop",
      "theimmigrant",
      "thefallofthehouseofusher",
      "unchienandalou",
      "meshesofafternoon",
      "bridelessgroom",
      "palmourstreet"
    ]
  },
  "comedy": {
    "title": "Comedies",
    "movieKeys": [
      "foodiecalldirectorscut",
      "foodiecalltheatricalcut",
      "eharmonycs",
      "youvsthem",
      "wrapitup",
      "newmovie1756485973547",
      "newmovie1756487390550",
      "newmovie1756501125076",
      "newmovie1756741314485",
      "two-peas-in-a-pod"
    ]
  },
  "drama": {
    "title": "Dramas",
    "movieKeys": [
      "lifeless",
      "almasvows",
      "finallycaught",
      "iloveyoublack",
      "hair",
      "autumn",
      "silentlove",
      "juniper",
      "drive",
      "crossroads",
      "fatherdaughterdance",
      "newmovie1756486933392",
      "newmovie1756487626529",
      "newmovie1756487215116"
    ]
  },
  "documentary": {
    "title": "Documentaries",
    "movieKeys": [
      "streeteatstheboot"
    ]
  },
  "exploreTitles": {
    "title": "Explore These Titles",
    "movieKeys": [
      "ted-and-natalie",
      "smirk",
      "intrusivethoughts"
    ]
  }
};

export const moviesData: Record<string, Movie> = {
  "atriptothemoon": {
    "key": "atriptothemoon",
    "title": "A Trip to the Moon",
    "synopsis": "(1902) (14 mins) Directed by Georges Méliès, this pioneering sci-fi film is a masterpiece of early cinema.<br/><br/><strong>Contribution to Modern Cinema:</strong> It's famous for its groundbreaking special effects, whimsical storytelling, and establishing the foundation for the science-fiction genre. The iconic image of the rocket in the Man in the Moon's eye remains one of cinema's most famous shots, and Méliès' techniques, like substitution splices and dissolves, showed the world that film could be a medium of magic and fantasy, influencing generations of filmmakers.",
    "cast": [
      {
        "name": "Georges Méliès",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png",
        "bio": "A French illusionist and film director who led many technical and narrative developments in the earliest days of cinema. He was a prolific innovator in the use of special effects, popularizing such techniques as substitution splices, multiple exposures, and time-lapse photography.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png"
      }
    ],
    "director": "Georges Méliès",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/A+Trip+to+the+Moon+-+the+1902+Science+Fiction+Film+by+Georges+Me%CC%81lie%CC%80s+-+Open+Culture+(480p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Le_Voyage_dans_la_lune.jpg/800px-Le_Voyage_dans_la_lune.jpg",
    "likes": 0,
    "releaseDateTime": "1902-09-01T00:00"
  },
  "thegreattrainrobbery": {
    "key": "thegreattrainrobbery",
    "title": "The Great Train Robbery",
    "synopsis": "(1903) (12 mins) Directed by Edwin S. Porter, this film is a milestone in cinema history and one of the earliest narrative films.<br/><br/><strong>Contribution to Modern Cinema:</strong> It was revolutionary for its use of techniques like cross-cutting, on-location shooting, and a camera that moved with the action. The final shot of a bandit firing at the audience became an iconic cinematic moment. Its storytelling innovations laid the groundwork for the narrative structure of virtually every action and Western film that followed.",
    "cast": [
      {
        "name": "Justus D. Barnes",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/4/41/The_Great_Train_Robbery_-_Close-up_of_a_bandit.jpg",
        "bio": "An American actor of the silent era, most famous for his role as the bandit in 'The Great Train Robbery' who fires his gun directly at the camera.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/4/41/The_Great_Train_Robbery_-_Close-up_of_a_bandit.jpg"
      }
    ],
    "director": "Edwin S. Porter",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+Great+Train+Robbery+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Great_Train_Robbery%2C_Edwin_S._Porter%2C_Edison_Films%2C_1903_Poster.jpg",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/The_Great_Train_Robbery_%281903%29.jpg/800px-The_Great_Train_Robbery_%281903%29.jpg",
    "likes": 0,
    "releaseDateTime": "1903-12-01T00:00"
  },
  "suspense": {
    "key": "suspense",
    "title": "Suspense",
    "synopsis": "(1913) (10 mins) Directed by Lois Weber and Phillips Smalley, this film is a major work in early horror.<br/><br/><strong>Contribution to Modern Cinema:</strong> 'Suspense' was groundbreaking for its technical innovations. Its use of a three-way split screen was revolutionary, allowing audiences to see multiple actions simultaneously, a technique now common in thrillers and action films. The film's use of dramatic camera angles and parallel editing to create tension set a new standard for the suspense genre.",
    "cast": [
      {
        "name": "Lois Weber",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg",
        "bio": "An American silent film actress, screenwriter, producer, and director. She is identified as 'the most important female director the American film industry has known'.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg"
      },
      {
        "name": "Valentine Paul",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies