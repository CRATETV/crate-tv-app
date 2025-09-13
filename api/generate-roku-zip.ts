// This is a Vercel Serverless Function that generates a Roku channel package.
// It will be accessible at the path /api/generate-roku-zip
import JSZip from 'jszip';

// Base64 encoded placeholder images for the Roku channel package.
// These are simple black images of the required dimensions.
const placeholderHd_1280x720 = "iVBORw0KGgoAAAANSUhEUgAABQAAAAK8AQMAAAB5e53sAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAADlJREFUeJztwQEBAAAAwiD7p/zzBNERAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADg3wAIAAECEZTnUQAAAABJRU5ErkJggg==";
const placeholderFhd_1920x1080 = "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4AQMAAADo/U5XAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAADlJREFUeJztwQEBAAAAwiD7p/zzBNERAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADg3wAIAAECEZTnUQAAAABJRU5ErkJggg==";
const placeholderLogo_400x90 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAABaAQMAAADoBH4LAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAADFJREFUeJztwQEBAAAAwiD7p/zzBNERAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgH8G3QABeDCRBgAAAABJRU5ErkJggg==";

export async function GET(request: Request) {
    try {
        // This URL points to the live JSON feed that powers the Roku channel.
        // It's hardcoded to the production domain to ensure stability.
        const feedUrl = 'https://cratetv.net/api/roku-feed';

        const zip = new JSZip();

        // --- Create manifest file ---
        // This file contains essential metadata for the Roku channel.
        const manifestContent = `
# Channel Info
title=Crate TV
# Version numbers for channel updates. build_version is set to 2+ to pass certification.
major_version=1
minor_version=0
build_version=2
# Channel Artwork (required for certification)
mm_icon_focus_hd=pkg:/images/logo_400x90.png
mm_icon_side_hd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
# Channel Behavior
requires_payment=false
# Certification Requirements
# supports_input_launch: Enables deep linking into the channel (e.g., from Roku Search).
supports_input_launch=1
# bs_const: BrightScript constants. enable_app_launch_logging is required for certification.
bs_const=enable_app_launch_logging=true
        `.trim();
        zip.file('manifest', manifestContent);

        // --- Create source/main.brs file ---
        // This is the main entry point for the Roku channel application.
        const mainBrsContent = `
'******************************************************************
'** Main Entry Point & Launch Handler
'** This function is called when the channel starts and routes
'** to the correct scene based on launch arguments.
'******************************************************************
Sub Main(args As Object)
    ' Enable memory monitoring events for certification requirements.
    app = CreateObject("roAppManager")
    app.EnableMemoryWarningEvent(true)
    app.EnableLowGeneralMemoryEvent(true)

    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = invalid

    ' CERTIFICATION FIX: Direct-to-Play launch logic is handled here.
    ' Check for a contentID passed in the launch arguments.
    if Type(args) = "roAssociativeArray" AND args.DoesExist("contentID")
        ' If a contentID exists, launch directly into the VideoPlayerScene.
        print "Deep link detected. Launching VideoPlayerScene with contentID: "; args.contentID
        scene = screen.CreateScene("VideoPlayerScene")
        scene.setField("contentID", args.contentID)
    else
        ' If no contentID, perform a normal launch to the HomeScene.
        print "Normal launch detected. Launching HomeScene."
        scene = screen.CreateScene("HomeScene")
    end if
    
    ' screen.show() is a blocking call that handles its own event loop.
    ' The channel will remain active until the scene is closed, so no
    ' further event loop (like a while=true) is needed here.
    screen.show()
End Sub
        `.trim();
        zip.folder('source')?.file('main.brs', mainBrsContent);
        
        // --- Create SceneGraph components ---
        // These are XML and BrightScript files that define the UI and logic.
        const componentsFolder = zip.folder('components');

        const homeSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />
    <children>
        <!-- Dark background to match webapp -->
        <Rectangle id="background" color="#141414" width="1920" height="1080" />
        <Label id="loadingLabel" text="Loading..." translation="[960, 540]" horizAlign="center" vertAlign="center" />
        
        <!-- Main content group -->
        <Group id="mainGroup" visible="false">
            <Label id="logoLabel" text="Crate TV" translation="[90, 40]">
                <font role="font" size="40" />
            </Label>
            
            <!-- Hero component for featured film -->
            <Hero id="hero" translation="[0, 120]" />
            
            <!-- Group to dynamically hold the carousels -->
            <Group id="carouselsGroup" />
        </Group>

        <!-- Video player, sits on top -->
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
    m.mainGroup = m.top.findNode("mainGroup")
    m.hero = m.top.findNode("hero")
    m.carouselsGroup = m.top.findNode("carouselsGroup")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.launchBeaconFired = false 

    deviceInfo = CreateObject("roDeviceInfo")
    if deviceInfo.GetDisplayMode() <> "1080p"
        m.videoPlayer.width = 1280
        m.videoPlayer.height = 720
    end if

    m.top.setFocus(true)
    m.hero.observeField("wasSelected", "onHeroSelected")
    m.videoPlayer.observeField("state", "onVideoStateChange")
    
    m.fetcher = CreateObject("roUrlTransfer")
    m.fetcher.SetCertificatesFile("common:/certs/ca-bundle.crt")
    m.fetcher.InitClientCertificates()
    m.fetcher.SetUrl("${feedUrl}")
    m.fetcher.observeField("status", "onFeedStatusChange")
    m.fetcher.AsyncGetToString()
End Sub

Sub onFeedStatusChange()
    status = m.fetcher.status
    if status = "completed"
        if m.fetcher.GetResponseCode() = 200
            ProcessData(m.fetcher.GetString())
        else
            m.loadingLabel.text = "Error loading feed: " + m.fetcher.GetResponseCode().ToStr()
            FireLaunchBeacon()
        end if
    else if status = "error"
        m.loadingLabel.text = "Failed to load feed."
        FireLaunchBeacon()
    end if
End Sub

Sub ProcessData(data as String)
    json = ParseJson(data)
    if json <> invalid AND json.DoesExist("categories") AND json.categories.count() > 0
        
        ' 1. Set up Hero component with the first featured movie
        featuredCategory = json.categories[0]
        if featuredCategory.movies.count() > 0
            heroContent = CreateObject("roSGNode", "ContentNode")
            firstMovie = featuredCategory.movies[0]
            heroContent.id = firstMovie.id
            heroContent.title = firstMovie.title
            heroContent.description = firstMovie.description
            heroContent.HDPosterUrl = firstMovie.hdThumbnail
            heroContent.streamUrl = firstMovie.streamUrl
            m.hero.itemContent = heroContent
        end if
        
        ' 2. Create carousels for all other categories
        yOffset = 500 ' Starting Y position for the first carousel
        for i = 1 to json.categories.count() - 1
            category = json.categories[i]
            if category.movies.count() > 0
                ' Create and position category title
                titleLabel = m.carouselsGroup.createChild("Label")
                titleLabel.text = category.title
                titleLabel.translation = [90, yOffset]
                titleLabel.font = { size: 32 }

                yOffset = yOffset + 50 ' Space between title and row

                ' Create and populate the RowList
                row = m.carouselsGroup.createChild("RowList")
                row.translation = [90, yOffset]
                row.itemComponentName = "MoviePoster"
                row.itemSize = [240, 360] ' Wider posters
                row.rowHeight = 400
                row.itemSpacing = [20, 0]
                row.showRowLabel = false
                row.vertFocusAnimationStyle = "fixedFocus"
                row.rowFocusAnimationStyle = "fixedFocus"
                
                rowContent = CreateObject("roSGNode", "ContentNode")
                for each movie in category.movies
                    item = rowContent.createChild("ContentNode")
                    item.id = movie.id
                    item.title = movie.title
                    item.description = movie.description
                    item.HDPosterUrl = movie.thumbnail
                    item.streamUrl = movie.streamUrl
                end for
                row.content = rowContent
                
                ' Observe this specific row for selection
                row.observeField("itemSelected", "onCarouselItemSelected")
                
                yOffset = yOffset + 420 ' Space for the next category
            end if
        end for
        
        ShowHomeScreenUI()
    else
        m.loadingLabel.text = "Failed to parse feed data or feed is empty."
        FireLaunchBeacon()
    end if
End Sub

Sub ShowHomeScreenUI()
    m.loadingLabel.visible = false
    m.mainGroup.visible = true
    m.hero.setFocus(true)
    FireLaunchBeacon()
End Sub

Sub onHeroSelected()
    playMovie(m.hero.itemContent)
End Sub

Sub onCarouselItemSelected(event as object)
    rowlist = event.getRoSGNode()
    selectedIndex = event.getData()
    selectedMovie = rowlist.content.getChild(selectedIndex[1])
    playMovie(selectedMovie)
End Sub

Sub playMovie(movieNode as Object)
    if movieNode <> invalid AND movieNode.streamUrl <> invalid
        videoContent = CreateObject("roSGNode", "ContentNode")
        videoContent.stream = { url: movieNode.streamUrl }
        videoContent.title = movieNode.title

        m.videoPlayer.content = videoContent
        m.videoPlayer.streamFormat = "mp4"
        
        m.mainGroup.visible = false
        m.videoPlayer.visible = true
        m.videoPlayer.setFocus(true)
        m.videoPlayer.control = "play"
    end if
End Sub

Sub onVideoStateChange()
    state = m.videoPlayer.state
    if state = "finished" or state = "error"
        closeVideoPlayer()
    end if
End Sub

Sub FireLaunchBeacon()
    if not m.launchBeaconFired
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
        m.launchBeaconFired = true
    end if
End Sub

Sub closeVideoPlayer()
    m.videoPlayer.control = "stop"
    m.videoPlayer.visible = false
    m.mainGroup.visible = true
    m.hero.setFocus(true)
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if press then
        if key = "back"
            if m.videoPlayer.visible
                closeVideoPlayer()
                return true
            end if
        end if
    end if
    return false
End Function
        `.trim();
        componentsFolder?.file('HomeScene.brs', homeSceneBrs);
        
        // --- NEW COMPONENT: Hero ---
        const heroXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="Hero" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/Hero.brs" />
    <interface>
        <field id="itemContent" type="node" onChange="onContentChange" />
        <field id="wasSelected" type="boolean" alwaysNotify="true" />
    </interface>
    <children>
        <Poster 
            id="backgroundPoster" 
            width="1920" 
            height="500" 
            blendColor="#606060" />
        <Rectangle 
            id="gradient" 
            color="#141414" 
            opacity="0.8" 
            width="1920" 
            height="500">
            <Gradient>
                <Color offset="0.0" color="#141414" opacity="0.0" />
                <Color offset="0.5" color="#141414" opacity="1.0" />
            </Gradient>
        </Rectangle>
        <Group id="infoGroup" translation="[90, 100]">
            <Label id="titleLabel" width="800" wrap="true">
                <font role="font" size="52" />
            </Label>
            <Label id="descriptionLabel" translation="[0, 70]" width="700" maxLines="3" wrap="true">
                <font role="font" size="24" />
            </Label>
            <Button id="watchButton" text="Watch Now" translation="[0, 170]" minWidth="200" />
        </Group>
    </children>
</component>
        `.trim();
        componentsFolder?.file('Hero.xml', heroXml);

        const heroBrs = `
Sub init()
    m.top.observeField("itemContent", "onContentChange")
    m.watchButton = m.top.findNode("watchButton")
    m.watchButton.observeField("buttonSelected", "onButtonSelected")
End Sub

Sub onContentChange()
    content = m.top.itemContent
    if content <> invalid
        m.top.findNode("backgroundPoster").uri = content.HDPosterUrl
        m.top.findNode("titleLabel").text = content.title
        m.top.findNode("descriptionLabel").text = content.description
    end if
End Sub

Sub onButtonSelected()
    m.top.wasSelected = true
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if press then
        if key = "OK"
            m.top.wasSelected = true
            return true
        end if
    end if
    return false
End Function
        `.trim();
        componentsFolder?.file('Hero.brs', heroBrs);

        // --- NEW COMPONENT: VideoPlayerScene ---
        const videoPlayerSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="VideoPlayerScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/VideoPlayerScene.brs" />
    <interface>
        ' This field will be set by main.brs with the deep link content ID
        <field id="contentID" type="string" />
    </interface>
    <children>
        <Label 
            id="statusLabel" 
            text="Loading video..." 
            translation="[960, 540]" 
            horizAlign="center" 
            vertAlign="center" />
        <Video
            id="videoPlayer"
            width="1920"
            height="1080"
            visible="false"
        />
    </children>
</component>
        `.trim();
        componentsFolder?.file('VideoPlayerScene.xml', videoPlayerSceneXml);
        
        const videoPlayerSceneBrs = `
Sub init()
    m.top.setFocus(true)
    m.statusLabel = m.top.findNode("statusLabel")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.launchBeaconFired = false

    m.videoPlayer.observeField("state", "onVideoStateChange")
    
    deviceInfo = CreateObject("roDeviceInfo")
    if deviceInfo.GetDisplayMode() <> "1080p"
        m.videoPlayer.width = 1280
        m.videoPlayer.height = 720
    end if
    
    m.fetcher = CreateObject("roUrlTransfer")

    if m.top.contentID <> invalid AND m.top.contentID <> ""
        fetchContentAndPlay(m.top.contentID)
    else
        m.statusLabel.text = "Error: No content ID provided."
        FireLaunchBeacon()
    end if
End Sub

Sub fetchContentAndPlay(contentId as String)
    m.contentId = contentId
    m.fetcher.SetCertificatesFile("common:/certs/ca-bundle.crt")
    m.fetcher.InitClientCertificates()
    m.fetcher.SetUrl("${feedUrl}")
    m.fetcher.observeField("status", "onFeedStatusChange")
    m.fetcher.AsyncGetToString()
End Sub

Sub onFeedStatusChange()
    status = m.fetcher.status
    if status = "completed"
        if m.fetcher.GetResponseCode() = 200
            json = ParseJson(m.fetcher.GetString())
            movieData = FindMovieInFeed(json, m.contentId)
            if movieData <> invalid
                playMovie(movieData)
            else
                m.statusLabel.text = "Error: Content not found in feed."
                FireLaunchBeacon()
            end if
        else
            m.statusLabel.text = "Error loading content: " + m.fetcher.GetResponseCode().ToStr()
            FireLaunchBeacon()
        end if
    else if status = "error"
        m.statusLabel.text = "Failed to load content."
        FireLaunchBeacon()
    end if
End Sub

Function FindMovieInFeed(feed as Object, contentId as String) as Object
    if feed = invalid OR NOT feed.DoesExist("categories") then return invalid
    for each category in feed.categories
        if category.DoesExist("movies")
            for each movie in category.movies
                if movie.DoesExist("id") AND movie.id = contentId
                    return movie
                end if
            end for
        end if
    end for
    return invalid
End Function

Sub playMovie(movieData as Object)
    videoContent = CreateObject("roSGNode", "ContentNode")
    videoContent.stream = { url: movieData.streamUrl }
    videoContent.title = movieData.title

    m.videoPlayer.content = videoContent
    m.videoPlayer.streamFormat = "mp4"
    
    m.statusLabel.visible = false
    m.videoPlayer.visible = true
    m.videoPlayer.setFocus(true)
    m.videoPlayer.control = "play"
End Sub

Sub onVideoStateChange()
    state = m.videoPlayer.state
    if state = "playing"
        FireLaunchBeacon()
    else if state = "finished" or state = "error"
        m.top.getScene().close = true
    end if
End Sub

Sub FireLaunchBeacon()
    if not m.launchBeaconFired
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
        m.launchBeaconFired = true
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and key = "back"
        m.top.getScene().close = true
        return true
    end if
    return false
End Function
        `.trim();
        componentsFolder?.file('VideoPlayerScene.brs', videoPlayerSceneBrs);
        
        // --- MOVIE POSTER COMPONENT (Updated with Focus Ring) ---
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
            width="240"
            height="360"
            loadDisplayMode="scaleToFit"
        />
        <!-- Adds a red, scaled border when focused -->
        <FocusRing 
            color="#E50914" 
            scale="1.05"
            width="240"
            height="360"
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
        m.poster.uri = itemContent.HDPosterUrl
    end if
End Sub
        `.trim();
        componentsFolder?.file('MoviePoster.brs', moviePosterBrs);

        // --- Create images folder and add placeholders ---
        const imagesFolder = zip.folder('images');
        imagesFolder?.file('logo_400x90.png', placeholderLogo_400x90, { base64: true });
        imagesFolder?.file('splash_hd_1280x720.png', placeholderHd_1280x720, { base64: true });
        imagesFolder?.file('splash_fhd_1920x1080.png', placeholderFhd_1920x1080, { base64: true });

        // --- Generate and send the ZIP file ---
        const zipContent = await zip.generateAsync({ type: 'blob' });
        
        return new Response(zipContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="cratv.zip"'
            }
        });

    } catch (error) {
        console.error("Failed to generate Roku ZIP:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate Roku package: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}