
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
    movieKeys: ['lifeless', 'consumed', 'foodiecalltheatricalcut', 'juniper']
  },
  newReleases: {
    title: 'New Releases',
    movieKeys: ['geminitimeservice', 'results', 'theneighbours', 'twopeasinapod', 'slap', 'tedandnatalie', 'itsinyou']
  },
  awardWinners: {
    title: 'Award-Winning Films',
    movieKeys: ['lifeless', 'iloveyoublack', 'hair', 'juniper']
  },
  pwff12thAnnual: {
    title: 'PWFF-12th Annual Selections',
    movieKeys: []
  },
  comedy: {
    title: 'Comedies',
    movieKeys: [
      'thatloud',
      'foodiecalltheatricalcut',
      'eharmonycs',
      'youvsthem',
      'wrapitup',
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
        { "name": "Cyan Zhong", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
        { "name": "Sumner Sykes", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
        { "name": "Sara Montse", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Cyan Zhong", "producers": "Cyan Zhong", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemini+Time+Service+-+xiani+zhong+(1080p%2C+h264%2C+youtube).mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemeni+Time+Service.JPG", "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Gemeni+Time+Service.JPG", "likes": 0
  },
  "results": {
    "key": "results", "title": "Results", "synopsis": "Confined to a sterile medical waiting room, three women await life-altering results—but only one of them seems to have a handle on everything. A short film created for the Playhouse West-Philadelphia 3-3-3 film festival.",
    "cast": [
        { "name": "Michelle Reale-Opalesky", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/michelle.png", "bio": "Michelle Reale-Opalesky is an actress and filmmaker who has been studying the Meisner technique at Playhouse West for eight years. She has written and produced numerous short films, a web series and a feature film.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/michelle.png"},
        { "name": "Sarah Morrison-Cleary", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
        { "name": "Kate Holt", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Michelle Reale-Opalesky", "trailer": "https://cratetelevision.s3.amazonaws.com/Results+Trailer.mp4", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results+.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.png", "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Results.png", "likes": 0
  },
  "consumed": {
    "key": "consumed", "title": "Consumed", "synopsis": "A woman who binges on true crime finds herself in a real life investigation when a relationship with a mysterious man takes a dark turn.",
    "cast": [
      { "name": "Michelle Reale-Opalesky", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/michelle.png", "bio": "Michelle Reale-Opalesky is an actress and filmmaker who has been studying the Meisner technique at Playhouse West for eight years. She has written and produced numerous short films, a web series and a feature film.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/michelle.png"},
      { "name": "Tony Luke Jr.", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Tony+Luke+Jr.png", "bio": "Tony Luke Jr. is an American restaurateur, actor, musician, and media personality who founded the cheesesteak franchise Tony Luke's.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Tony+Luke+Jr.png" },
      { "name": "Brian Anthony Wilson", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Brian+Anthony+Wilson.png", "bio": "Brian Anthony Wilson is a distinguished actor celebrated for his powerful performances, most notably as Detective Vernon Holley in the acclaimed HBO series 'The Wire.'", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Brian+Anthony+Wilson.png" }
    ],
    "director": "Michelle Reale-Opalesky", "producers": "Michelle Reale-Opalesky", "trailer": "https://cratetelevision.s3.us-east-1.amazonaws.com/consumed+trailer.mp4", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Consumed.mp4", "poster": "https://cratetelevision.s3.amazonaws.com/consumed+poster.png", "tvPoster": "https://cratetelevision.s3.amazonaws.com/consumed+poster.png", "likes": 0
  },
  "thatloud": {
    "key": "thatloud", "title": "That Loud", "synopsis":" A stoner comedy. This short film was created for the Playhouse West-Philadelphia 3-3-3 Film Festival.",
    "cast": [
      { "name": "Aatiq Simmons", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Richard Frohman", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
      { "name": "Lucie Paige Krovatin", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" }
    ],
    "director": "Oskar Pierre Castro", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/That+Loud+.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/That%20Loud.png", "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/That%20Loud.png", "likes": 0
  },
  "lifeless": {
    "key": "lifeless", "title": "Lifeless", "synopsis": "When Valerie uncovers a devastating truth, she is forced to confront her fears as she prepares to deliver a chilling report to her unsuspecting fiancé.<br/><br/>Trivia: Lifeless opened the 2023 Playhouse West-Philadelphia Film Festival.",
    "cast": [
      { "name": "Darrah Lashley", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah%20head%20shot.png", "bio": "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Darrah%20bio%20picjpg.jpg" },
      { "name": "Ajinkya Dhage", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ%20Photo.png", "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj%20bio%20photo.png" },
      { "name": "Kathryn Wylde", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png", "bio": "Kathryn Wylde is an emerging actor with a passion for storytelling, demonstrating their skills both on screen and behind the camera.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png" }
    ],
    "director": "Darrah Lashley", "trailer": "https://cratetelevision.s3.amazonaws.com/LifelessTrailer.mp4", "fullMovie": "https://cratetelevision.s3.amazonaws.com/LIFELESS.mp4", "poster": "https://cratetelevision.s3.amazonaws.com/Lifeless%20poster%20remake.jpg", "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/instant%20tv%20posters%20folder/Lifeless.png", "likes": 0, "rating": 8.8
  },
  "almasvows": {
    "key": "almasvows", "title": "Alma's Vows", "synopsis": "Alma struggles to move on after the death of her fiancé.",
    "cast": [
      { "name": "Alana Hill", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana%20Hill%202%20.png", "bio": "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana%20Hill%202%20.png" },
      { "name": "David Auspitz", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David%20A.png", "bio": "David Auspitz is a versatile actor with a knack for both comedic and dramatic roles. He brings a unique charm to every character he portrays, making him a beloved figure in the industry.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David%20A.png" },
      { "name": "Pratigya Paudel", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya%20Paudel.png", "bio": "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya%20Paudel.png" }
    ],
    "director": "Alana Hill", "trailer": "https://cratetelevision.s3.amazonaws.com/Almas+vow+cut+trailer.mp4", "fullMovie": "https://cratetelevision.s3.amazonaws.com/Almas%20Vows%20-%20Alana%20Hill.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's%20vows%20poster%20remake.png", "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's%20vows%20poster%20remake.png", "likes": 0
  },
  "foodiecalltheatricalcut": {
    "key": "foodiecalltheatricalcut", "title": "Foodie Call", "synopsis": "When a rideshare driver and a passenger find a mutual connection, the night takes an unexpected turn after they decide to get food.",
    "cast": [
      {"name": "Ajinkya Dhage", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/AJ%20Photo.png", "bio": "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Aj%20bio%20photo.png"},
      {"name": "Pratigya Paudel", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya%20Paudel.png", "bio": "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya%20Paudel.png"},
      {"name": "Reese Castaldi", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Reese.png", "bio": "Reese Castaldi is an actress based in Philadelphia.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Reese.png"}
    ],
    "director": "Ajinkya Dhage", "trailer": "https://cratetelevision.s3.amazonaws.com/Foodie+Call+Trailer.mp4", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+(Theatrical+Cut).mp4", "poster": "https://cratetelevision.s3.amazonaws.com/foodie+call+poster.png", "tvPoster": "https://cratetelevision.s3.amazonaws.com/foodie+call+poster.png", "likes": 0
  },
  "juniper": {
    "key": "juniper", "title": "Juniper", "synopsis": "A woman with a dark past revisits her childhood home to find that some things are best left forgotten.",
    "cast": [
      {"name": "Julia Quang", "photo": "https://cratetelevision.s3.amazonaws.com/photos+/Julia+Quang.png", "bio": "Julia Quang is an actress known for her roles in independent films that explore complex emotional landscapes.", "highResPhoto": "https://cratetelevision.s3.amazonaws.com/photos+/Julia+Quang.png"},
      {"name": "Ryan Messick", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ryan+Messick.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ryan+Messick.png"},
      {"name": "Carly Mento", "photo": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Carly+Mento.png", "bio": "Information regarding this actor is currently unavailable.", "highResPhoto": "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Carly+Mento.png"}
    ],
    "director": "Ryan Messick", "trailer": "", "fullMovie": "https://cratetelevision.s3.amazonaws.com/Juniper.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/juniper+poster.png", "tvPoster": "https://cratetelevision.s3.us-east-1.amazonaws.com/juniper+poster.png", "likes": 0
  },
  "theneighbours": { "key": "theneighbours", "title": "The Neighbours", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "twopeasinapod": { "key": "twopeasinapod", "title": "Two Peas in a Pod", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "slap": { "key": "slap", "title": "Slap", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "tedandnatalie": { "key": "tedandnatalie", "title": "Ted & Natalie", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "itsinyou": { "key": "itsinyou", "title": "It's In You", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "iloveyoublack": { "key": "iloveyoublack", "title": "I Love You Black", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "hair": { "key": "hair", "title": "Hair", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "eharmonycs": { "key": "eharmonycs", "title": "E-Harmony CS", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "youvsthem": { "key": "youvsthem", "title": "You vs. Them", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "wrapitup": { "key": "wrapitup", "title": "Wrap It Up", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "finallycaught": { "key": "finallycaught", "title": "Finally Caught", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "autumn": { "key": "autumn", "title": "Autumn", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "silentlove": { "key": "silentlove", "title": "Silent Love", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "drive": { "key": "drive", "title": "Drive", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "crossroads": { "key": "crossroads", "title": "Crossroads", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "fatherdaughterdance": { "key": "fatherdaughterdance", "title": "Father Daughter Dance", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "unhinged": { "key": "unhinged", "title": "Unhinged", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "streeteatstheboot": { "key": "streeteatstheboot", "title": "Street Eats the Boot", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "smirk": { "key": "smirk", "title": "Smirk", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "intrusivethoughts": { "key": "intrusivethoughts", "title": "Intrusive Thoughts", "synopsis": "Placeholder synopsis.", "cast": [], "director": "Unknown", "trailer": "", "fullMovie": "", "poster": "https://via.placeholder.com/400x600", "tvPoster": "" },
  "atriptothemoon": { "key": "atriptothemoon", "title": "A Trip to the Moon", "synopsis": "A group of astronomers go on an extraordinary journey to the moon.", "cast": [], "director": "Georges Méliès", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/A+Trip+to+the+Moon+(1902)+-+Georges+Méliès.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp", "tvPoster": "" },
  "suspense": { "key": "suspense", "title": "Suspense", "synopsis": "A thrilling tale of a woman, a tramp, and a chase, notable for its innovative use of split-screen.", "cast": [], "director": "Lois Weber & Phillips Smalley", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Suspense+(1913)+-+Lois+Weber+%26+Phillips+Smalley.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/suspense.jpg", "tvPoster": "" },
  "thepawnshop": { "key": "thepawnshop", "title": "The Pawnshop", "synopsis": "Charlie Chaplin causes chaos as a pawnbroker's assistant.", "cast": [], "director": "Charlie Chaplin", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The+Pawnshop+(1916)+-+Charlie+Chaplin.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+pawn+shop.jpg", "tvPoster": "" },
  "theimmigrant": { "key": "theimmigrant", "title": "The Immigrant", "synopsis": "An immigrant's voyage to America is filled with mishaps and romance.", "cast": [], "director": "Charlie Chaplin", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The+Immigrant+(1917)+-+Charlie+Chaplin.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+immigrant.jpg", "tvPoster": "" },
  "thefallofthehouseofusher": { "key": "thefallofthehouseofusher", "title": "The Fall of the House of Usher", "synopsis": "An experimental, atmospheric adaptation of Edgar Allan Poe's gothic tale.", "cast": [], "director": "Jean Epstein", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/The+Fall+of+the+House+of+Usher+(1928)+-+Jean+Epstein.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/the+fall+of+the+house+of+usher.jpg", "tvPoster": "" },
  "unchienandalou": { "key": "unchienandalou", "title": "Un Chien Andalou", "synopsis": "A surrealist masterpiece by Luis Buñuel and Salvador Dalí that defies conventional narrative.", "cast": [], "director": "Luis Buñuel", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Un+Chien+Andalou+(1929)+-+Luis+Buñuel.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/un+chien+andalou.jpg", "tvPoster": "" },
  "meshesofafternoon": { "key": "meshesofafternoon", "title": "Meshes of the Afternoon", "synopsis": "A dreamlike and influential experimental film by Maya Deren.", "cast": [], "director": "Maya Deren & Alexander Hammid", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Meshes+of+the+Afternoon+(1943)+-+Maya+Deren.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/meshes+of+afternoon.jpg", "tvPoster": "" },
  "bridelessgroom": { "key": "bridelessgroom", "title": "Brideless Groom", "synopsis": "A classic Three Stooges short where Shemp must get married to inherit a fortune.", "cast": [], "director": "Edward Bernds", "trailer": "", "fullMovie": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/Brideless+Groom+(1947)+-+The+Three+Stooges.mp4", "poster": "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/brideless+groom.jpg", "tvPoster": "" }
};

export const festivalData: FestivalDay[] = [
  {
    day: 1,
    date: 'October 20, 2025',
    blocks: [
      { id: 'day1-block1', title: 'Opening Night Shorts', time: '7:00 PM EST', movieKeys: ['lifeless', 'almasvows'], },
      { id: 'day1-block2', title: 'Comedy Hour', time: '9:00 PM EST', movieKeys: ['thatloud', 'foodiecalltheatricalcut'], },
    ],
  },
  {
    day: 2,
    date: 'October 21, 2025',
    blocks: [
      { id: 'day2-block1', title: 'Dramatic Features', time: '8:00 PM EST', movieKeys: ['juniper', 'results'], },
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
