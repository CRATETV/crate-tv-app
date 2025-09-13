
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
    ' The EnableMemoryWarningEvent and EnableLowGeneralMemoryEvent functions
    ' have been removed as they are deprecated in modern Roku OS and were
    ' causing a startup crash. Memory management is now handled automatically.

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
            
            <!-- Group to dynamically hold the carousels -->
            <Group id="carouselsGroup" translation="[0, 120]" />
        </Group>

        <!-- The video player has been removed from this scene. -->
        <!-- Playback is now handled exclusively by VideoPlayerScene for a cleaner architecture. -->
    </children>
</component>
        `.trim();
        componentsFolder?.file('HomeScene.xml', homeSceneXml);
        
        const homeSceneBrs = `
Sub init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.mainGroup = m.top.findNode("mainGroup")
    m.carouselsGroup = m.top.findNode("carouselsGroup")
    m.launchBeaconFired = false 
    m.firstRow = invalid ' Will hold the first created RowList for focus management

    m.top.setFocus(true)
    
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
        
        yOffset = 0 ' Starting Y position for the first carousel title
        for i = 0 to json.categories.count() - 1
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
                
                row.observeField("itemSelected", "onCarouselItemSelected")
                
                if m.firstRow = invalid
                    m.firstRow = row ' Store a reference to the first row
                end if
                
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
    if m.firstRow <> invalid
        m.firstRow.setFocus(true)
    end if
    FireLaunchBeacon()
End Sub

' REVISED: This function now launches the dedicated VideoPlayerScene for instant playback.
Sub onCarouselItemSelected(event as object)
    rowlist = event.getRoSGNode()
    selectedIndex = event.getData()
    selectedMovie = rowlist.content.getChild(selectedIndex[1])
    
    if selectedMovie <> invalid AND selectedMovie.id <> invalid
        scene = m.top.getScene()
        videoScene = scene.createScene("VideoPlayerScene")
        videoScene.setField("contentID", selectedMovie.id)
        scene.dialog = videoScene
    end if
End Sub

' ROKU CERTIFICATION FIX: This function was missing, causing a runtime error.
' It fires the AppLaunchComplete beacon required for certification.
Sub FireLaunchBeacon()
    if not m.launchBeaconFired
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
        m.launchBeaconFired = true
    end if
End Sub

' SIMPLIFIED: onKeyEvent no longer needs to handle the video player.
Function onKeyEvent(key as String, press as Boolean) as Boolean
    ' The OS will handle the back button to exit the channel from this scene.
    return false
End Function
        `.trim();
        componentsFolder?.file('HomeScene.brs', homeSceneBrs);
        
        // --- NEW COMPONENT: VideoPlayerScene (for deep linking) ---
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
    
    ' The roDeviceInfo.GetDisplayMode() call has been removed.
    ' It is deprecated and causes crashes on modern Roku OS versions.
    ' The Video node's default 1920x1080 dimensions will be
    ' automatically scaled by the OS for 720p displays.
    
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
        
        // --- MOVIE POSTER COMPONENT (with Focus Ring) ---
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