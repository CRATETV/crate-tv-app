import { Category, Movie, FestivalDay, FestivalConfig } from './types.ts';

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
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg",
        "bio": "A silent film actor known for his roles in suspense and drama films of the 1910s, often collaborating with director Lois Weber.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/LoisWeber.jpg"
      }
    ],
    "director": "Lois Weber, Phillips Smalley",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense.+(Rex+Motion+Picture+Co.+US+1913).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense+movie+poster+.jpeg",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Suspense_1913.jpg/800px-Suspense_1913.jpg",
    "likes": 0,
    "releaseDateTime": "1913-07-06T00:00"
  },
  "thepawnshop": {
    "key": "thepawnshop",
    "title": "The Pawnshop",
    "synopsis": "(1916) (20 mins) A classic Charlie Chaplin silent comedy where he stars as a bumbling pawnshop assistant.<br/><br/><strong>Contribution to Modern Cinema:</strong> Famous for its inventive slapstick and balletic physical comedy, particularly the scene where Chaplin meticulously deconstructs and examines an alarm clock. It's a prime example of Chaplin's ability to create comedy from everyday objects and situations, a technique that has been a cornerstone of physical comedy ever since.",
    "cast": [
      {
        "name": "Charlie Chaplin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg",
        "bio": "An English comic actor, filmmaker, and composer who rose to fame in the era of silent film. He became a worldwide icon through his screen persona, 'The Tramp'.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg"
      }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ThePawnshop.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/'The_Pawnshop'.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Pawnshop.jpg",
    "likes": 0,
    "releaseDateTime": "1916-10-02T00:00"
  },
  "theimmigrant": {
    "key": "theimmigrant",
    "title": "The Immigrant",
    "synopsis": "(1917) (20 mins) A Charlie Chaplin comedy short that blends slapstick with social commentary.<br/><br/><strong>Contribution to Modern Cinema:</strong> The film is celebrated for its poignant portrayal of the immigrant experience, balancing humor with a touching depiction of the struggles and hopes of newcomers to America. Its ability to weave social themes into comedy influenced countless filmmakers and solidified the character of 'The Tramp' as a symbol of resilience for the common person.",
    "cast": [
      {
        "name": "Charlie Chaplin",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg",
        "bio": "An English comic actor, filmmaker, and composer who rose to fame in the era of silent film. He became a worldwide icon through his screen persona, 'The Tramp'.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Charlie_Chaplin_portrait.jpg"
      },
      {
        "name": "Edna Purviance",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/d/d7/Edna_Purviance_publicity_photo_for_The_Kid_1921.jpg",
        "bio": "An American actress during the silent film era. She was the leading lady in many of Charlie Chaplin's films, starring in over 30 productions with him.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/d/d7/Edna_Purviance_publicity_photo_for_The_Kid_1921.jpg"
      }
    ],
    "director": "Charlie Chaplin",
    "trailer": "",
    "fullMovie": "https://archive.org/download/CC_1917_06_17_TheImmigrant/CC_1917_06_17_TheImmigrant_512kb.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The_Immigrant_1917.JPG",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/The_Immigrant_%281917_film%29.jpg/800px-The_Immigrant_%281917_film%29.jpg",
    "likes": 0,
    "releaseDateTime": "1917-06-17T00:00"
  },
  "thefallofthehouseofusher": {
    "key": "thefallofthehouseofusher",
    "title": "The Fall of the House of Usher",
    "synopsis": "(1928) (13 mins) An American silent experimental horror film directed by James Sibley Watson and Melville Webber.<br/><br/><strong>Contribution to Modern Cinema:</strong> This avant-garde adaptation of Edgar Allan Poe's story is celebrated for its surreal, dreamlike atmosphere and innovative cinematography, including superimpositions, prism effects, and dramatic shadows. It rejected traditional narrative structure in favor of visual poetry, profoundly influencing the psychological horror genre and experimental filmmakers who sought to convey mood and internal states over linear plot.",
    "cast": [
      {
        "name": "Herbert Stern",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Fall_of_the_House_of_Usher_%281928%29_-_Roderick_Usher.jpg/800px-Fall_of_the_House_of_Usher_%281928%29_-_Roderick_Usher.jpg",
        "bio": "An actor known for his role as Roderick Usher in the 1928 experimental silent film 'The Fall of the House of Usher'.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Fall_of_the_House_of_Usher_%281928%29_-_Roderick_Usher.jpg/800px-Fall_of_the_House_of_Usher_%281928%29_-_Roderick_Usher.jpg"
      },
      {
        "name": "Hildegarde Watson",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Fall_of_the_House_of_Usher_%281928%29.jpg/800px-The_Fall_of_the_House_of_Usher_%281928%29.jpg",
        "bio": "An American actress and patron of the arts, best known for her role as Madeline Usher in the avant-garde film 'The Fall of the House of Usher'.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Fall_of_the_House_of_Usher_%281928%29.jpg/800px-The_Fall_of_the_House_of_Usher_%281928%29.jpg"
      }
    ],
    "director": "James Sibley Watson, Melville Webber",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The-Fall-of-the-House-of-Usher-1928-Film-Guild_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+Fall+of+House+Of+Usher+.jpeg",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/The_Fall_of_the_House_of_Usher_1928_poster.jpg/800px-The_Fall_of_the_House_of_Usher_1928_poster.jpg",
    "likes": 0,
    "releaseDateTime": "1928-10-29T00:00"
  },
  "unchienandalou": {
    "key": "unchienandalou",
    "title": "Un Chien Andalou",
    "synopsis": "(1929) (16 mins) Co-directed by Luis Buñuel and Salvador Dalí, this film is the quintessential surrealist short.<br/><br/><strong>Contribution to Modern Cinema:</strong> Its discontinuous narrative and shocking, dreamlike imagery (most famously, the eyeball-slicing scene) revolutionized what was possible in film. It rejected linear storytelling in favor of Freudian free association, pioneering a new cinematic language that continues to influence avant-garde, art-house, and even mainstream filmmakers who want to depict the subconscious.",
    "cast": [
      {
        "name": "Pierre Batcheff",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Pierre_Batcheff_Un_chien_andalou.jpg",
        "bio": "A Russian-born French actor, known for his lead role in the surrealist classic 'Un Chien Andalou' and for being a prominent figure in the French avant-garde cinema of the 1920s.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Pierre_Batcheff_Un_chien_andalou.jpg"
      },
      {
        "name": "Simone Mareuil",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Un_chien_andalou_04.jpg/800px-Un_chien_andalou_04.jpg",
        "bio": "A French actress best known for her role in Luis Buñuel and Salvador Dalí's surrealist film 'Un Chien Andalou', in which she appears in the film's most notorious scene.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Un_chien_andalou_04.jpg/800px-Un_chien_andalou_04.jpg"
      }
    ],
    "director": "Luis Buñuel, Salvador Dalí",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou+-+(1929)+-+(1080p+-+x265).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou.webp",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Un_chien_andalou_poster.jpg/800px-Un_chien_andalou_poster.jpg",
    "likes": 0,
    "releaseDateTime": "1929-06-06T00:00"
  },
  "meshesofafternoon": {
    "key": "meshesofafternoon",
    "title": "Meshes of the Afternoon",
    "synopsis": "(1943) (14 mins) Made by Maya Deren and Alexander Hammid, this influential experimental film uses a non-linear, fragmented narrative to explore a dreamlike state.<br/><br/><strong>Contribution to Modern Cinema:</strong> Its surreal style and use of jump cuts have influenced a wide range of filmmakers, from psychological thrillers to music videos, establishing a new visual language for representing the subconscious.",
    "cast": [
      {
        "name": "Maya Deren",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Maya_Deren.jpg/800px-Maya_Deren.jpg",
        "bio": "A Ukrainian-born American experimental filmmaker and a prominent figure in the 1940s and 1950s avant-garde, Deren was also a choreographer, dancer, film theorist, poet, lecturer, and writer.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Maya_Deren.jpg/800px-Maya_Deren.jpg"
      },
      {
        "name": "Alexander Hammid",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Alexander_Hammid_and_Maya_Deren_in_Meshes_of_the_Afternoon.jpg/800px-Alexander_Hammid_and_Maya_Deren_in_Meshes_of_the_Afternoon.jpg",
        "bio": "A Czech-born American photographer, film director, and cinematographer. He is known for his work in documentary and experimental film, and his collaboration with Maya Deren.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Alexander_Hammid_and_Maya_Deren_in_Meshes_of_the_Afternoon.jpg/800px-Alexander_Hammid_and_Maya_Deren_in_Meshes_of_the_Afternoon.jpg"
      }
    ],
    "director": "Maya Deren, Alexander Hammid",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes-of-the-Afternoon-4K-AI-Upscaling_720p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes_of_the_Afternoon_1.png",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/en/b/b8/Meshes_of_the_Afternoon_poster.jpg",
    "likes": 0,
    "releaseDateTime": "1943-01-01T00:00"
  },
  "bridelessgroom": {
    "key": "bridelessgroom",
    "title": "Brideless Groom",
    "synopsis": "(1947) (17 mins) A hilarious Three Stooges comedy short from Columbia Pictures.<br/><br/><strong>Contribution to Modern Cinema:</strong> It is a prime example of the fast-paced, violent slapstick comedy style of the era. As one of the many Three Stooges shorts whose copyright was not renewed, it became a television staple, introducing their unique brand of physical comedy to new generations and influencing countless comedy routines and films.",
    "cast": [
      {
        "name": "Shemp Howard",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Shemp_Howard_1947.jpg/800px-Shemp_Howard_1947.jpg",
        "bio": "An American actor and comedian, best known as a member of the comedy act The Three Stooges, known for his unique vocalizations and ad-libs.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Shemp_Howard_1947.jpg/800px-Shemp_Howard_1947.jpg"
      },
      {
        "name": "Moe Howard",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Moe_Howard_in_Disorder_in_the_Court.jpg/800px-Moe_Howard_in_Disorder_in_the_Court.jpg",
        "bio": "An American actor and comedian, known as the leader of The Three Stooges. His trademark bowl haircut and bossy, aggressive persona made him a comedy icon.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Moe_Howard_in_Disorder_in_the_Court.jpg/800px-Moe_Howard_in_Disorder_in_the_Court.jpg"
      },
      {
        "name": "Larry Fine",
        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Larry_Fine_in_Disorder_in_the_Court.jpg/800px-Larry_Fine_in_Disorder_in_the_Court.jpg",
        "bio": "An American comedian and actor, famous as a member of The Three Stooges. Known for his wild, frizzy hair and his role as the 'middleman' in the trio's antics.",
        "highResPhoto": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Larry_Fine_in_Disorder_in_the_Court.jpg/800px-Larry_Fine_in_Disorder_in_the_Court.jpg"
      }
    ],
    "director": "Edward Bernds",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/BridelessGroom720p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Bridelessgroom_1sht.jpg",
    "tvPoster": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Brideless_Groom_lobby_card.jpg/800px-Brideless_Groom_lobby_card.jpg",
    "likes": 0,
    "releaseDateTime": "1947-09-11T00:00"
  },
  "palmourstreet": {
    "key": "palmourstreet",
    "title": "Palmour Street",
    "synopsis": "(1949) (20 mins) A documentary short that provides a candid look into the lives of a Black family in Gainesville, Georgia.<br/><br/><strong>Contribution to Modern Cinema:</strong> The film's observational style and sensitive focus on the daily life and emotional well-being of an African American family was groundbreaking for its time, influencing the verité style of later documentary filmmakers and offering a rare, humanizing portrait of Black life in the Jim Crow South.",
    "cast": [
      {
        "name": "The Williams Family",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/palmour-street.jpg",
        "bio": "The film documents the everyday lives of the Williams family in Gainesville, Georgia, offering a poignant and realistic look at family dynamics and child-rearing within a Black community in the segregated South.",
        "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/palmour-street.jpg"
      }
    ],
    "director": "George Stoney",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Palmour-Street-A-Study-in-Family-Life-1957_360p.mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Palmour_Street_2.jpg",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/palmour-street.jpg",
    "likes": 0,
    "releaseDateTime": "1949-01-01T00:00"
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
    "likes": 0
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
    "likes": 0
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
    "poster": "https://cratetelevision.s3.amazonaws.com/you+vs+them+poster+.png",
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
    "poster": "https://cratetelevision.s3.amazonaws.com/Autumn+poster+remake+.png",
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Autumn.png",
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
    "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/StreetEats.png",
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
    "likes": 0
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
        "name": "Akil Logan Haye",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png",
        "bio": "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.",
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
    "likes": 1
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
    "title": "Burst",
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
    "title": "Power Trip",
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
    "title": "Fling",
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
    "title": "I Still Love Her",
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
    "title": "Strange Encounters",
    "synopsis": " A black man experiences some strange encounters on his daily jog.",
    "cast": [
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
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
    "title": "What If",
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
        "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png",
        "bio": "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.",
        "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png"
      },
      {
        "name": "Bubacarr Sarge",
        "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG",
        "bio": "Bubacarr Sarge is an award winning actor and filmmaker. A true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.",
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
  "ted-and-natalie": {
    "key": "ted-and-natalie",
    "title": "Ted and Natalie",
    "synopsis": "A loving boyfriend begins to doubt that his relationship can go the distance when he realizes that his dream girl has been strategically avoiding meeting his friends.\n",
    "cast": [
      {
        "name": "Patrick Thomas Kasey",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      },
      {
        "name": "Dana Godfrey",
        "photo": "",
        "bio": "",
        "highResPhoto": ""
      }
    ],
    "director": "Michelle M. Charles",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/TED+AND+NATALIE+-+Lotus+Blossom+Productions+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Ted+and+Nathalie+.JPG",
    "tvPoster": "",
    "likes": 0,
    "releaseDateTime": "2025-09-18T13:41",
    "mainPageExpiry": ""
  },
  "Neighbours": {
    "key": "Neighbours",
    "title": "Neighbours",
    "synopsis": "\"At the end of the day, do you really know who you live next to?\"",
    "cast": [],
    "director": "Seth Sharpe",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/NEIGHBORS+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Neighbors.png",
    "tvPoster": "",
    "likes": 0,
    "releaseDateTime": "2025-09-18T13:49",
    "mainPageExpiry": ""
  },
  "two-peas-in-a-pod": {
    "key": "two-peas-in-a-pod",
    "title": "Two Peas In A Pod",
    "synopsis": "TWO PEAS IN A POD is a comedic stoner buddy flick about trying to find the ultimate stoner. ",
    "cast": [],
    "director": "ShaunPaul Costello",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/TWO+PEAS+IN+A+POD+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Two+Peas+In+A+pod+.png",
    "tvPoster": "",
    "likes": 0,
    "releaseDateTime": "2025-09-18T13:54",
    "mainPageExpiry": ""
  },
  "slap": {
    "key": "slap",
    "title": "Slap",
    "synopsis": "",
    "cast": [],
    "director": "",
    "trailer": "",
    "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/SLAP+-+Shaunpaul+Costello+(1080p%2C+h264%2C+youtube).mp4",
    "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Slap.png",
    "tvPoster": "",
    "likes": 0,
    "releaseDateTime": "2025-09-18T13:58",
    "mainPageExpiry": ""
  }
};

export const festivalData: FestivalDay[] = [
  {
    "day": 1,
    "date": "Friday, Oct 25",
    "blocks": [
      {
        "id": "day1-block1",
        "title": "Dramatic Debuts",
        "time": "7:00 PM EST",
        "movieKeys": [
          "lifeless",
          "almasvows",
          "juniper"
        ]
      },
      {
        "id": "day1-block2",
        "title": "Comedic Chaos",
        "time": "8:30 PM EST",
        "movieKeys": [
          "foodiecalldirectorscut",
          "eharmonycs",
          "wrapitup"
        ]
      },
      {
        "id": "day1-block3",
        "title": "Unsettling Encounters",
        "time": "10:00 PM EST",
        "movieKeys": [
          "newmovie1756487626529",
          "smirk"
        ]
      }
    ]
  },
  {
    "day": 2,
    "date": "Saturday, Oct 26",
    "blocks": [
      {
        "id": "day2-block1",
        "title": "Relationship Riddles",
        "time": "6:00 PM EST",
        "movieKeys": [
          "newmovie1756487215116",
          "newmovie1756487390550",
          "silentlove"
        ]
      },
      {
        "id": "day2-block2",
        "title": "Cycles of Power",
        "time": "7:30 PM EST",
        "movieKeys": [
          "newmovie1756486933392",
          "hair",
          "iloveyoublack"
        ]
      },
      {
        "id": "day2-block3",
        "title": "Bold Visions",
        "time": "9:00 PM EST",
        "movieKeys": [
          "fatherdaughterdance",
          "crossroads",
          "drive"
        ]
      }
    ]
  },
  {
    "day": 3,
    "date": "Sunday, Oct 27",
    "blocks": [
      {
        "id": "day3-block1",
        "title": "Absurdity & Art",
        "time": "5:00 PM EST",
        "movieKeys": [
          "newmovie1756501125076",
          "newmovie1756485973547",
          "youvsthem"
        ]
      },
      {
        "id": "day3-block2",
        "title": "The Human Condition",
        "time": "6:30 PM EST",
        "movieKeys": [
          "autumn",
          "finallycaught",
          "intrusivethoughts"
        ]
      },
      {
        "id": "day3-block3",
        "title": "Spotlight Premiere",
        "time": "8:00 PM EST",
        "movieKeys": [
          "newmovie1756741314485"
        ]
      }
    ]
  }
];
