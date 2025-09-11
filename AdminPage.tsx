import React, { useState, useEffect } from 'react';
import { moviesData as initialMoviesData, categoriesData as initialCategoriesData, festivalData as initialFestivalData } from './constants.ts';
import { Movie, Category, FestivalDay } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import JSZip from 'jszip';
import FestivalEditor from './components/FestivalEditor.tsx';

// Base64 encoded placeholder images
const placeholderHd_1280x720 = "iVBORw0KGgoAAAANSUhEUgAABQAAAAACgAQMAAADW3NdbAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABNJREFUeF7twQEBAAAAgiD/r25IQAEAWQEbAAEa4cOjAAAAAElFTkSuQmCC";
const placeholderFhd_1920x1080 = "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4AQMAAADo/U5XAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABhJREFUeF7twQEBAAAAgiD/r25IQAEA/g8BIgABgaU+NQAAAABJRU5ErkJggg==";
const placeholderLogo_400x90 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAABaAQMAAADoBH4LAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABVJREFUeF7twQEBAAAAgiD/r25IQAEA+gMB2QABtLgN3wAAAABJRU5ErkJggg==";

const GeneratedCodeModal: React.FC<{ code: string; onClose: () => void }> = ({ code, onClose }) => {
    const [copySuccess, setCopySuccess] = useState('');

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopySuccess('Copied to clipboard!');
            setTimeout(() => setCopySuccess(''), 2500);
        }, () => {
            setCopySuccess('Failed to copy.');
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-green-400">Changes Saved & Ready to Publish</h2>
                    <p className="text-gray-400 mt-2 text-sm">Your changes are saved in this browser for a live preview. To make them permanent for all users, copy the code below and replace the content of your `constants.ts` file.</p>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    <textarea
                        readOnly
                        value={code}
                        className="w-full h-full bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={15}
                    />
                </div>
                <div className="p-6 border-t border-gray-700 flex justify-between items-center bg-gray-800/50 rounded-b-lg">
                    <button onClick={handleCopy} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        {copySuccess ? copySuccess : 'Copy Code'}
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors font-semibold">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFestivalLiveAdmin, setIsFestivalLiveAdmin] = useState(false);


  useEffect(() => {
    // Check session storage for auth status on initial load
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        setIsAuthenticated(true);
    }
    
    // Check feature toggles status from localStorage
    const festivalStatus = localStorage.getItem('crateTv_isFestivalLive');
    setIsFestivalLiveAdmin(festivalStatus === 'true');

    // On initial load, try to get data from localStorage, otherwise use initial data
    try {
        const storedMovies = localStorage.getItem('crateTvAdmin_movies');
        const storedCategories = localStorage.getItem('crateTvAdmin_categories');
        const storedFestival = localStorage.getItem('crateTvAdmin_festival');
        
        setMovies(storedMovies ? JSON.parse(storedMovies) : initialMoviesData);
        setCategories(storedCategories ? JSON.parse(storedCategories) : initialCategoriesData);
        setFestivalData(storedFestival ? JSON.parse(storedFestival) : initialFestivalData);
    } catch (e) {
        console.error("Failed to parse data from localStorage", e);
        setMovies(initialMoviesData);
        setCategories(initialCategoriesData);
        setFestivalData(initialFestivalData);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (response.ok) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            setIsAuthenticated(true);
        } else {
            const data = await response.json();
            setLoginError(data.error || 'Login failed.');
        }
    } catch (error) {
        setLoginError('An error occurred. Please try again.');
    } finally {
        setIsAuthenticating(false);
    }
  };
  
  const persistChanges = (
    newMovies: Record<string, Movie>,
    newCategories: Record<string, Category>,
    newFestivalData: FestivalDay[]
  ) => {
    localStorage.setItem('crateTvAdmin_movies', JSON.stringify(newMovies));
    localStorage.setItem('crateTvAdmin_categories', JSON.stringify(newCategories));
    localStorage.setItem('crateTvAdmin_festival', JSON.stringify(newFestivalData));

    const newConstantsContent = `import { Category, Movie, FestivalDay } from './types.ts';

export const categoriesData: Record<string, Category> = ${JSON.stringify(newCategories, null, 2)};

export const moviesData: Record<string, Movie> = ${JSON.stringify(newMovies, null, 2)};

export const festivalData: FestivalDay[] = ${JSON.stringify(newFestivalData, null, 2)};
`;
    setGeneratedCode(newConstantsContent);
  };

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsAddingNew(false);
  };
  
  const handleAddNewMovie = () => {
    const newMovie: Movie = {
      key: `newmovie${Date.now()}`,
      title: '',
      synopsis: '',
      cast: [],
      director: '',
      trailer: '',
      fullMovie: '',
      poster: '',
      tvPoster: '',
      likes: 0,
      releaseDate: new Date().toISOString().split('T')[0],
    };
    setSelectedMovie(newMovie);
    setIsAddingNew(true);
  };
  
  const handleCancel = () => {
    setSelectedMovie(null);
    setIsAddingNew(false);
  };

  const handleSave = (updatedMovie: Movie) => {
    const newMovies = { ...movies, [updatedMovie.key]: updatedMovie };
    setMovies(newMovies);
    persistChanges(newMovies, categories, festivalData);
    setSelectedMovie(null);
    setIsAddingNew(false);
  };

  const handleDelete = (movieKey: string) => {
    if (window.confirm('This will generate the updated code to permanently delete this movie. Are you sure?')) {
        const newMovies = { ...movies };
        delete newMovies[movieKey];
        setMovies(newMovies);
        
        const newCategories = { ...categories };
        Object.keys(newCategories).forEach(catKey => {
            newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter(key => key !== movieKey);
        });
        setCategories(newCategories);
        
        persistChanges(newMovies, newCategories, festivalData);
        setSelectedMovie(null);
    }
  };
  
  const handleSaveFestival = (updatedFestivalData: FestivalDay[]) => {
    setFestivalData(updatedFestivalData);
    persistChanges(movies, categories, updatedFestivalData);
  };

  const toggleFestivalLive = () => {
      const newStatus = !isFestivalLiveAdmin;
      setIsFestivalLiveAdmin(newStatus);
      localStorage.setItem('crateTv_isFestivalLive', String(newStatus));
      alert(`Film Festival module has been ${newStatus ? 'made LIVE' : 'taken DOWN'}. Changes will be visible on the homepage for all users on their next page load.`);
  };

  const generateRokuZip = async () => {
    setIsPackaging(true);
    try {
        const zip = new JSZip();
        
        const feedUrl = `${window.location.origin}/api/roku-feed`;

        // Create manifest
        const manifestContent = `
title=Crate TV
major_version=1
minor_version=0
build_version=0
mm_icon_focus_hd=pkg:/images/logo_400x90.png
mm_icon_side_hd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
        `.trim();
        zip.file('manifest', manifestContent);

        // Create source/main.brs
        const mainBrsContent = `
Sub Main()
    ShowChannelHomeScreen()
End Sub

Sub ShowChannelHomeScreen()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    m.scene = screen.CreateScene("HomeScene")
    screen.show()

    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
End Sub
        `.trim();
        zip.folder('source')?.file('main.brs', mainBrsContent);
        
        // Create components folder and files
        const componentsFolder = zip.folder('components');

        const homeSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />
    <children>
        <Label id="loadingLabel" text="Loading..." translation="[960, 540]" horizAlign="center" vertAlign="center" />
        <RowList 
            id="movieRowList"
            itemComponentName="MoviePoster"
            itemSize="[200, 300]"
            numRows="2"
            rowHeights="[360, 360]"
            itemSpacing="[20, 20]"
            showRowLabel="true"
            rowLabelOffset="[[0, 10]]"
            translation="[100, 80]"
            vertFocusAnimationStyle="fixedFocus"
            rowFocusAnimationStyle="fixedFocus"
            visible="false" />
        <Video
            id="videoPlayer"
            width="1920"
            height="1080"
            visible="false"
        />
    </children>
</component>
        `.trim();
        componentsFolder?.file('HomeScene.xml', homeSceneXml);
        
        const homeSceneBrs = `
Sub init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.movieRowList = m.top.findNode("movieRowList")
    m.videoPlayer = m.top.findNode("videoPlayer")

    ' Set video player size based on display mode
    deviceInfo = CreateObject("roDeviceInfo")
    if deviceInfo.GetDisplayMode() <> "1080p"
        m.videoPlayer.width = 1280
        m.videoPlayer.height = 720
    end if

    m.top.setFocus(true) ' The scene itself should handle key events
    m.movieRowList.observeField("itemSelected", "onItemSelected")
    m.videoPlayer.observeField("state", "onVideoStateChange")
    
    m.fetcher = CreateObject("roUrlTransfer")
    m.fetcher.SetCertificatesFile("common:/certs/ca-bundle.crt")
    m.fetcher.InitClientCertificates()
    m.fetcher.SetUrl("${feedUrl}")
    
    port = CreateObject("roMessagePort")
    m.fetcher.SetMessagePort(port)
    m.fetcher.AsyncGetToString()
    
    while true
        msg = wait(0, port)
        if type(msg) = "roUrlEvent"
            if msg.GetResponseCode() = 200
                ProcessData(msg.GetString())
            else
                m.loadingLabel.text = "Error loading feed: " + msg.GetResponseCode().ToStr()
            end if
            exit while
        end if
    end while
End Sub

Sub ProcessData(data as String)
    json = ParseJson(data)
    if json <> invalid AND json.categories <> invalid
        content = CreateObject("roSGNode", "ContentNode")
        for each category in json.categories
            row = content.createChild("ContentNode")
            row.title = category.title
            for each movie in category.movies
                item = row.createChild("ContentNode")
                item.id = movie.id
                item.title = movie.title
                item.description = movie.description
                item.HDPosterUrl = movie.thumbnail ' Use correct case for ContentNode field
                item.streamUrl = movie.streamUrl
            end for
        end for
        m.movieRowList.content = content
        m.loadingLabel.visible = false
        m.movieRowList.visible = true
        m.movieRowList.setFocus(true)
    else
        m.loadingLabel.text = "Failed to parse feed data."
    end if
End Sub

Sub onItemSelected()
    ' itemSelected is a roArray with [rowIndex, itemIndex]
    selectedIndex = m.movieRowList.itemSelected
    content = m.movieRowList.content
    if content <> invalid AND content.getChildCount() > selectedIndex[0]
        selectedRow = content.getChild(selectedIndex[0])
        if selectedRow <> invalid AND selectedRow.getChildCount() > selectedIndex[1]
            selectedMovie = selectedRow.getChild(selectedIndex[1])
            
            if selectedMovie <> invalid AND selectedMovie.streamUrl <> invalid
                videoContent = CreateObject("roSGNode", "ContentNode")
                videoContent.url = selectedMovie.streamUrl
                videoContent.title = selectedMovie.title
                videoContent.streamformat = "mp4"
                
                m.videoPlayer.content = videoContent
                m.videoPlayer.visible = true
                m.videoPlayer.setFocus(true)
                m.videoPlayer.control = "play"

                m.movieRowList.visible = false
            end if
        end if
    end if
End Sub

Sub onVideoStateChange()
    state = m.videoPlayer.state
    if state = "finished" or state = "error"
        closeVideoPlayer()
    end if
End Sub

Sub closeVideoPlayer()
    m.videoPlayer.control = "stop"
    m.videoPlayer.visible = false
    
    m.movieRowList.visible = true
    m.movieRowList.setFocus(true)
End Sub

Function onKeyEvent(key_pressed as String, press as Boolean) as Boolean
    if press then
        if key_pressed = "back"
            if m.videoPlayer.visible
                closeVideoPlayer()
                return true ' event handled
            end if
        end if
    end if
    return false ' event not handled
End Function
        `.trim();
        componentsFolder?.file('HomeScene.brs', homeSceneBrs);
        
        const moviePosterXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MoviePoster" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/MoviePoster.brs" />
    <interface>
        <field id="itemContent" type="node" onChange="onContentChange" />
    </interface>
    <children>
        <Poster
            id="poster"
            width="200"
            height="300"
            loadDisplayMode="scaleToFit"
        />
    </children>
</component>
        `.trim();
        componentsFolder?.file('MoviePoster.xml', moviePosterXml);
        
        const moviePosterBrs = `
Sub init()
    m.poster = m.top.findNode("poster")
End Sub

Sub onContentChange()
    itemContent = m.top.itemContent
    if itemContent <> invalid
        m.poster.uri = itemContent.HDPosterUrl ' Use correct case for ContentNode field
    end if
End Sub
        `.trim();
        componentsFolder?.file('MoviePoster.brs', moviePosterBrs);

        // Create images folder and add placeholders
        const imagesFolder = zip.folder('images');
        imagesFolder?.file('logo_400x90.png', placeholderLogo_400x90, { base64: true });
        imagesFolder?.file('splash_hd_1280x720.png', placeholderHd_1280x720, { base64: true });
        imagesFolder?.file('splash_fhd_1920x1080.png', placeholderFhd_1920x1080, { base64: true });

        // Generate and download zip
        const zipContent = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipContent);
        link.download = 'cratv.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Failed to generate Roku ZIP:", error);
        alert("An error occurred while packaging the channel. Check the console for details.");
    } finally {
        setIsPackaging(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
              disabled={isAuthenticating}
            />
            {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
            <button type="submit" className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed" disabled={isAuthenticating}>
              {isAuthenticating ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-bold mb-8">Admin Panel</h1>
          
           <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-green-400">Live Feature Toggles</h2>
                <p className="text-gray-400 mb-4 max-w-3xl">
                    Control the visibility of major site features for all users in real-time.
                </p>
                <div className="space-y-4">
                  {/* Festival Toggle */}
                  <div className="flex items-center gap-4">
                      <button
                          onClick={toggleFestivalLive}
                          className={`font-bold py-2 px-5 rounded-md transition-colors w-44 text-center ${
                              isFestivalLiveAdmin
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                      >
                          {isFestivalLiveAdmin ? 'Take Festival Down' : 'Make Festival Live'}
                      </button>
                      <span className={`text-sm font-semibold ${isFestivalLiveAdmin ? 'text-green-400' : 'text-gray-500'}`}>
                          Film Festival is currently {isFestivalLiveAdmin ? 'LIVE' : 'HIDDEN'}
                      </span>
                  </div>
                </div>
            </div>

           {/* Roku Packager Section */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 text-red-400">Automated Roku Channel Packager</h2>
              <p className="text-gray-400 mb-4 max-w-3xl">
                  This tool automatically generates a ready-to-upload Roku channel ZIP file. It uses your website's current URL to create the data feed, so it's best to use this after deploying your site to a public address (like Vercel).
              </p>
              <button
                  onClick={generateRokuZip}
                  disabled={isPackaging}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-md transition-colors"
              >
                  {isPackaging ? 'Packaging...' : 'Generate & Download Roku ZIP'}
              </button>
          </div>
          
          {/* Festival Editor Section */}
           <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
              <FestivalEditor
                initialData={festivalData}
                allMovies={movies}
                onSave={handleSaveFestival}
              />
          </div>

          <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold">Content Management</h2>
              <button
                  onClick={handleAddNewMovie}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm sm:text-base"
              >
                  Add New Movie
              </button>
          </div>

          {selectedMovie ? (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-700">
              <MovieEditor 
                movie={selectedMovie}
                onSave={handleSave}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Select a Movie to Edit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.values(movies).sort((a, b) => a.title.localeCompare(b.title)).map(movie => (
                  <div key={movie.key} className="group" onClick={() => handleSelectMovie(movie)}>
                    <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-900 transition-transform duration-300 ease-in-out hover:scale-105">
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <p className="text-sm mt-2 text-center truncate group-hover:text-red-400 cursor-pointer">{movie.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      {generatedCode && <GeneratedCodeModal code={generatedCode} onClose={() => setGeneratedCode(null)} />}
    </div>
  );
};

export default AdminPage;