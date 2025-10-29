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
    "rating": 8.8
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
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Almas+Vows+-+Alana+Hill.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's+vows+poster+remake+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's+vows+poster+remake+.png",
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
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
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
    "likes": 0,
    "rating": 9.2
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
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
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
    "likes": 0
  },
  "finallycaught": {
    "key": "finallycaught",
    "title": "Finally Caught",
    "synopsis": "Finally Caught plunges viewers into the heart of a young woman's secret struggle with an eating disorder.",
    "cast": [
      {
        "name": "Michelle Reale-Opalesky",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
      },
      {
        "name": "Cathrine Tillotson",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Cathrine Tillotson is a driven actor with a passion for performing. They possess a strong stage presence and a natural connection with audiences. Eager to learn and grow, they strive to bring compelling characters to life.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Sarah Morrison-Cleary",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/(Copy)+Finally+Caught_FC3.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/finally+caught+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/FinallyCaught.png",
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
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Isabelle Dessalines, an aspiring actor, brings a captivating blend of mystery and innocence to her characters through her quiet and thoughtful performances on stage and screen.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Anh Nguyen",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/I+Loveyou+in+black+Theatrical+cut.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/I+love+You-Black.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/I+love+You-Black.png",
    "likes": 0
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
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      },
      {
        "name": "Joshua Daniel",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png"
      }
    ],
    "director": "Joshua Daniel",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/Hair+TrailerMP4.MP4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/HAIR.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/Hair+poster+209+X+209++(2).jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Hair.png",
    "likes": 0
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
    "likes": 0
  },
  "youvsthem": {
    "key": "youvsthem",
    "title": "You Vs Them",
    "synopsis": "While on a seemingly promising first date, Sasha finds her mind drifting back to a parade of disastrous past relationships. Each awkward moment with her current suitor triggers a flashback.",
    "cast": [
      {
        "name": "Joshua Daniel",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png"
      },
      {
        "name": "Darrah Lashley",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png",
        "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg"
      }
    ],
    "director": "Joshua Daniel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/youVs+Them.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/You+Vs+Them.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/YouVsThem.png",
    "likes": 0
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
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn+poster+remake+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn+poster+remake+.png",
    "likes": 0
  },
  "streeteatstheboot": {
    "key": "streeteatstheboot",
    "title": "Street Eats The Boot",
    "synopsis": "A captivating documentary that explores the vibrant world of Central Louisiana food trucks.",
    "cast": [
      {
        "name": "Austin Williams",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": " Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Ashley Harrison",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Andrew W Trimble",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Street+Eats+THE+BOOT-A+Louisiana+Food+Truck+Journey.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/street+Eats+the+Boot+trailer+overlay++(1).jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/street+Eats+the+Boot+trailer+overlay++(1).jpeg",
    "likes": 0
  },
  "silentlove": {
    "key": "silentlove",
    "title": "Silent Love",
    "synopsis": "Unspoken feelings have kept Vicky and Toby in the friend zone forever. Their relationship faces a turning point when Toby takes a step towards a future without Vicky.",
    "cast": [
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Joshua Daniel",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png"
      }
    ],
    "director": "Salome Denoon",
    "trailer": "https://cratetelevision.s3.amazonaws.com/SilentLoveTrailer.mp4",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/SilentLove+Movie+05.14.2024-1+2.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/silent+Love++poster+remake+.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/SilentLove.png",
    "likes": 0
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
    "likes": 0,
    "rating": 9.5
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
    "likes": 15
  },
  "wrapitup": {
    "key": "wrapitup",
    "title": "Wrap It Up",
    "synopsis": "A passive-aggressive war unfolds between Mark, the supporting actor, and the director. Their every line and directorial choice is a thinly veiled barb.",
    "cast": [
      {
        "name": "Akil Logan-Haye",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png",
        "bio": "Akil Logan-Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png"
      },
      {
        "name": "Brooke Storms",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": " Information regarding this actor is currently unavailable",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Jordan Fox",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Jordan Fox is a dynamic force in the film industry, seamlessly transitioning between captivating on-screen performances and visionary directorial roles.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Jordan Fox, Darrah Lashley ",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
    "likes": 12
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
    "director": "Akil Logan-Haye",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/CROSSROADS-OFFICIAL-FILM_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/crossroads(Mobile+Video).jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Crossroads.png",
    "likes": 12
  },
   "consumed": {
    "key": "consumed",
    "title": "Consumed",
    "synopsis": "She gave everything to make her love complete, but a woman learns that her monumental act of self-sacrifice wasn't a noble gesture; it was the final permission her toxic relationship needed to devour her.<br/><br/>Coming October 31st.",
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
    "director": "Richard Frohman",
    "trailer": "",
    "fullMovie": "",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed+Poster.JPG",
    "likes": 0,
    "releaseDateTime": "2024-10-31T12:00:00Z"
  },
  "fatherdaughterdance": {
    "key": "fatherdaughterdance",
    "title": "Father Daughter Dance",
    "synopsis": "A father and daughter confront past choices and their lingering impact.",
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
    "likes": 12
  },
  "itsinyou": {
    "key": "itsinyou",
    "title": "It's In You",
    "synopsis": "A problematic pastor must fight for his life when he is invaded by a violent and vengeful spirit.",
    "cast": [
      {
        "name": "",
        "photo": "",
        "bio": " Information regarding cast is currently unavailable",
        "highResPhoto": ""
      }
    ],
    "director": "Robert Graves",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+trailer.mov",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Its+In+You.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+poster+jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/ItsInYou.png",
    "likes": 1
  },
  "unhinged": {
    "key": "unhinged",
    "title": "Unhinged",
    "synopsis": "",
    "cast": [
      {
        "name": "",
        "photo": "",
        "bio": " Information regarding this actor is currently unavailable",
        "highResPhoto": ""
      }
    ],
    "director": "Robert Graves",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+Unhinged-+A+film+by+Robert+Graves+%26+Philaye+Films.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+unhinged+Movie+poster+.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/The+unhinged+Movie+poster+.JPG",
    "likes": 0
  },
  "smirk": {
    "key": "smirk",
    "title": "Smirk",
    "synopsis": "Consumed by the pain of his failing marriage, a man retreats into a dream world where divorce is his only solace.",
    "cast": [
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Vigneshwar Raju",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Vingneshwar+Raju.JPG",
        "bio": "Driven by experimental cinema, Vigneshwar Raju, an actor-director, seeks to dissolve the lines between reality and imagination. His work delves into the depths of human experience through innovative visual storytelling.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Vingneshwar+Raju.JPG"
      }
    ],
    "director": "Vigneshwar Raju",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk+poster+.png",
    "likes": 10
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
    "likes": 0
  },
  "newmovie1756486933392": {
    "key": "newmovie1756486933392",
    "title": "Power Trip ",
    "synopsis": "A Traffic stop goes terribly bad.",
    "cast": [
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award-winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
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
    "title": "Strange Encounters ",
    "synopsis": " A black man experiences some strange encounters on his daily jog.",
    "cast": [
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award-winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG"
      },
      {
        "name": "Sarah Morrison-Cleary",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Christian Valentin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Bubacarr Sarge",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/STRANGE+ENCOUNTERS+Bubacarr+Sarge.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Webapp+posters/Strange+ENcounters.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/strange+Encounters+instant+tv.+poster.png",
    "likes": 0
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
    "likes": 0
  },
  "newmovie1756741314485": {
    "key": "newmovie1756741314485",
    "title": "What If ",
    "synopsis": "Desperately seeking love and a date for her cousin's wedding, Sophia bypasses the usual suspects and takes a wild chance on a psychic medium.",
    "cast": [
      {
        "name": "Salome Denoon",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png",
        "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
      },
      {
        "name": "Joshua Daniel",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award-winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG"
      },
      {
        "name": "Michelle Reale-Opalesky",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
      },
      {
        "name": "Kayla McFarlane",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Jalina Wayser ",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/What+If++The+Movie.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/I+love+you+black.+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/what+If+poster+for+instant+tv+(1920+x+1080+px)+(1925+x+1085+px)+(1920+x+1080+px).png",
    "likes": 0
  },
  "results": {
    "key": "results",
    "title": "Results",
    "synopsis": "Confined to a sterile medical waiting room, three women await life-altering results—but only one of them seems to have a handle on everything. A short film created for the Playhouse West-Philadelphia 3-3-3 film festival.",
    "cast": [
      {
        "name": "Michelle Reale-Opalesky",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
      },
      {
        "name": "Sarah Morrison-Cleary",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Kate Holt",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Michelle Reale-Opalesky",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.png",
    "likes": 0
  },
  "slap": {
    "key": "slap",
    "title": "Slap",
    "synopsis": "One unforgettable night of debauchery, poor decisions,  comes to an abrupt, stinging end with a single, perfectly-timed SLAP.",
    "cast": [
      {
        "name": "Shaunpaul Costello",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Seth Sharpe",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Alana Hill",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png",
        "bio": "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png"
      },
      {
        "name": "Tev",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Daniel J. River",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Eric Brizuela",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Ajinkya Dhage",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ+Photo.png",
        "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj+bio+photo.png"
      }
    ],
    "director": "Shaunpaul Costello, Seth Sharpe",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/SLAP+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "likes": 0
  },
  "theneighbours": {
    "key": "theneighbours",
    "title": " Neighbours",
    "synopsis": "A comedic drama with a dark twist.",
    "cast": [
      {
        "name": "Auden Wyle",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Julia Davo",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Shaunpaul Costello",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      }
    ],
    "director": "Seth Sharpe",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/NEIGHBORS+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "likes": 0
  },
  "twopeasinapod": {
    "key": "twopeasinapod",
    "title": "Two Peas in a Pod",
    "synopsis": "If you want to smoke with the big dogs, you have to bark with the big dogs first.",
    "cast": [
      {
        "name": "Shaunpaul Costello",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Cal Plohoros",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Tevin La'Vea",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      }
    ],
    "director": "Shaunpaul Costello",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+in+a+Pod.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
    "likes": 0
  },
  "tedandnatalie": {
    "key": "tedandnatalie",
    "title": "Ted and Natalie",
    "synopsis": "A loving boyfriend confronts his avoidant girlfriend after multiple failed attempts to be seen together in public.",
    "cast": [
      {
        "name": "Dana Godfrey",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Patrick Thomas Kasey",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      }
    ],
    "director": "Michelle M. Williams",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Natalie.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "likes": 0
  },
  "atriptothemoon": {
    "key": "atriptothemoon",
    "title": "A Trip to the Moon",
    "synopsis": "A group of astronomers go on an expedition to the Moon in a capsule that is propelled by a giant cannon. A classic silent film from 1902.",
    "cast": [
      {
        "name": "Georges Méliès",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png",
        "bio": "Georges Méliès was a French illusionist and film director who led many technical and narrative developments in the earliest days of cinema.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png"
      }
    ],
    "director": "Georges Méliès",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/A+Trip+to+the+Moon+-+the+1902+Science+Fiction+Film+by+Georges+Me%CC%81lie%CC%80s+-+Open+Culture+(480p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "likes": 0,
    "releaseDateTime": "1902-09-01T12:00:00Z"
  },
  "suspense": {
    "key": "suspense",
    "title": "Suspense",
    "synopsis": "A woman home alone with her baby is terrorized by a tramp trying to break in. This 1913 silent film is notable for its innovative use of split-screen.",
    "cast": [
      {
        "name": "Lois Weber",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg",
        "bio": "Lois Weber was an American silent film actress, screenwriter, producer, and director, considered one of the most important and prolific female filmmakers in the early era of American cinema.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg"
      }
    ],
    "director": "Lois Weber, Phillips Smalley",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense.+(Rex+Motion+Picture+Co.+US+1913).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "likes": 0,
    "releaseDateTime": "1913-07-06T12:00:00Z"
  },
  "thepawnshop": {
    "key": "thepawnshop",
    "title": "The Pawnshop",
    "synopsis": "As a pawnbroker's assistant, the Tramp creates chaos, clashing with his coworker, flirting with the pawnbroker's daughter, and dealing with eccentric customers.",
    "cast": [
      // FIX: Added missing 'bio' and 'highResPhoto' properties to complete the Actor type.
      {
        "name": "Charlie Chaplin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg",
        "bio": "Sir Charles Spencer \"Charlie\" Chaplin KBE was an English comic actor, filmmaker, and composer who rose to fame in the era of silent film. He became a worldwide icon through his screen persona, the Tramp.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg"
      }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie+Chaplin+-+The+Pawnshop+(1916).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+pawnshop+poster+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+pawnshop+poster+.jpeg",
    "likes": 0,
    "releaseDateTime": "1916-10-02T12:00:00Z"
  },
  "theimmigrant": {
    "key": "theimmigrant",
    "title": "The Immigrant",
    "synopsis": "Charlie, an immigrant, endures a challenging voyage to the United States, only to fall for a beautiful woman. He then finds himself penniless and must find a way to pay for their meal.",
    "cast": [
      {
        "name": "Charlie Chaplin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg",
        "bio": "Sir Charles Spencer \"Charlie\" Chaplin KBE was an English comic actor, filmmaker, and composer who rose to fame in the era of silent film. He became a worldwide icon through his screen persona, the Tramp.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg"
      }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie+Chaplin+-+The+Immigrant+(1917).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+immigrant+poster+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+immigrant+poster+.jpeg",
    "likes": 0,
    "releaseDateTime": "1917-06-17T12:00:00Z"
  },
  "thefallofthehouseofusher": {
    "key": "thefallofthehouseofusher",
    "title": "The Fall of the House of Usher",
    "synopsis": "An avant-garde horror film based on the short story by Edgar Allan Poe. A traveler arrives at the Usher mansion to find the sibling inhabitants gripped by a mysterious illness.",
    "cast": [
      {
        "name": "Jean Epstein",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Jean_Epstein_circa_1930.jpg",
        "bio": "Jean Epstein was a French filmmaker, film theorist, literary critic, and novelist. Although he is remembered today primarily for his films, his writings of the 1920s were influential.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Jean_Epstein_circa_1930.jpg"
      }
    ],
    "director": "Jean Epstein",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The+Fall+of+the+House+of+Usher+(1928)+-+SILENT+HORROR.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+fall+of+the+house+of+usher+poster.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+fall+of+the+house+of+usher+poster.jpg",
    "likes": 0,
    "releaseDateTime": "1928-10-05T12:00:00Z"
  },
  "unchienandalou": {
    "key": "unchienandalou",
    "title": "Un Chien Andalou",
    "synopsis": "A seminal work of the Surrealist movement, this 1929 silent short film by Luis Buñuel and Salvador Dalí is a dream-like sequence of shocking and memorable images.",
    "cast": [
      {
        "name": "Luis Buñuel",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Luis_Bun%CC%83uel.jpg",
        "bio": "Luis Buñuel Portolés was a Spanish-Mexican filmmaker who worked in France, Mexico, and Spain. He was a leading figure in Surrealism, a movement in art and literature.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Luis_Bun%CC%83uel.jpg"
      }
    ],
    "director": "Luis Buñuel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou+(1929)+-+Luis+Bun%CC%83uel+%26+Salvador+Dali%CC%81.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/un+chien+andalou.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/un+chien+andalou.jpg",
    "likes": 0,
    "releaseDateTime": "1929-06-06T12:00:00Z"
  },
  "meshesofafternoon": {
    "key": "meshesofafternoon",
    "title": "Meshes of the Afternoon",
    "synopsis": "A key work of American experimental cinema. A woman's dream-like experiences inside a house are repeated and altered, blurring the lines between reality and imagination.",
    "cast": [
      {
        "name": "Maya Deren",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Maya_Deren.jpg",
        "bio": "Maya Deren was a Ukrainian-born American experimental filmmaker and an important promoter of the avant-garde in the 1940s and 1950s. Deren was also a choreographer, dancer, film theorist, poet, lecturer, writer, and photographer.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Maya_Deren.jpg"
      }
    ],
    "director": "Maya Deren, Alexander Hammid",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes+of+the+Afternoon+(1943)+-+Maya+Deren.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/meshes+of+afternoon.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/meshes+of+afternoon.jpeg",
    "likes": 0,
    "releaseDateTime": "1943-01-01T12:00:00Z"
  },
// FIX: Add missing 'bridelessgroom' movie object to conform to the Movie type and resolve type errors.
  "bridelessgroom": {
    "key": "bridelessgroom",
    "title": "Brideless Groom",
    "synopsis": "A physical comedy from The Three Stooges. Shemp must get married before 6 o'clock to inherit a fortune.",
    "cast": [
      {
        "name": "Shemp Howard",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Shemp.jpg",
        "bio": "Shemp Howard was an American actor and comedian, best known as a member of the comedy team The Three Stooges.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Shemp.jpg"
      }
    ],
    "director": "Edward Bernds",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Brideless+Groom+(1947)+-+The+Three+Stooges.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/brideless+groom.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/brideless+groom.jpg",
    "likes": 0,
    "releaseDateTime": "1947-09-11T12:00:00Z"
  }
};

// FIX: Export festival and about data to be used as fallbacks throughout the application.
export const festivalData: FestivalDay[] = [
    {
      day: 1,
      date: "Saturday, October 26th",
      blocks: [
        {
          id: "day1-block1",
          title: "Film Block #1",
          time: "1:00 PM EST",
          movieKeys: [
            "newmovie1756487626529", // Strange Encounters
          ],
        },
        {
          id: "day1-block2",
          title: "Film Block #2",
          time: "2:30 PM EST",
          movieKeys: [
             "newmovie1756501125076", // of Bees and Boobs
          ],
        },
      ],
    },
    {
        day: 2,
        date: "Sunday, October 27th",
        blocks: [
            {
                id: "day2-block1",
                title: "Film Block #3",
                time: "5:00 PM EST",
                movieKeys: [
                    "newmovie1756487215116", // Fling
                    "newmovie1756487390550", // I Still Love Her
                ]
            },
            {
                id: "day2-block2",
                title: "Film Block #4",
                time: "6:30 PM EST",
                movieKeys: [
                    "newmovie1756485973547", // Burst
                    "newmovie1756486933392", // Power Trip
                ]
            }
        ]
    }
];

export const festivalConfigData: FestivalConfig = {
  title: "Playhouse West-Philadelphia Film Festival",
  description: "The 12th Annual PWFF showcases the best short films from emerging and established filmmakers. Join us for a weekend of cinematic excellence and support independent art.",
  isFestivalLive: false,
};

export const aboutData: AboutData = {
    missionStatement: "To cultivate a thriving ecosystem for independent filmmakers by providing a premier platform for distribution, community engagement, and financial empowerment.",
    story: "Founded in the heart of Philadelphia, Crate TV emerged from a simple yet powerful idea: to give independent filmmakers the spotlight they deserve. We started as a small project among artists at Playhouse West-Philadelphia, frustrated by the barriers of traditional distribution. Today, we are a growing global platform dedicated to showcasing unique voices and untold stories.<br/><br/>Our model is built on fairness and transparency. We believe that artists should be directly rewarded for their work. Through our innovative support system, viewers can directly contribute to the filmmakers they admire, ensuring that the revenue goes to the creators who pour their hearts into their craft.",
    belief1Title: "Art Over Algorithm",
    belief1Body: "We curate films based on artistic merit and storytelling, not just what's trending. Our goal is to connect you with films you'll love, not just films you'll watch.",
    belief2Title: "Empower Creators",
    belief2Body: "We provide filmmakers with tools, analytics, and a direct revenue stream, giving them the freedom to continue creating bold and original work.",
    belief3Title: "Community-Centric",
    belief3Body: "Crate TV is more than a streaming service; it's a community. We connect filmmakers with audiences and each other, fostering collaboration and celebrating the art of film.",
    founderName: "Tony Savant",
    founderTitle: "Founder, Crate TV | Artistic Director, Playhouse West-Philadelphia",
    founderBio: "With decades of experience as an actor, director, and teacher, Tony Savant has dedicated his career to nurturing artistic talent. As the founder of Crate TV and the head of Playhouse West-Philadelphia, he continues to champion the independent spirit and provide a stage for the next generation of storytellers.",
    founderPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/about/tony-savant.jpg"
};
