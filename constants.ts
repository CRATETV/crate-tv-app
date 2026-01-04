
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
  "cratemas": {
    "title": "Cratemas",
    "movieKeys": [
      "foodiecalldirectorscut",
      "newmovie1756487215116",
      "newmovie1765384164206",
      "silentlove",
      "newmovie1756741314485"
    ]
  },
  "awardWinners": {
    "title": "Award-Winning Films",
    "movieKeys": [
      "fighter",
      "lifeless",
      "foodiecalldirectorscut",
      "iloveyoublack",
      "hair",
      "juniper"
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
      "slap",
      "twopeasinapod",
      "newmovie1763381218900"
    ]
  },
  "documentary": {
    "title": "Documentaries",
    "movieKeys": [
      "streeteatstheboot"
    ]
  },
  "drama": {
    "title": "Dramas",
    "movieKeys": [
      "fighter",
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
      "newmovie1756487215116",
      "theneighbours",
      "itsinyou",
      "tedandnatalie",
      "unhinged",
      "consumed",
      "results"
    ]
  },
  "exploreTitles": {
    "title": "Project: Indie",
    "movieKeys": [
      "smirk",
      "intrusivethoughts"
    ]
  },
  "featured": {
    "title": "Featured Films",
    "movieKeys": [
      "fighter",
      "newmovie1756741314485",
      "lifeless",
      "foodiecalldirectorscut",
      "juniper"
    ]
  },
  "newReleases": {
    "title": "New Releases",
    "movieKeys": [
      "fighter",
      "newmovie1765384164206",
      "newmovie1764602379299",
      "newmovie1763986220979",
      "newmovie1763381218900",
      "newmovie1762818971534",
      "newmovie1756741314485",
      "newmovie1756501125076",
      "newmovie1756487626529",
      "newmovie1756487390550",
      "newmovie1756487215116",
      "newmovie1756486933392",
      "newmovie1756485973547",
      "newmovie1761000817040"
    ]
  },
  "nowStreaming": {
    "title": "Now Streaming",
    "movieKeys": [
      "fighter"
    ]
  },
  "publicDomainIndie": {
    "title": "Vintage Visions",
    "movieKeys": [
      "atriptothemoon",
      "suspense",
      "thepawnshop",
      "the immigrant",
      "thefallofthehouseofusher",
      "unchienandalou",
      "meshesofafternoon",
      "bridelessgroom"
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
        "bio": "Tommy is a legendary actor—the first with Down syndrome to play Hamlet on stage and star in a BBC primetime drama.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Simon Kunz",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Actor Simon Kunz is a powerhouse of British cinema and television with a career spanning over 30 years. Most fans will immediately recognize him as Martin, the beloved and loyal butler in the Disney classic The Parent Trap (1998)",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Laura Morgan",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Robbie O’Neill",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
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
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Pratigya+Paudel.png",
        "bio": "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Pratigya+Paudel.png"
      }
    ],
    "director": "Alana Hill",
    "trailer": "https://cratetelevision.s3.amazonaws.com/Almas+vow+cut+trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Almas+Vows+-+Alana+Hill.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/Alma%27s+vows+poster+remake+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/AlmasVows.png",
    "likes": 0
  },
  "atriptothemoon": {
    "key": "atriptothemoon",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/A+Trip+to+the+Moon+-+the+1902+Science+Fiction+Film+by+Georges+Me%CC%81lie%CC%80s+-+Open+Culture+(480p%2C+h264%2C+youtube).mp4",
    "releaseDateTime": "1902-09-01T12:00:00Z",
    "cast": [
      {
        "name": "Georges Méliès",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png",
        "bio": "Georges Méliès was a French illusionist and film director who led many technical and narrative developments in the earliest days of cinema."
      }
    ],
    "title": "A Trip to the Moon",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "watchPartyStartTime": "2025-11-06T15:17:00.000Z",
    "trailer": "",
    "isWatchPartyEnabled": false,
    "synopsis": "A group of astronomers go on an expedition to the Moon in a capsule that is propelled by a giant cannon. A classic silent film from 1902.",
    "likes": 0,
    "director": "Georges Méliès",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp"
  },
  "autumn": {
    "key": "autumn",
    "title": "Autumn",
    "synopsis": "A woman confronts her boyfriend about his change of heart",
    "cast": [
      {
        "name": "Alana Hill",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png",
        "bio": "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png"
      },
      {
        "name": "Luke Yong Kwon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "David Auspitz",
    "trailer": "https://cratetelevision.s3.amazonaws.com/AutumnTrailer.mp4",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn+-+Alana+Hill.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/Autumn+poster+remake+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Autumn.png",
    "likes": 0
  },
  "bridelessgroom": {
    "key": "bridelessgroom",
    "releaseDateTime": "1947-09-11T12:00:00Z",
    "likes": 0,
    "synopsis": "A Three Stooges classic where Shemp inherits a fortune, but only if he can get married within a few hours. A frantic search for a bride ensues.",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/BridelessGroom720p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Bridelessgroom_1sht.jpg",
    "director": "Edward Bernds",
    "cast": [
      {
        "bio": "Shemp Howard was an American actor and comedian, best known as a member of the comedy trio the Three Stooges.",
        "name": "Shemp Howard",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "trailer": "",
    "title": "Brideless Groom",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Bridelessgroom_1sht.jpg",
    "isWatchPartyEnabled": false,
    "watchPartyStartTime": "2025-11-06T00:16"
  },
  "consumed": {
    "key": "consumed",
    "releaseDateTime": "2024-10-31T23:00:00Z",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG",
    "hasCopyrightMusic": true,
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG",
    "title": "Consumed",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/consumed+.mp4",
    "trailer": "",
    "cast": [
      {
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "name": "Lucie Paige Krovatin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "name": "Allison Ferguson",
        "bio": "Information regarding this actor is currently unavailable."
      }
    ],
    "director": "Richard Frohman, Akil Logan-Haye",
    "synopsis": "She gave everything to make her love complete, but a woman learns that her monumental act of self-sacrifice wasn't a noble gesture; it was the final permission her toxic relationship needed to devour her soul.",
    "likes": 3
  },
  "crossroads": {
    "key": "crossroads",
    "title": "Crossroads",
    "synopsis": "Post-dinner tensions expose devastating secrets, imploding a couple's relationship.",
    "cast": [
      {
        "name": "Shamira Womack",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg",
        "bio": "Shamira Womack is a dynamic and multifaceted talent, carving a unique space in the world of film. As an actor, writer, director, and filmmaker, Womack demonstrates a remarkable versatility and a deep commitment to the craft of storytelling",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg"
      },
      {
        "name": "Lam Wonkeryor",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": " Information regarding this actor is currently unavailable",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Akil Logan Haye",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/CROSSROADS-OFFICIAL-FILM_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/crossroads(Mobile+Video).jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Crossroads.png",
    "likes": 12
  },
  "drive": {
    "key": "drive",
    "title": "Drive",
    "synopsis": "Two siblings take a journey that could change the trajectory of their lives.",
    "cast": [
      {
        "name": "Ellicia Clayton",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG"
      },
      {
        "name": "Ed Aristone",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ed+Aristone+.webp",
        "bio": "Ed Aristone, an award-winning actor and Playhouse West-Philadelphia associate teacher, with extensive film and stage experience alongside directing and producing, emphasizes dedicated role research and collaborative passion, driven by a belief in acting as a gift to inspire humanity.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ed+Aristone+.webp"
      }
    ],
    "director": "Shamira Womack",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+(2).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+Poster.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+Poster.jpeg",
    "likes": 16
  },
  "eharmonycs": {
    "key": "eharmonycs",
    "title": "eHarmonycs",
    "synopsis": "Two people meet in a bar and decide whether to get to know each other.",
    "cast": [
      {
        "name": "Kathryn Wylde",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png",
        "bio": "Kathryn Wylde is an emerging actor with a passion for storytelling, demonstrating their skills both on screen and behind the camera.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png"
      },
      {
        "name": "Johnny Fernandez",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "RT Bowersox",
    "trailer": "https://cratetelevision.s3.amazonaws.com/eHarmonycsTrailer.mp4",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/EHARMONYCS.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/eHarmonics+poster+remake++(1).png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/eHarmonycs.png",
    "likes": 1
  },
  "fatherdaughterdance": {
    "key": "fatherdaughterdance",
    "title": "Father Daughter Dance",
    "cast": [
      {
        "name": "Charles Ellis Washington",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG",
        "bio": "Charles Ellis Washington is an actor who brings a controlled intensity and smooth presence to his work in film and theater, creating memorable performances.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG"
      },
      {
        "name": "Sylvette Mikel",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": " Information regarding this actor is currently unavailable",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Charles Ellis Washington",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/father+daughter+dance.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Father+Daughter+Dance+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Father+Daughter+Dance+.png",
    "likes": 12,
    "synopsis": "A father and daughter confront past choices and their lingering impact. "
  },
  "finallycaught": {
    "key": "finallycaught",
    "title": "Finally Caught",
    "synopsis": "Finally Caught plunges viewers into the heart of a young woman's secret struggle with an eating disorder.",
    "cast": [
      {
        "name": "Michelle Reale-Opalesky",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkabe range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
      },
      {
        "name": "Cathrine Tillotson",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Cathrine Tillotson is a disabled actor with a passion for performing. They possess a strong stage presence and a natural connection with audiences. Eager to learn and grow, they strive to bring compelling characters to life.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Sarah Morrison-Cleary",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/(Copy)+Finally+Caught_FC3.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/finally+caught+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/FinallyCaught.png",
    "likes": 0
  },
  "foodiecalldirectorscut": {
    "key": "foodiecalldirectorscut",
    "title": "Foodie Call Director's Cut",
    "synopsis": "Maya is both financially and physically famished. Her desperation has led her to develop a rather unconventional habit: dating solely for free meals. It's a risky game, but it's the only one she knows.<br/><br/>Trivia: Foodie Call was awarded Best Comedy at the 2024 Playhouse West-Philadelphia Film Festival.",
    "cast": [
      {
        "name": "Darrah Lashley",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png",
        "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      },
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Robert Boyd",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png",
        "bio": "Robert Boyd is a filmmaker and actor known for his impressive work in both mediums. He creates compelling films and delivers captivating performances on stage and screen.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png"
      },
      {
        "name": "Michael Dwayne Paylor",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png",
        "bio": "Michael Dwayne Paylor is a fantastic comedic writer with a knack for crafting hilarious and engaging stories. He seamlessly transitions between film and stage, showcasing his adaptability and creative range.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png"
      },
      {
        "name": "Akil Logan Haye",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png",
        "bio": "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png"
      }
    ],
    "director": "Michael Dwayne Paylor",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+Paycut.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+Director's+cut+poster+.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Foodie+Call.png",
    "likes": 2
  },
  "foodiecalltheatricalcut": {
    "key": "foodiecalltheatricalcut",
    "title": "Foodie Call Theatrical Cut",
    "synopsis": "Maya is both financially and physically famished. Her desperation has led her to develop a rather unconventional habit: dating solely for free meals. It's a risky game, but it's the only one she knows.<br/><br/>Trivia: Foodie Call was awarded Best Comedy at the 2024 Playhouse West-Philadelphia Film Festival.",
    "cast": [
      {
        "name": "Darrah Lashley",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png",
        "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      },
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Robert Boyd",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png",
        "bio": "Robert Boyd is a filmmaker and actor known for his impressive work in both mediums. He creates compelling films and delivers captivating performances on stage and screen.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png"
      },
      {
        "name": "Michael Dwayne Paylor",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png",
        "bio": "Michael Dwayne Paylor is a fantastic comedic writer with a knack for crafting hilarious and engaging stories. He seamlessly transitions between film and stage, showcasing his adaptability and creative range.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png"
      },
      {
        "name": "Akil Logan Haye",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png",
        "bio": "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png"
      }
    ],
    "director": "Michael Dwayne Paylor",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+Lasley+cut.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Foodie+Call.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Foodie+Call.png",
    "likes": 1
  },
  "hair": {
    "key": "hair",
    "title": "Hair",
    "synopsis": "An African American woman fights through stereotyping in the workplace until she is fed up.<br/><br/>Trivia: Darrah Lashley's performance in this film earned her an award at the Playhouse West-Philadelphia Film Festival.",
    "cast": [
      {
        "name": "Darrah Lashley",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png",
        "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      },
      {
        "name": "Joshua Daniel",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png"
      }
    ],
    "director": "Joshua Daniel",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/Hair+TrailerMP4.MP4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/HAIR.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/Hair+poster+209+X+209++(2).jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Hair.png",
    "likes": 0
  },
  "iloveyoublack": {
    "key": "iloveyoublack",
    "title": "I Love You Black",
    "synopsis": "Haunted by generations of unspoken truths, Deborah is desperate to break the cycle of secrets in her Black family before her silence costs her little sister everything.<br/><br/>Trivia:Salome Denoon received the Best Supporting Actress award at the 2024 Playhouse West-Philadelphia Film Festival for her performance in this film.",
    "cast": [
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Thatia MomPremier",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Tathia+Mompri_6705.jpg",
        "bio": "Thatia MomPremier is a dynamic force on stage and screen. As a powerhouse of an actor, she commands attention in every performance, bringing her unique energy and presence to both film and theater.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Tathia+Mompri_6705.jpg"
      },
      {
        "name": "Charles Ellis Washington",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG",
        "bio": "Charles Ellis Washington is an actor who brings a controlled intensity and smooth presence to his work in film and theater, creating memorable performances.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG"
      },
      {
        "name": "Isabelle Dessalines",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Isabelle Dessalines, an aspiring actor, brings a captivating blend of mystery and innocence to her characters through her quiet and thoughtful performances on stage and screen.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Anh Nguyen",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/I+Loveyou+in+black+Theatrical+cut.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/I+love+You-Black.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/I+love+You-Black.png",
    "likes": 0
  },
  "intrusivethoughts": {
    "key": "intrusivethoughts",
    "title": "Intrusive Thoughts",
    "synopsis": "Haunted by a lost love, a man's manic obsession blurs the line between reality and his darkest, violent fantasies.",
    "cast": [
      {
        "name": "CJ Musial",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Navia Prezeau",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Sam Cortell",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Patrick Thomas Kasey",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Akil Logan-Haye",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Intrusive+Thoughts+Final+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/Intrusive+Thoughts+for+instant+tv+Channel++(1920+x+1080+px)+(1080+x+1620+px).png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/Intrusive+Thoughts+for+instant+tv+Channel++(1920+x+1080+px)+(1080+x+1620+px).png",
    "likes": 0
  },
  "itsinyou": {
    "key": "itsinyou",
    "title": "It's In You",
    "synopsis": "A problematic pastor must fight for his life when he is invaded by a violent and vengeful spirit.",
    "cast": [
      {
        "name": "Robert Graves",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": " Information regarding this actor is currently unavailable",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Robert Graves",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+trailer.mov",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Its+In+You.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+poster+jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/ItsInYou.png",
    "likes": 2
  },
  "juniper": {
    "key": "juniper",
    "title": "Juniper",
    "synopsis": "Bad news from her mother sends Juniper into chaos, and her roommate makes it worse.<br/><br/>Trivia: Juniper triumphed at the 2023 Playhouse West-Philadelphia Film Festival, securing Best Short Film, Best Screenplay, Best Actress for Pratigya Paudel, and Best Supporting Actress for Julianna Lea. The film was also selected for screening at the Philly Film Showcase.",
    "cast": [
      {
        "name": "Pratigya Paudel",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png",
        "bio": "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png"
      },
      {
        "name": "Julianne Lea",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Julianne+Lea.jpg",
        "bio": "Julianne Lea is a talented actress with a passion for storytelling. She has a diverse portfolio, including roles in acting producing and set design.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Julianne+Lea.jpg"
      }
    ],
    "director": "Pratigya Paudel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper.png",
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
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      },
      {
        "name": "Ajinkya Dhage",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/AJ+Photo.png",
        "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Aj+bio+photo.png"
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
    "likes": 0
  },
  "meshesofafternoon": {
    "key": "meshesofafternoon",
    "releaseDateTime": "1943-01-01T12:00:00Z",
    "synopsis": "A key work of American experimental cinema, this short film presents a woman's subjective, dream-like experience that spirals into a dark psychological narrative.",
    "director": "Maya Deren, Alexander Hammid",
    "watchPartyStartTime": "2025-11-06T00:46",
    "trailer": "",
    "likes": 0,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes-of-the-Afternoon-4K-AI-Upscaling_720p.mp4",
    "cast": [
      {
        "bio": "Maya Deren was a Ukrainian-born American experimental filmmaker and an important promoter of the avant-garde in the 1940s and 1950s.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "name": "Maya Deren",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes_of_the_Afternoon_1.png",
    "title": "Meshes of the Afternoon",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes_of_the_Afternoon_1.png",
    "isWatchPartyEnabled": false
  },
  "newmovie1756485973547": {
    "key": "newmovie1756485973547",
    "title": "Burst ",
    "synopsis": "When two people with anger issues meet to do their community service, they pick up more than trash.",
    "cast": [
      {
        "name": "Catherine Tillotson",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Dave Piccinett",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Gina Hendricks",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Shamira Womack",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg",
        "bio": "Shamira Womack is a dynamic and multifaceted talent, carving a unique space in the world of film. As an actor, writer, director, and filmmaker, Womack demonstrates a remarkable versatility and a deep commitment to the craft of storytelling",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg"
      }
    ],
    "director": "Sarah Morrison-Cleary",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/BURST+Sarah+Morrison-Cleary.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Webapp+posters/Burst.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/Burst.png",
    "likes": 1
  },
  "newmovie1756486933392": {
    "key": "newmovie1756486933392",
    "title": "Power Trip ",
    "synopsis": "A Traffic stop goes terribly bad.",
    "cast": [
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG"
      },
      {
        "name": "Joe Henderson",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Brian Campbell",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Abbie Allen",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Joshua Daniel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Power+Trip+Bubacarr+Sarge.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Webapp+posters/powertrip.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/Power+Trip.png",
    "likes": 0
  },
  "newmovie1756487215116": {
    "key": "newmovie1756487215116",
    "title": "Fling ",
    "synopsis": "When a casual hookup between two strangers unexpectedly turns into dinner, what begins as flirtation spirals into something deeper.",
    "cast": [
      {
        "name": "Rachel Poletick",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Amos Quoi",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Jason V. Henderson",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Fling+Jason+V+Henderson.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Webapp+posters/fling+webapp.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/fling+Instant+tv+poster.png",
    "likes": 0
  },
  "newmovie1756487390550": {
    "key": "newmovie1756487390550",
    "title": "I Still Love Her ",
    "synopsis": "A boyfriend and his girlfriend quibble about the girlfriend’s boneheaded mistake.",
    "cast": [
      {
        "name": "Patrick Thomas Kasey",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Savannah Sakaguchi",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Vigneshwar Raju",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/IStillLoveHer+Patrick+Thomas+Kasey.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Webapp+posters/I+still+Love+Her.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/I+still+love+her+poster+.png",
    "likes": 0
  },
  "newmovie1756487626529": {
    "key": "newmovie1756487626529",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Webapp+posters/Strange+ENcounters.png",
    "title": "Strange Encounters ",
    "likes": 1,
    "synopsis": " A black man experiences some strange encounters on his daily jog.",
    "director": "Bubacarr Sarge",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/STRANGE+ENCOUNTERS+Bubacarr+Sarge.mp4",
    "trailer": "",
    "cast": [
      {
        "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "name": "Bubacarr Sarge"
      },
      {
        "bio": "Information regarding this actor is currently unavailable.",
        "name": "Sarah Morrison-Cleary",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "bio": "Information regarding this actor is currently unavailable.",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "name": "Christian Valentin",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/strange+Encounters+instant+tv.+poster.png",
    "isWatchPartyEnabled": false
  },
  "newmovie1756501125076": {
    "key": "newmovie1756501125076",
    "title": "of Bees and Boobs",
    "synopsis": "An attractive landscaper comes to help a woman in a sexless marriage.",
    "cast": [
      {
        "name": "Maya Orli Cohen",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Christian Valentin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Eric Eisenstein",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Myra Adrian Nelson",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Of+Bees+of+Boobs+Screener.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/of+bees+and+boobs+webapp+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/of+bees+and+boobs+instant+tv+.JPG",
    "likes": 2
  },
  "newmovie1756741314485": {
    "key": "newmovie1756741314485",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/What+If++The+Movie.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/I+love+you+black.+poster+.png",
    "likes": 0,
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/what+If+poster+for+instant+tv+(1920+x+1080+px)+(1080+x+1620+px).png",
    "title": "What If ",
    "synopsis": "Sophia bypasses the usual suspects and takes a wild chance on a psychic medium.",
    "cast": [
      {
        "name": "Salome Denoon",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Joshua Daniel",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation."
      },
      {
        "bio": "Bubacarr Sarge is an actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
        "name": "Bubacarr Sarge",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG"
      },
      {
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
        "name": "Michelle Reale-Opalesky"
      },
      {
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "name": "Kayla McFarlane",
        "bio": "Information regarding this actor is currently unavailable.",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "trailer": "",
    "director": "Jalina Wayser ",
    "hasCopyrightMusic": true
  },
  "newmovie1761000817040": {
    "key": "newmovie1761000817040",
    "trailer": "",
    "cast": [
      {
        "name": "Aatiq Simmons ",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Richard Frohman ",
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
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/That+Loud.png",
    "director": "Oskar Pierre Castro ",
    "mainPageExpiry": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/That+Loud+.mp4",
    "synopsis": "A Stoner comedy ",
    "title": "That Loud ",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/That+Loud.png",
    "releaseDateTime": "2025-10-20T18:53",
    "likes": 1
  },
  "newmovie1762818971534": {
    "key": "newmovie1762818971534",
    "director": " Cyan Zhong",
    "durationInMinutes": 0,
    "rating": 0,
    "hasCopyrightMusic": false,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemini+Time+Service+-+xiani+zhong+(1080p%2C+h264%2C+youtube).mp4",
    "title": "Gemini Time Service",
    "isWatchPartyEnabled": false,
    "producers": "",
    "releaseDateTime": "",
    "trailer": "",
    "cast": [
      {
        "name": "Cyan Zhong",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Sumner Sykes ",
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
    "tvPoster": "",
    "watchPartyStartTime": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemeni+Time+Service.JPG",
    "synopsis": "In a world where everyone knows their expiration date Fern is anxious about her broken time device.",
    "likes": 2
  },
  "newmovie1763381218900": {
    "key": "newmovie1763381218900",
    "isForSale": false,
    "salePrice": 0,
    "director": "Michael Dwayne Paylor ",
    "durationInMinutes": 0,
    "mainPageExpiry": "",
    "rating": 0,
    "hasCopyrightMusic": true,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Trudy+(1).mp4",
    "synopsis": "After a breakup, a tightly-wound woman obsessed with control uses written contracts to manage her relationships.",
    "title": "Trudy ",
    "isWatchPartyEnabled": false,
    "producers": "",
    "releaseDateTime": "",
    "trailer": "",
    "cast": [
      {
        "name": "Julia De Palma",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Haley Cassidy ",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Gina Hendricks",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Michael Dwayne Paylor",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "tvPoster": "",
    "watchPartyStartTime": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Trudy+movie+poster.png",
    "likes": 1
  },
  "newmovie1763986220979": {
    "key": "newmovie1763986220979",
    "isForSale": false,
    "salePrice": 0,
    "director": "",
    "durationInMinutes": 0,
    "mainPageExpiry": "",
    "rating": 0,
    "hasCopyrightMusic": false,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Just+Cuz+New+Richard+Frohman.mp4",
    "synopsis": "",
    "title": "Just Cuz ",
    "isWatchPartyEnabled": false,
    "producers": "",
    "releaseDateTime": "",
    "trailer": "",
    "cast": [],
    "tvPoster": "",
    "watchPartyStartTime": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/just+cuz.png",
    "likes": 0
  },
  "newmovie1764602379299": {
    "key": "newmovie1764602379299",
    "isForSale": false,
    "salePrice": 0,
    "director": "Michael James Mina",
    "durationInMinutes": 0,
    "mainPageExpiry": "",
    "rating": 0,
    "hasCopyrightMusic": false,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/When+Good+Americans+Die+Michael+Mina.mp4",
    "synopsis": "As Charlie’s family falls apart they dream of a new life in Paris.",
    "title": "When Good Americans Die ",
    "isWatchPartyEnabled": false,
    "producers": "",
    "releaseDateTime": "",
    "trailer": "",
    "cast": [
      {
        "name": "Annaliese Schreiber",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Michael James Mina",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "tvPoster": "",
    "watchPartyStartTime": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/When+Good+Americans+Die+png.png",
    "likes": 0
  },
  "newmovie1765384164206": {
    "key": "newmovie1765384164206",
    "isForSale": false,
    "salePrice": 0,
    "director": "",
    "durationInMinutes": 0,
    "mainPageExpiry": "",
    "rating": 0,
    "hasCopyrightMusic": false,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Bereavement+.mov",
    "synopsis": "The sudden loss of their teenage son shatters the world of a loving couple.",
    "title": "Bereavement",
    "isWatchPartyEnabled": false,
    "producers": "",
    "releaseDateTime": "",
    "trailer": "",
    "cast": [
      {
        "name": "Tyler Andrews ",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "tvPoster": "",
    "watchPartyStartTime": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Bereavement.png",
    "likes": 0
  },
  "results": {
    "key": "results",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.png",
    "director": "Michelle Reale-Opalesky",
    "cast": [
      {
        "name": "Michelle Reale-Opalesky",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range.",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
      }
    ],
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.png",
    "likes": 0,
    "synopsis": "Three women await life-altering results in a medical waiting room.",
    "title": "Results",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results+.mp4"
  },
  "silentlove": {
    "key": "silentlove",
    "poster": "https://cratetelevision.s3.amazonaws.com/silent+Love++poster+remake+.jpg",
    "synopsis": "Unspoken feelings have kept Vicky and Toby in the friend zone forever.",
    "cast": [
      {
        "bio": "Salome Denoon is an actress and developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      }
    ],
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/SilentLove+Movie+05.14.2024-1+2.mp4",
    "trailer": "https://cratetelevision.s3.amazonaws.com/SilentLoveTrailer.mp4",
    "director": "Salome Denoon",
    "likes": 0,
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/SilentLove.png",
    "title": "Silent Love"
  },
  "slap": {
    "key": "slap",
    "title": "Slap",
    "synopsis": "One night of debauchery comes to a stinging end.",
    "cast": [
      {
        "name": "Seth Sharpe",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Shaunpaul Costello",
    "trailer": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "likes": 0,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/SLAP+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4"
  },
  "smirk": {
    "key": "smirk",
    "title": "Smirk",
    "synopsis": "A man retreats into a dream world where divorce is his only solace.",
    "cast": [
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      }
    ],
    "director": "Vigneshwar Raju",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk+poster+.png",
    "likes": 10
  },
  "streeteatstheboot": {
    "key": "streeteatstheboot",
    "title": "Street Eats The Boot",
    "synopsis": "Documentary exploring Louisiana food trucks.",
    "cast": [],
    "director": "Andrew W Trimble",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Street+Eats+THE+BOOT-A+Louisiana+Food+Truck+Journey.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/street+Eats+the+Boot+trailer+overlay++(1).jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/StreetEats.png",
    "likes": 1
  },
  "suspense": {
    "key": "suspense",
    "title": "Suspense",
    "synopsis": "A woman home alone with her baby is terrorized by a tramp.",
    "cast": [],
    "director": "Lois Weber",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense.+(Rex+Motion+Picture+Co.+US+1913).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "likes": 0,
    "releaseDateTime": "1913-07-06T12:00:00Z"
  },
  "tedandnatalie": {
    "key": "tedandnatalie",
    "title": "Ted and Natalie",
    "cast": [],
    "trailer": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "likes": 0,
    "director": "Michelle M. Charles ",
    "synopsis": "A loving boyfriend confronts his avoidant girlfriend.",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/TED+AND+NATALIE+compressed+-+Lotus+Blossom+Productions+(1080p%2C+h264%2C+youtube).mp4"
  },
  "thefallofthehouseofusher": {
    "key": "thefallofthehouseofusher",
    "title": "The Fall of the House of Usher",
    "synopsis": "Based on the story by Edgar Allan Poe.",
    "cast": [],
    "director": "James Sibley Watson",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The-Fall-of-the-House-of-Usher-1928-Film-Guild_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+Fall+of+House+Of+Usher+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+Fall+of+House+Of+Usher+.jpeg",
    "likes": 0,
    "releaseDateTime": "1928-10-28T12:00:00Z"
  },
  "theimmigrant": {
    "key": "theimmigrant",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Immigrant_1917.JPG",
    "releaseDateTime": "1917-06-17T12:00:00Z",
    "cast": [
      {
        "name": "Charlie Chaplin",
        "bio": "Sir Charles Spencer 'Charlie' Chaplin KBE was an English comic actor, filmmaker, and composer who rose to fame in the era of silent film.",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "synopsis": "The Tramp is an immigrant who endures a challenging voyage and gets into trouble as soon as he arrives in America, where he falls for a beautiful young woman.",
    "trailer": "",
    "director": "Charlie Chaplin",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The+Immigrant+(1917).mp4",
    "title": "The Immigrant",
    "likes": 0,
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Immigrant_1917.JPG"
  },
  "theneighbours": {
    "key": "theneighbours",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "cast": [],
    "likes": 0,
    "director": "Seth Sharpe",
    "synopsis": "A comedic drama with a dark twist.",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "trailer": "",
    "title": " Neighbours",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/NEIGHBORS+-+Shaunpaul+Costello++compressed++youtube).mp4"
  },
  "thepawnshop": {
    "key": "thepawnshop",
    "synopsis": "As a pawnbroker's assistant, the Tramp creates chaos, clashing with his coworker, flirting with the pawnbroker's daughter, and dealing with eccentric customers.",
    "title": "The Pawnshop",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/'The_Pawnshop'.jpg",
    "trailer": "",
    "cast": [],
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ThePawnshop.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/'The_Pawnshop'.jpg",
    "releaseDateTime": "1916-10-02T12:00:00Z",
    "director": "Charlie Chaplin",
    "likes": 0
  },
  "twopeasinapod": {
    "key": "twopeasinapod",
    "title": "Two Peas in a Pod",
    "synopsis": "If you want to smoke with the big dogs, you have to bark with the big dogs first.",
    "cast": [],
    "director": "Shaunpaul Costello",
    "trailer": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
    "likes": 1,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/TWO+PEAS+IN+A+POD++compressed.mp4"
  },
  "unchienandalou": {
    "key": "unchienandalou",
    "releaseDateTime": "1929-06-06T12:00:00Z",
    "director": "Luis Buñuel",
    "trailer": "",
    "synopsis": "A surrealistic classic from Luis Buñuel and Salvador Dalí, this film is a collection of shocking, dreamlike, and unforgettable images.",
    "cast": [],
    "likes": 0,
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou+-+(1929)+-+(1080p+-+x265).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou.webp",
    "title": "Un Chien Andalou"
  },
  "unhinged": {
    "key": "unhinged",
    "title": "The Unhinged",
    "synopsis": "Information regarding this film is currently unavailable. A film by Robert Graves & Philaye Films.",
    "cast": [],
    "director": "Robert Graves",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+Unhinged-+A+film+by+Robert+Graves+%26+Philaye+Films.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+unhinged+Movie+poster+.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+unhinged+Movie+poster+.JPG",
    "likes": 0
  },
  "wrapitup": {
    "key": "wrapitup",
    "title": "Wrap It Up",
    "synopsis": "A passive-aggressive war unfolds between Mark, the supporting actor, and the director. Their every line and directorial choice is a thinly veiled barb.",
    "cast": [],
    "director": "Jordan Fox",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
    "likes": 13
  },
  "youvsthem": {
    "key": "youvsthem",
    "title": "You Vs Them",
    "synopsis": "While on a seemingly promising first date, Sasha finds her mind drifting back to a parade of disastrous past relationships. Each awkward moment with her current suitor triggers a flashback.",
    "cast": [],
    "director": "Joshua Daniel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/youVs+Them.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/you+vs+them+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/YouVsThem.png",
    "likes": 1
  }
};

export const aboutData: AboutData = {
  "missionStatement": "Too often, brilliant films from dedicated creators get lost in the noise of mass-market platforms. We are here to champion these voices and provide them with a prestigious, permanent home after the festival circuit. We identify world-class talent at the source and offer an elite distribution afterlife.",
  "story": "In a world saturated with algorithm-driven filler, the raw, vital pulse of independent cinema is getting lost.\n\nThat's why Crate TV was born. Based in our vibrant creative hub and powered by a global media infrastructure, we serve as the ultimate 'Authenticity Funnel.' We are a lifeboat for the champions of the festival circuit—curated by artists, for the visionaries.\n\nOur V4 infrastructure merges technical engineering with award-winning artistic pedigree, eliminating the gap between world-class creators and a global living-room audience on platforms like Roku. We are building more than a streaming service; we are building a sustainable ecosystem where independent artists finally gain the professional visibility and patronage they deserve.",
  "belief1Title": "Artistry Over Algorithms",
  "belief1Body": "Every film on Crate TV is hand-picked. We believe in elite human curation to bring you powerful, unique, and compelling films that deserve an eternal afterlife.",
  "belief2Title": "Global Reach",
  "belief2Body": "While our roots are in the indie film scene, our infrastructure is built for global scale. We bring localized indie spirit to international screens via our custom Roku SDK.",
  "belief3Title": "The 70/30 Patronage Loop",
  "belief3Body": "We are a filmmaker-owned platform. Our model prioritizes the creator, with 70% of support going directly to the artists, fostering a new era of independent sustainability.",
  "founderName": "Salome Denoon",
  "founderTitle": "Founder & Developer",
  "founderBio": "As a Founder & Developer, Salome saw a critical failure in the distribution lifecycle of independent film. With a background in performance and technical development, she built Crate TV from the ground up to act as a prestigious distribution afterlife for the films that move us. Her vision is to provide every world-class indie creator with a permanent, professional stage and a direct path to sustainable patronage.",
  "founderPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
};

export const festivalConfigData: FestivalConfig = {
  "isFestivalLive": true,
  "description": "Coming back in August 2026 for the real film festival.",
  "title": "Playhouse West-Philadelphia 13th Annual Film Festival ",
  "startDate": "2025-11-27T01:28:12.797Z",
  "endDate": "2025-11-27T01:28:00.000Z"
};

export const festivalData: FestivalDay[] = [
  {
    "day": 1,
    "blocks": [
      {
        "title": "Opening Night Shorts",
        "movieKeys": [],
        "time": "7:00 PM EST",
        "id": "day1-block1"
      }
    ],
    "date": "Friday, August 2026"
  }
];
