import React, { useState } from 'react';
import { moviesData as initialMoviesData, categoriesData as initialCategoriesData } from './constants.ts';
import { Movie, Category } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Header from './components/Header.tsx';
import Footer from './components/Footer.tsx';
import JSZip from 'jszip';

// Base64 encoded placeholder images
const placeholderHd_1280x720 = "iVBORw0KGgoAAAANSUhEUgAABQAAAAACgAQMAAADW3NdbAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABNJREFUeF7twQEBAAAAgiD/r25IQAEAWQEbAAEa4cOjAAAAAElFTkSuQmCC";
const placeholderFhd_1920x1080 = "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4AQMAAADo/U5XAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABhJREFUeF7twQEBAAAAgiD/r25IQAEA/g8BIgABgaU+NQAAAABJRU5ErkJggg==";
const placeholderLogo_400x90 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAABaAQMAAADoBH4LAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABVJREFUeF7twQEBAAAAgiD/r25IQAEA+gMB2QABtLgN3wAAAABJRU5ErkJggg==";

const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Record<string, Movie>>(initialMoviesData);
  const [categories, setCategories] = useState<Record<string, Category>>(initialCategoriesData);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { 
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
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
    console.log('Saving movie:', updatedMovie);
    setMovies(prev => ({ ...prev, [updatedMovie.key]: updatedMovie }));
    if (isAddingNew) {
      console.log('New movie added. You may need to manually add it to a category file.');
    }
    setSelectedMovie(null);
    setIsAddingNew(false);
    alert('Movie saved! This is a mock save for demonstration. The changes are not persisted.');
  };

  const handleDelete = (movieKey: string) => {
    if (window.confirm('Are you sure you want to delete this movie? This is a mock action and will not persist.')) {
        console.log('Deleting movie:', movieKey);
        const newMovies = { ...movies };
        delete newMovies[movieKey];
        setMovies(newMovies);
        
        const newCategories = { ...categories };
        Object.keys(newCategories).forEach(catKey => {
            newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter(key => key !== movieKey);
        });
        setCategories(newCategories);
        setSelectedMovie(null);
        alert('Movie deleted! This is a mock delete for demonstration.');
    }
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
splash_screen_hd=pkg:/images/splash_hd_1280x720.jpg
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.jpg
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
        <Label id="loadingLabel" text="Loading..." translation="[50, 50]" />
        <RowList 
            id="movieRowList"
            itemComponentName="MoviePoster"
            itemSize="[267, 150]"
            rowItemSize="[320,180]"
            numRows="1"
            rowHeights="[190]"
            itemSpacing="[20,0]"
            showRowLabel="true"
            vertFocusAnimationStyle="fixedFocus"
            rowFocusAnimationStyle="fixedFocus"
            visible="false" />
    </children>
</component>
        `.trim();
        componentsFolder?.file('HomeScene.xml', homeSceneXml);
        
        const homeSceneBrs = `
Sub init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.movieRowList = m.top.findNode("movieRowList")
    
    m.fetcher = CreateObject("roUrlTransfer")
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
                m.loadingLabel.text = "Error loading feed: " + msg.GetResponseCode().toStr()
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
                item.hdposterurl = movie.thumbnail
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
            width="267"
            height="150"
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
        m.poster.uri = itemContent.hdposterurl
    end if
End Sub
        `.trim();
        componentsFolder?.file('MoviePoster.brs', moviePosterBrs);

        // Create images folder and add placeholders
        const imagesFolder = zip.folder('images');
        imagesFolder?.file('logo_400x90.png', placeholderLogo_400x90, { base64: true });
        imagesFolder?.file('splash_hd_1280x720.jpg', placeholderHd_1280x720, { base64: true });
        imagesFolder?.file('splash_fhd_1920x1080.jpg', placeholderFhd_1920x1080, { base64: true });

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
            />
            <button type="submit" className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
              Login
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
                  <div key={movie.key} className="group cursor-pointer" onClick={() => handleSelectMovie(movie)}>
                    <div className="aspect-[3/4] rounded-md overflow-hidden bg-gray-700 transition-transform duration-300 group-hover:scale-105">
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm mt-2 text-center truncate group-hover:text-red-400">{movie.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;