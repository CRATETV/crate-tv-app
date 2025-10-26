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
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/Almas+Vows+-+Alana+Hill.mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/Alma%27s+vows+poster+remake+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/AlmasVows.png",
    "likes": 0,
    durationInMinutes: 12,
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
    durationInMinutes: 18,
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
    "likes": 0,
    durationInMinutes: 15,
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
    "likes": 0,
    durationInMinutes: 8,
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
    "synopsis": "While on a seemingly promising first date, Sasha finds her mind drifting back to a parade of disastrous past relationships. Each awkward moment with her current date triggers a hilarious and cringe-worthy flashback, forcing her to confront her romantic baggage head-on.",
    "cast": [
        {
            "name": "Michelle Reale-Opalesky",
            "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
            "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
            "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
        },
        {
            "name": "Akil Logan Haye",
            "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png",
            "bio": "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.",
            "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png"
        }
    ],
    "director": "Sarah Morrison-Cleary",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.amazonaws.com/YOU+VS+THEM+(1).mp4",
    "poster": "https://cratetelevision.s3.amazonaws.com/You+VS+them+poster.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/YouvsThem.png",
    "likes": 0,
    "durationInMinutes": 10
  },
  "results": {
    "key": "results",
    "title": "Results",
    "synopsis": "A desperate actor takes a job as a simulated patient to help a medical student practice her bedside manner. But as the lines between performance and reality blur, he finds himself confronting a diagnosis that hits too close to home.<br/><br/>Trivia: Results was awarded Best Picture at the 2024 Playhouse West-Philadelphia Film Festival.",
    "cast": [
      {
        "name": "Ajinkya Dhage",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ+Photo.png",
        "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj+bio+photo.png"
      },
      {
        "name": "Michelle Reale-Opalesky",
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg",
        "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg"
      }
    ],
    "director": "Ajinkya Dhage",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results+Trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results+poster.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Results.png",
    "likes": 0,
    "durationInMinutes": 20
  },
  "streeteatstheboot": {
    "key": "streeteatstheboot",
    "title": "Street Eats: The Boot",
    "synopsis": "A man's quest to find the best cheesesteak in Philadelphia takes an unexpected turn when he stumbles upon a food truck that claims to have a secret, centuries-old recipe. As he delves deeper, he uncovers a passionate, quirky community of food lovers and the rich history behind the city's most iconic dish.",
    "cast": [
      {
        "name": "David R. garr",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+R.+garr.png",
        "bio": "David R. garr is a filmmaker with a talent for capturing authentic stories. He creates compelling documentaries that resonate with audiences.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+R.+garr.png"
      }
    ],
    "director": "David R. garr",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/Street+Eats+the+boot+Trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Street+Eats-+The+Boot+Documentary.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Street+eats+the+boot.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/streeteats.png",
    "likes": 0
  },
  "autumn": {
    "key": "autumn",
    "title": "Autumn",
    "synopsis": "As a young woman grapples with the impending loss of her beloved grandmother to dementia, she discovers a collection of old letters and photographs that reveal a hidden chapter of her grandmother's past. Through these memories, she finds a new way to connect with the woman she's losing and a deeper understanding of her own identity.",
    "cast": [
      {
        "name": "Oskar Pierre Castro",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      }
    ],
    "director": "Oskar Pierre Castro",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn+Poster.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Autumn.png",
    "likes": 0
  },
  "juniper": {
    "key": "juniper",
    "title": "Juniper",
    "synopsis": "A celebrated novelist, haunted by a past trauma, retreats to a remote cabin to write her next book. But as she struggles with writer's block, she's visited by a mysterious young woman who seems to know everything about her. Is she a muse, a memory, or something far more sinister?",
    "cast": [
      {
        "name": "Jessica Gall",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
        "bio": "Information regarding this actor is currently unavailable.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
      },
      {
        "name": "Sarah Morrison-Cleary",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Sarah+Morrison-Cleary.png",
        "bio": "Sarah Morrison-Cleary is an actor and filmmaker whose work is characterized by its emotional honesty and depth. She brings a thoughtful and nuanced approach to every project.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Sarah+Morrison-Cleary.png"
      }
    ],
    "director": "Sarah Morrison-Cleary",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper+trailer.mp4",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper+poster.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Juniper.png",
    "likes": 0
  },
    "wrapitup": {
    "key": "wrapitup",
    "title": "Wrap It Up",
    "synopsis": "A passive-aggressive war unfolds between Mark, the supporting actor, and the director. Their every line and directorial choice is a thinly veiled barb.",
    "cast": [
      {
        "name": "Akil Logan Haye",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png",
        "bio": "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png"
      },
      { "name": "Brooke Storms", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": " Information regarding this actor is currently unavailable", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Jordan Fox", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Jordan Fox is a dynamic force in the film industry, seamlessly transitioning between captivating on-screen performances and visionary directorial roles.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Jordan Fox, Darrah Lashley ",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up+.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
    "likes": 12
  },
  "twopeasinapod": {
    "key": "twopeasinapod",
    "title": "Two Peas in a Pod",
    "synopsis": "If you want to smoke with the big dogs, you have to bark with the big dogs first.",
    "cast": [
      { "name": "Shaunpaul Costello", "photo": "", "bio": "", "highResPhoto": "" },
      { "name": "Cal Plohoros", "photo": "", "bio": "", "highResPhoto": "" },
      { "name": "Tevin La'Vea", "photo": "", "bio": "", "highResPhoto": "" }
    ],
    "director": "Shaunpaul Costello",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+in+a+Pod.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
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
  "drive": {
    "key": "drive",
    "title": "Drive",
    "synopsis": "Two siblings take a journey that could change the trajectory of their lives.",
    "cast": [
      { "name": "Ellicia Clayton", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Bubacarr Sarge", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG", "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG" },
      { "name": "Ed Aristone", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ed+Aristone+.webp", "bio": "Ed Aristone, an award-winning actor and Playhouse West-Philadelphia associate teacher, with extensive film and stage experience alongside directing and producing, emphasizes dedicated role research and collaborative passion, driven by a belief in acting as a gift to inspire humanity.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ed+Aristone+.webp" }
    ],
    "director": "Shamira Womack",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+(2).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+Poster.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+Poster.jpeg",
    "likes": 15
  },
  "crossroads": {
    "key": "crossroads",
    "title": "Crossroads",
    "synopsis": "Post-dinner tensions expose devastating secrets, imploding a couple's relationship.",
    "cast": [
      { "name": "Shamira Womack", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg", "bio": "Shamira Womack is a dynamic and multifaceted talent, carving a unique space in the world of film. As an actor, writer, director, and filmmaker, Womack demonstrates a remarkable versatility and a deep commitment to the craft of storytelling", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg" },
      { "name": "Lam Wonkeryor", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": " Information regarding this actor is currently unavailable", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Akil Logan Haye",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/CROSSROADS-OFFICIAL-FILM_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/crossroads(Mobile+Video).jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Crossroads.png",
    "likes": 12
  },
  "fatherdaughterdance": {
    "key": "fatherdaughterdance",
    "title": "Father Daughter Dance",
    "synopsis": "A father and daughter confront past choices and their lingering impact.",
    "cast": [
      { "name": "Charles Ellis Washington", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG", "bio": "Charles Ellis Washington is an actor who brings a controlled intensity and smooth presence to his work in film and theater, creating memorable performances.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG" },
      { "name": "Sylvette Mikel", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": " Information regarding this actor is currently unavailable", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Charles Ellis Washington",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/father+daughter+dance.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Father+Daughter+Dance+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Father+Daughter+Dance+.png",
    "likes": 12
  },
  "theneighbours": {
    "key": "theneighbours",
    "title": " Neighbours",
    "synopsis": "A comedic drama with a dark twist.",
    "cast": [
      { "name": "Auden Wyle", "photo": "", "bio": "", "highResPhoto": "" },
      { "name": "Julia Davo", "photo": "", "bio": "", "highResPhoto": "" },
      { "name": "Shaunpaul Costello", "photo": "", "bio": "", "highResPhoto": "" }
    ],
    "director": "Seth Sharpe",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/NEIGHBORS+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "likes": 0
  },
  "tedandnatalie": {
    "key": "tedandnatalie",
    "title": "Ted and Natalie",
    "synopsis": "A chance encounter between two strangers, Ted and Natalie, sparks an immediate and intense connection, but their time together is fleeting.",
    "cast": [
      { "name": "Salome Denoon", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
      { "name": "David Auspitz", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+A.png", "bio": "David Auspitz is a versatile actor with a knack for both comedic and dramatic roles. He brings a unique charm to every character he portrays, making him a beloved figure in the industry.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+A.png" }
    ],
    "director": "David Auspitz",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Natalie.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "likes": 0
  },
  "slap": {
    "key": "slap",
    "title": "Slap",
    "synopsis": "One unforgettable night of debauchery, poor decisions,  comes to an abrupt, stinging end with a single, perfectly-timed SLAP.",
    "cast": [
      { "name": "Shaunpaul Costello", "photo": "", "bio": "", "highResPhoto": "" },
      { "name": "Seth Sharpe", "photo": "", "bio": "", "highResPhoto": "" },
      { "name": "Alana Hill", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png", "bio": "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png" },
      { "name": "Tev", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Daniel J. River", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Eric Brizuela", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Ajinkya Dhage", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ+Photo.png", "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj+bio+photo.png" }
    ],
    "director": "Shaunpaul Costello, Seth Sharpe",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/SLAP+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "likes": 0
  },
  "itsinyou": {
    "key": "itsinyou",
    "title": "It's In You",
    "synopsis": "A problematic pastor must fight for his life when he is invaded by a violent and vengeful spirit.",
    "cast": [
      { "name": "Robert Graves", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": " Information regarding this actor is currently unavailable", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Robert Graves",
    "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+trailer.mov",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Its+In+You.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+poster+jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/ItsInYou.png",
    "likes": 1
  },
  "smirk": {
    "key": "smirk",
    "title": "Smirk",
    "synopsis": "Consumed by the pain of his failing marriage, a man retreats into a dream world where divorce is his only solace.",
    "cast": [
      { "name": "Salome Denoon", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
      { "name": "Vigneshwar Raju", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Vingneshwar+Raju.JPG", "bio": "Driven by experimental cinema, Vigneshwar Raju, an actor-director, seeks to dissolve the lines between reality and imagination. His work delves into the depths of human experience through innovative visual storytelling.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Vingneshwar+Raju.JPG" }
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
      { "name": "CJ Musial", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Navia Prezeau", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Sam Cortell", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Patrick Thomas Kasey", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
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
      { "name": "Catherine Tillotson", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Dave Piccinett", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Bubacarr Sarge", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Gina Hendricks", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Shamira Womack", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg", "bio": "Shamira Womack is a dynamic and multifaceted talent, carving a unique space in the world of film. As an actor, writer, director, and filmmaker, Womack demonstrates a remarkable versatility and a deep commitment to the craft of storytelling", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg" }
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
      { "name": "Bubacarr Sarge", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG", "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG" },
      { "name": "Joe Henderson", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Brian Campbell", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Abbie Allen", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
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
      { "name": "Rachel Poletick", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Amos Quoi", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
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
      { "name": "Patrick Thomas Kasey", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Savannah Sakaguchi", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
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
      { "name": "Bubacarr Sarge", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG", "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG" },
      { "name": "Sarah Morrison-Cleary", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Christian Valentin", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
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
      { "name": "Maya Orli Cohen", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Christian Valentin", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Eric Eisenstein", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
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
      { "name": "Salome Denoon", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", "bio": "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
      { "name": "Joshua Daniel", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png", "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png" },
      { "name": "Bubacarr Sarge", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG", "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG" },
      { "name": "Michelle Reale-Opalesky", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg", "bio": "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg" },
      { "name": "Kayla McFarlane", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Jalina Wayser ",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/What+If++The+Movie.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/I+love+you+black.+poster+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/iloveimg-resized+2/what+If+poster+for+instant+tv+(1920+x+1080+px)+(1925+x+1085+px)+(1920+x+1080+px).png",
    "likes": 0
  },
  "atriptothemoon": {
    "key": "atriptothemoon",
    "title": "A Trip to the Moon",
    "synopsis": "A group of astronomers go on an expedition to the Moon in a capsule that is propelled by a giant cannon. A classic silent film from 1902.",
    "cast": [ { "name": "Georges Méliès", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png", "bio": "Georges Méliès was a French illusionist and film director who led many technical and narrative developments in the earliest days of cinema.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Me%CC%81lie%CC%80s_portrait_(cropped).png" } ],
    "director": "Georges Méliès",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/A+Trip+to+the+Moon+-+the+1902+Science+Fiction+Film+by+Georges+Me%CC%81lie%CC%80s+-+Open+Culture+(480p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp",
    "likes": 0, "releaseDateTime": "1902-09-01T12:00:00Z"
  },
  "suspense": {
    "key": "suspense",
    "title": "Suspense",
    "synopsis": "A woman home alone with her baby is terrorized by a tramp trying to break in. This 1913 silent film is notable for its innovative use of split-screen.",
    "cast": [ { "name": "Lois Weber", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg", "bio": "Lois Weber was an American silent film actress, screenwriter, producer, and director, considered one of the most important and prolific female filmmakers in the early era of American cinema.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg" } ],
    "director": "Lois Weber, Phillips Smalley",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense.+(Rex+Motion+Picture+Co.+US+1913).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "likes": 0, "releaseDateTime": "1913-07-06T12:00:00Z"
  },
  "thepawnshop": {
    "key": "thepawnshop",
    "title": "The Pawnshop",
    "synopsis": "As a pawnbroker's assistant, the Tramp creates chaos, clashing with his coworker, flirting with the pawnbroker's daughter, and dealing with eccentric customers.",
    "cast": [
      { "name": "Charlie Chaplin", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg", "bio": "Sir Charles Spencer 'Charlie' Chaplin KBE was an English comic actor, filmmaker, and composer who rose to fame in the era of silent film.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg" },
      { "name": "Edna Purviance", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Edna Purviance was an American actress during the silent film era. She was the leading lady in many of Charlie Chaplin's early films.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ThePawnshop.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/'The_Pawnshop'.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/'The_Pawnshop'.jpg",
    "likes": 0, "releaseDateTime": "1916-10-02T12:00:00Z"
  },
  "theimmigrant": {
    "key": "theimmigrant",
    "title": "The Immigrant",
    "synopsis": "The Tramp is an immigrant who endures a challenging voyage and gets into trouble as soon as he arrives in America, where he falls for a beautiful young woman.",
    "cast": [
      { "name": "Charlie Chaplin", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg", "bio": "Sir Charles Spencer 'Charlie' Chaplin KBE was an English comic actor, filmmaker, and composer who rose to fame in the era of silent film.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg" },
      { "name": "Edna Purviance", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Edna Purviance was an American actress during the silent film era. She was the leading lady in many of Charlie Chaplin's early films.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The+Immigrant+(1917).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Immigrant_1917.JPG",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Immigrant_1917.JPG",
    "likes": 0, "releaseDateTime": "1917-06-17T12:00:00Z"
  },
  "thefallofthehouseofusher": {
    "key": "thefallofthehouseofusher",
    "title": "The Fall of the House of Usher",
    "synopsis": "Based on the story by Edgar Allan Poe, this avant-garde silent film depicts the tale of a brother and sister living in a decaying mansion.",
    "cast": [], "director": "James Sibley Watson, Melville Webber",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The-Fall-of-the-House-of-Usher-1928-Film-Guild_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+Fall+of+House+Of+Usher+.jpeg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+Fall+of+House+Of+Usher+.jpeg",
    "likes": 0, "releaseDateTime": "1928-10-28T12:00:00Z"
  },
  "unchienandalou": {
    "key": "unchienandalou",
    "title": "Un Chien Andalou",
    "synopsis": "A surrealistic classic from Luis Buñuel and Salvador Dalí, this film is a collection of shocking, dreamlike, and unforgettable images.",
    "cast": [], "director": "Luis Buñuel",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou+-+(1929)+-+(1080p+-+x265).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou.webp",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou.webp",
    "likes": 0, "releaseDateTime": "1929-06-06T12:00:00Z"
  },
  "meshesofafternoon": {
    "key": "meshesofafternoon",
    "title": "Meshes of the Afternoon",
    "synopsis": "A key work of American experimental cinema, this short film presents a woman's subjective, dream-like experience that spirals into a dark psychological narrative.",
    "cast": [ { "name": "Maya Deren", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Maya Deren was a Ukrainian-born American experimental filmmaker and an important promoter of the avant-garde in the 1940s and 1950s.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" } ],
    "director": "Maya Deren, Alexander Hammid",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes-of-the-Afternoon-4K-AI-Upscaling_720p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes_of_the_Afternoon_1.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes_of_the_Afternoon_1.png",
    "likes": 0, "releaseDateTime": "1943-01-01T12:00:00Z"
  },
  "bridelessgroom": {
    "key": "bridelessgroom",
    "title": "Brideless Groom",
    "synopsis": "A Three Stooges classic where Shemp inherits a fortune, but only if he can get married within a few hours. A frantic search for a bride ensues.",
    "cast": [ { "name": "Shemp Howard", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Shemp Howard was an American actor and comedian, best known as a member of the comedy trio the Three Stooges.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" } ],
    "director": "Edward Bernds",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/BridelessGroom720p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Bridelessgroom_1sht.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Bridelessgroom_1sht.jpg",
    "likes": 0, "releaseDateTime": "1947-09-11T12:00:00Z"
  }
};

export const aboutData: AboutData = {
  missionStatement: "To provide a dedicated platform for independent filmmakers to showcase their work and for audiences to discover unique, compelling stories outside of the mainstream.",
  story: "Crate TV was born from a simple idea: that great films are made everywhere, not just in Hollywood. We are a collective of actors, writers, and directors from Playhouse West-Philadelphia, one of the most respected acting schools in the country. We wanted to create a space where the incredible talent of our community and other independent artists could shine.<br/><br/>Our platform is more than just a streaming service; it's a community. We are dedicated to fostering a supportive environment for filmmakers and providing a curated, high-quality viewing experience for our audience.",
  belief1Title: "Art Over Algorithm",
  belief1Body: "We believe in human curation. Our content is selected by filmmakers, for film lovers, ensuring a diverse and quality library.",
  belief2Title: "Empowering Creators",
  belief2Body: "We provide a fair and transparent platform for artists to share their voice and connect with a global audience.",
  belief3Title: "Community Focused",
  belief3Body: "We are built by a community of artists, and we are committed to nurturing the next generation of storytellers.",
  founderName: "Salome Denoon",
  founderTitle: "Founder & Lead Developer",
  founderBio: "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.",
  founderPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png"
};

export const festivalConfigData: FestivalConfig = {
    title: "Playhouse West-Philadelphia Film Festival - 12th Annual",
    description: "Join us for a celebration of independent cinema, showcasing the incredible talent of our community and beyond. Discover your next favorite film and support emerging artists.",
    isFestivalLive: false
};

export const festivalData: FestivalDay[] = [
    {
        day: 1,
        date: "Saturday, August 24th",
        blocks: [
            {
                id: "day1-block1",
                title: "Opening Night Shorts",
                time: "7:00 PM EST",
                movieKeys: ["lifeless", "almasvows"]
            },
            {
                id: "day1-block2",
                title: "Comedy Block",
                time: "9:00 PM EST",
                movieKeys: ["foodiecalldirectorscut", "thatloud", "eharmonycs"]
            }
        ]
    },
    {
        day: 2,
        date: "Sunday, August 25th",
        blocks: [
            {
                id: "day2-block1",
                title: "Dramatic Features",
                time: "6:00 PM EST",
                movieKeys: ["iloveyoublack", "hair", "finallycaught"]
            },
            {
                id: "day2-block2",
                title: "Closing Night Selections",
                time: "8:30 PM EST",
                movieKeys: ["juniper", "consumed"]
            }
        ]
    }
];
