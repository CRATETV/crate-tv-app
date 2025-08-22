import { Movie, Category } from './types.ts';

export const moviesData: Record<string, Movie> = {
  lifeless: {
    key: "lifeless",
    title: "Lifeless",
    synopsis: "When Valerie uncovers a devastating truth, she is forced to confront her fears as she prepares to deliver a chilling report to her unsuspecting fiancé.<br/><br/>Trivia: Lifeless opened the 2023 Playhouse West-Philadelphia Film Festival.",
    cast: [
        { name: "Darrah Lashley", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png", bio: "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg" },
        { name: "Ajinkya Dhage", photo: "https://cratetelevision.s3.amazonaws.com/photos+/AJ+Photo.png", bio: "With a strong foundation in the Meisner technique, Ajinkya has honed his craft through years of dedicated study and practice, becoming a prominent figure in the local theater scene.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Aj+bio+photo.png" },
        { name: "Kathryn Wylde", photo: "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png", bio: "Kathryn Wylde is an emerging actor with a passion for storytelling, demonstrating their skills both on screen and behind the camera.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png" }
    ],
    director: "Darrah Lashley",
    trailer: "https://cratetelevision.s3.amazonaws.com/LifelessTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.amazonaws.com/LIFELESS.mp4",
    poster: "https://cratetelevision.s3.amazonaws.com/Lifeless+poster+remake+.jpg",
    likes: 0
  },
  almasvows: {
    key: "almasvows",
    title: "Alma's Vows",
    synopsis: "Alma struggles to move on after the death of her fiancé.",
    cast: [
      { name: "Alana Hill", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png", bio: "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png" },
      { name: "David Auspitz", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+A.png", bio: "David Auspitz is a versatile actor with a knack for both comedic and dramatic roles. He brings a unique charm to every character he portrays, making him a beloved figure in the industry.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/David+A.png" },
      { name: "Pratigya Paudel", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png", bio: "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png" }
    ],
    director: "Alana Hill",
    trailer: "https://cratetelevision.s3.amazonaws.com/Almas+vow+cut+trailer.mp4",
    fullMovie: "https://cratetelevision.s3.amazonaws.com/Almas+Vows+-+Alana+Hill.mp4",
    poster: "https://cratetelevision.s3.amazonaws.com/Alma%27s+vows+poster+remake+.png",
    likes: 0
  },
  foodiecalldirectorscut: {
    key: "foodiecalldirectorscut",
    title: "Foodie Call Directors Cut",
    synopsis: "Maya is both financially and physically famished. Her desperation has led her to develop a rather unconventional habit: dating solely for free meals. It's a risky game, but it's the only one she knows.<br/><br/>Trivia: Foodie Call was awarded Best Comedy at the 2024 Playhouse West-Philadelphia Film Festival.",
    cast: [
        { name: "Darrah Lashley", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png", bio: "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg" },
        { name: "Salome Denoon", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", bio: "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
        { name: "Robert Boyd", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png", bio: "Robert Boyd is a filmmaker and actor known for his impressive work in both mediums. He creates compelling films and delivers captivating performances on stage and screen.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png" },
        { name: "Michael Dwayne Paylor", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png", bio: "Michael Dwayne Paylor is a fantastic comedic writer with a knack for crafting hilarious and engaging stories. He seamlessly transitions between film and stage, showcasing his adaptability and creative range.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png" },
        { name: "Akil Logan Haye", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png", bio: "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png" },
    ],
    director: "Michael Dwayne Paylor",
    trailer: "https://cratetelevision.s3.amazonaws.com/FoodiesTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+Paycut.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+Director's+cut+poster+.jpg",
    likes: 0
  },
  foodiecalltheatricalcut: {
    key: "foodiecalltheatricalcut",
    title: "Foodie Call Theatrical Cut",
    synopsis: "Maya is both financially and physically famished. Her desperation has led her to develop a rather unconventional habit: dating solely for free meals. It's a risky game, but it's the only one she knows.<br/><br/>Trivia: Foodie Call was awarded Best Comedy at the 2024 Playhouse West-Philadelphia Film Festival.",
    cast: [
        { name: "Darrah Lashley", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png", bio: "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg" },
        { name: "Salome Denoon", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", bio: "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
        { name: "Robert Boyd", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png", bio: "Robert Boyd is a filmmaker and actor known for his impressive work in both mediums. He creates compelling films and delivers captivating performances on stage and screen.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/RobertBoyd.png" },
        { name: "Michael Dwayne Paylor", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png", bio: "Michael Dwayne Paylor is a fantastic comedic writer with a knack for crafting hilarious and engaging stories. He seamlessly transitions between film and stage, showcasing his adaptability and creative range.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/MichaelPaylor+design.png" },
        { name: "Akil Logan Haye", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png", bio: "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png" },
    ],
    director: "Michael Dwayne Paylor",
    trailer: "https://cratetelevision.s3.amazonaws.com/FoodiesTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Foodie+Call+Lasley+cut.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/Foodie+Call.png",
    likes: 0
  },
  finallycaught:{
    key: "finallycaught",
    title: "Finally Caught",
    synopsis: "Finally Caught plunges viewers into the heart of a young woman's secret struggle with an eating disorder.",
    cast: [
        { name: "Michelle Reale-Opalesky", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg", bio: "Michelle Reale-Opalesky is a captivating actor with a remarkable range. She effortlessly inhabits diverse roles and seamlessly transitions between drama and comedy.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Michelle+Reale-Opalesky.jpg" },
        { name: "Cathrine Tillotson", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png", bio: "Cathrine Tillotson is a driven actor with a passion for performing. They possess a strong stage presence and a natural connection with audiences. Eager to learn and grow, they strive to bring compelling characters to life.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png" },
    ],
    director: "Sarah Morrison-Cleary",
    trailer: "https://cratetelevision.s3.amazonaws.com/FinallyCaughtTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.amazonaws.com/(Copy)+Finally+Caught_FC3.mp4",
    poster: "https://cratetelevision.s3.amazonaws.com/finally+caught+poster+.png",
    likes: 0
  },
  iloveyoublack: {
    key: "iloveyoublack",
    title: "I Love You Black",
    synopsis: "Haunted by generations of unspoken truths, Deborah is desperate to break the cycle of secrets in her Black family before her silence costs her little sister everything.<br/><br/>Trivia:Salome Denoon received the Best Supporting Actress award at the 2024 Playhouse West-Philadelphia Film Festival for her performance in this film.",
    cast: [
    { name: "Salome Denoon", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", bio: "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
        { name: "Thatia MomPremier", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Tathia+Mompri_6705.jpg", bio: "Thatia MomPremier is a dynamic force on stage and screen. As a powerhouse of an actor, she commands attention in every performance, bringing her unique energy and presence to both film and theater.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Tathia+Mompri_6705.jpg" },
        { name: "Charles Ellis Washington", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG", bio:"Charles Ellis Washington is an actor who brings a controlled intensity and smooth presence to his work in film and theater, creating memorable performances.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG" },
         { name: "Isabelle Dessalines", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png", bio: "Isabelle Dessalines, an aspiring actor, brings a captivating blend of mystery and innocence to her characters through her quiet and thoughtful performances on stage and screen.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Defaultpic.png" },
     ],
    director: "Anh Nguyen",
    trailer: "https://cratetelevision.s3.amazonaws.com/IloveyouBlackTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.amazonaws.com/I+Loveyou+in+black+Theatrical+cut.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/instant+tv+posters++folder/I+love+You-Black.png",
    likes: 0
  },
  hair: {
    key: "hair",
    title: "Hair",
    synopsis: "An African American woman fights through stereotyping in the workplace until she is fed up.<br/><br/>Trivia: Darrah Lashley's performance in this film earned her an award at the Playhouse West-Philadelphia Film Festival.",
    cast: [
     { name: "Darrah Lashley", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png", bio: "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg" },
     { name: "Joshua Daniel", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png", bio: "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Joshua+Daniel+(2).png" },
    ],
    director: "Joshua Daniel",
    trailer: "https://cratetelevision.s3.us-east-1.amazonaws.com/Hair+TrailerMP4.MP4",
    fullMovie: "https://cratetelevision.s3.amazonaws.com/HAIR.mp4",
    poster: "https://cratetelevision.s3.amazonaws.com/Hair+poster+209+X+209++(2).jpg",
    likes: 0
  },
  eharmonycs: {
    key: "eharmonycs",
    title: "eHarmonycs",
    synopsis: "Two people meet in a bar and decide whether to get to know each other.",
    cast: [
     { name: "Kathryn Wylde", photo: "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png", bio: "Kathryn Wylde is an emerging actor with a passion for storytelling, demonstrating their skills both on screen and behind the camera.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/KatWylde.png" },
     { name: "Johnny Fernandez", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: "Information regarding this actor is currently unavailable.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
    ],
    director: "RT Bowersox",
    trailer: "https://cratetelevision.s3.amazonaws.com/eHarmonycsTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/EHARMONYCS.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/eHarmonics+poster+remake++(1).png",
    likes: 0
  },
  youvsthem: {
    key: "youvsthem",
    title: "You Vs Them",
    synopsis: "While on a seemingly promising first date, Sasha finds her mind drifting back to a parade of disastrous past relationships. Each awkward moment with her current suitor triggers a flashback.",
    cast: [
      { name: "Joshua Daniel", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png", bio: "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png" },
      { name: "Darrah Lashley", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+head+shot.png", bio: "Darrah Lashley is a talented and versatile actress known for her captivating performances. Darrah has received several accolades due to her exceptional talent and dedication to work in independent films and theater productions, showcasing her range and depth.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Darrah+bio+picjpg.jpg" },
    ],
    director: "Joshua Daniel",
    trailer: "https://cratetelevision.s3.amazonaws.com/YouVsThemTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/youVs+Them.mp4",
    poster: "https://cratetelevision.s3.amazonaws.com/you+vs+them+poster+.png",
    likes: 0
  },
  autumn:{
    key: "autumn",
    title: "Autumn",
    synopsis: "A woman confronts her boyfriend about his change of heart",
    cast: [
    { name: "Alana Hill", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png", bio: "Actress Alana Hill has deeply moved audiences with her compelling performances, showcasing a beautiful blend of emotional depth and impressive versatility.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Alana+Hill+2+.png" },
        { name: "Luke Yong Kwon", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: "Information regarding this actor is currently unavailable", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"},
   ],
   director: "David Auspitz",
   trailer: "https://cratetelevision.s3.amazonaws.com/AutumnTrailer.mp4",
   fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Autumn+-+Alana+Hill.mp4",
   poster: "https://cratetelevision.s3.amazonaws.com/Autumn+poster+remake+.png",
   likes : 0
  },
  streeteatstheboot:{
    key: "streeteatstheboot",
    title: "Street Eats The Boot",
    synopsis: "A captivating documentary that explores the vibrant world of Central Louisiana food trucks.",
    cast: [
        { name: "Austin Williams", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: " Information regarding this actor is currently unavailable.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
        { name: "Ashley Harrison", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: "Information regarding this actor is currently unavailable",highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
   ],
   director: "Andrew W Trimble",
   trailer: "https://cratetelevision.s3.amazonaws.com/StreetEatsTheBootTrailer.mp4",
   fullMovie: "https://cratetelevision.s3.amazonaws.com/Street+Eats+THE+BOOT-A+Louisiana+Food+Truck+Journey.mp4",
   poster: "https://cratetelevision.s3.amazonaws.com/street+eats+the+boot+remake+.png",
   likes: 0
  },
  silentlove:{
    key: "silentlove",
    title: "Silent Love",
    synopsis: "Unspoken feelings have kept Vicky and Toby in the friend zone forever. Their relationship faces a turning point when Toby takes a step towards a future without Vicky.",
    cast: [
        { name: "Salome Denoon", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", bio: "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
        { name: "Joshua Daniel", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png", bio: "Joshua Daniel excels as an actor, showcasing both comedic timing and dramatic depth. Joshua is the founder of the Actors Build, an organization dedicated to empowering independent artists in short film, and movie reel creation.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Joshua+Daniel+(2).png" },
   ],
   director: "Salome Denoon",
   trailer: "https://cratetelevision.s3.amazonaws.com/SilentLoveTrailer.mp4",
   fullMovie: "https://cratetelevision.s3.amazonaws.com/SilentLove+Movie+05.14.2024-1+2.mp4",
   poster: "https://cratetelevision.s3.amazonaws.com/silent+Love++poster+remake+.jpg",
   likes: 0
  },
  juniper:{
    key: "juniper",
    title: "Juniper",
    synopsis: "Bad news from her mother sends Juniper into chaos, and her roommate makes it worse.<br/><br/>Trivia: Juniper triumphed at the 2023 Playhouse West-Philadelphia Film Festival, securing Best Short Film, Best Screenplay, Best Actress for Pratigya Paudel, and Best Supporting Actress for Julianna Lea. The film was also selected for screening at the Philly Film Showcase.",
    cast: [
    { name: "Pratigya Paudel", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png", bio: "Pratigya Paudel is a versatile talent who seamlessly transitions between acting, writing, directing, and modeling.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Pratigya+Paudel.png" },
    { name: "Julianne Lea", photo:"https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Julianne+Lea.jpg", bio: "Julianne Lea is a talented actress with a passion for storytelling. She has a diverse portfolio, including roles in acting producing and set design.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Julianne+Lea.jpg"},
   ],
   director: "Pratigya Paudel",
   trailer: "",
   fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper+.mp4",
   poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/Juniper.png",
   likes: 0
  },
  drive:{
    key: "drive",
    title: "Drive",
    synopsis: "Two siblings take a journey that could change the trajectory of their lives.",
    cast: [
    { name: "Ellicia Clayton", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: "Information regarding this actor is currently unavailable.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png" },
    { name: "Bubacarr Sarge", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG", bio: "Bubacarr Sarge is a true artist, seamlessly navigating the worlds of film and theatre. They possess a complete vision, not only acting but also writing, directing, and designing the lighting for their own self-produced works.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Bubacarr+Sarge.JPG"},
    {name: "Ed Aristone", photo:"https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ed+Aristone+.webp", bio: "Ed Aristone, an award-winning actor and Playhouse West-Philadelphia associate teacher, with extensive film and stage experience alongside directing and producing, emphasizes dedicated role research and collaborative passion, driven by a belief in acting as a gift to inspire humanity.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Ed+Aristone+.webp"},
   ],
    director: "Shamira Womack",
   trailer: "",
   fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+(2).mp4",
   poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/Drive+Poster.jpeg",
   likes: 15
  },
  wrapitup:{
    key: "wrapitup",
    title: "Wrap It Up",
    synopsis: "A passive-aggressive war unfolds between Mark, the supporting actor, and the director. Their every line and directorial choice is a thinly veiled barb.",
    cast: [
    { name: "Akil Logan Haye", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png", bio: "Akil Logan Haye is a stage and film actor and the driving force behind Pursuit of Excellence, a production company where he serves as CEO. His creative vision informs both his performances and his leadership.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Akil+Logan+Haye.png" },
    { name: "Brooke Storms", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: " Information regarding this actor is currently unavailable", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"},
    {name: "Jordan Fox", photo:"https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: "Jordan Fox is a dynamic force in the film industry, seamlessly transitioning between captivating on-screen performances and visionary directorial roles.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"},
   ],
    director: "Jordan Fox, Darrah Lashley ",
   trailer: "",
   fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up+.mp4",
   poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/Wrap+it+up.png",
   likes: 12
  },
  crossroads:{
    key: "crossroads",
    title: "Crossroads",
    synopsis: "Post-dinner tensions expose devastating secrets, imploding a couple's relationship.",
    cast: [
    { name: "Shamira Womack", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg", bio: "Shamira Womack is a dynamic and multifaceted talent, carving a unique space in the world of film. As an actor, writer, director, and filmmaker, Womack demonstrates a remarkable versatility and a deep commitment to the craft of storytelling",highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Shamira+Womack.jpg" },
    { name: "Lam Wonkeryor", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: " Information regarding this actor is currently unavailable", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"},
   ],
    director: "Akil Logan Haye",
   trailer: "",
   fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Crossroads.mp4",
   poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/crossroads(Mobile+Video).jpg",
   likes: 12
  },
  fatherdaughterdance: {
    key: "fatherdaughterdance",
    title: "Father Daughter Dance",
    synopsis: "A father and daughter confront past choices and their lingering impact.",
    cast: [
      { name: "Charles Ellis Washington", photo: "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG", bio:"Charles Ellis Washington is an actor who brings a controlled intensity and smooth presence to his work in film and theater, creating memorable performances.", highResPhoto: "https://cratetelevision.s3.amazonaws.com/photos+/Charles+Ellis+Wahington.JPG" },
      {name: "Sylvette Mikel",  photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: " Information regarding this actor is currently unavailable", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"},
    ],
    director: "Charles Ellis Washington",
    trailer: "https://cratetelevision.s3.amazonaws.com/SilentLoveTrailer.mp4",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/father+daughter+dance.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/Father+Daughter+Dance+.png",
    likes: 12
  },
  itsinyou: {
    key: "itsinyou",
    title: "It's In You",
    synopsis: "A problematic pastor must fight for his life when he is invaded by a violent and vengeful spirit.",
    cast: [
      {name: "Robert Graves", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png", bio: " Information regarding this actor is currently unavailable", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"},
    ],
    director: "Robert Graves",
    trailer: "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+trailer.mov",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Its+In+You.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+poster+jpeg",
    likes: 1,
    releaseDate: "2099-12-31"
  },
  smirk: {
    key: "smirk",
    title: "Smirk",
    synopsis: "Consumed by the pain of his failing marriage, a man retreats into a dream world where divorce is his only solace.",
    cast: [
      { name: "Salome Denoon", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png", bio: "Salome Denoon is a versatile artist whose creative pursuits span performance, writing, editing, and digital media. As an actress, she has graced both stage and screen. She also brings her talents to the digital realm as the developer of Crate TV.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/SalomeDenoon.png" },
     {name: "Vigneshwar Raju", photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Vingneshwar+Raju.JPG", bio: "Driven by experimental cinema, Vigneshwar Raju, an actor-director, seeks to dissolve the lines between reality and imagination. His work delves into the depths of human experience through innovative visual storytelling.", highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Vingneshwar+Raju.JPG" },
    ],
    director: "Vigneshwar Raju",
    trailer: "",
    fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk.mp4",
    poster: "https://cratetelevision.s3.us-east-1.amazonaws.com/smirk+poster+.png",
    likes: 10
  }
};

export const categoriesData: Record<string, Category> = {
  featured: {
    title: "Our Featured Films",
    movieKeys: ['lifeless', 'foodiecalldirectorscut', 'iloveyoublack', 'hair', 'juniper', 'silentlove']
  },
  explore: {
    title: "Explore These Titles",
    movieKeys: ['smirk']
  },
  awardWinners: {
    title: "Award Winners & Nominees",
    movieKeys: ['foodiecalldirectorscut', 'hair', 'iloveyoublack', 'juniper', 'lifeless']
  },
  drama: {
    title: "Drama",
    movieKeys: ['lifeless', 'almasvows', 'finallycaught', 'iloveyoublack', 'autumn', 'silentlove', 'juniper', 'drive', 'crossroads', 'fatherdaughterdance', 'youvsthem']
  },
  comedy: {
    title: "Comedy",
    movieKeys: ['foodiecalldirectorscut', 'foodiecalltheatricalcut', 'eharmonycs', 'youvsthem', 'wrapitup']
  },
  newReleases: {
    title: "New Releases",
    movieKeys: ['crossroads', 'wrapitup', 'itsinyou', 'drive', 'fatherdaughterdance']
  },
  phillyFilmFest2025: {
    title: "Selections from the 12th Annual PWFF - Coming Soon",
    movieKeys: []
  },
  documentary: {
    title: "Documentaries",
    movieKeys: ['streeteatstheboot']
  }
};