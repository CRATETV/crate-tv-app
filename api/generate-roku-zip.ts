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
    
    screen.show()

    ' Event loop to keep the channel alive
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
        
        // --- Create SceneGraph components ---
        // These are XML and BrightScript files that define the UI and logic.
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
            rowHeight="360"
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
    m.launchBeaconFired = false ' Flag to prevent sending beacon multiple times

    deviceInfo = CreateObject("roDeviceInfo")
    if deviceInfo.GetDisplayMode() <> "1080p"
        m.videoPlayer.width = 1280
        m.videoPlayer.height = 720
    end if

    m.top.setFocus(true)
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
                FireLaunchBeacon() ' App has launched to an error screen, a valid terminal state.
            end if
            exit while
        end if
    end while
End Sub

Sub ProcessData(data as String)
    json = ParseJson(data)
    if json <> invalid AND json.DoesExist("categories") AND json.categories.count() > 0
        content = CreateObject("roSGNode", "ContentNode")
        for each category in json.categories
            row = content.createChild("ContentNode")
            row.title = category.title
            for each movie in category.movies
                item = row.createChild("ContentNode")
                item.id = movie.id
                item.title = movie.title
                item.description = movie.description
                item.HDPosterUrl = movie.thumbnail
                item.streamUrl = movie.streamUrl
            end for
        end for
        m.movieRowList.content = content
        
        ' For a normal launch, show the UI.
        ShowHomeScreenUI()
    else
        m.loadingLabel.text = "Failed to parse feed data or feed is empty."
        FireLaunchBeacon() ' App has launched to an error state.
    end if
End Sub

' Helper function for normal home screen launch
Sub ShowHomeScreenUI()
    m.loadingLabel.visible = false
    m.movieRowList.visible = true
    m.movieRowList.setFocus(true)
    FireLaunchBeacon() ' Fire beacon for normal launch
End Sub

Sub playMovie(movieNode as Object)
    if movieNode <> invalid AND movieNode.streamUrl <> invalid
        videoContent = CreateObject("roSGNode", "ContentNode")
        videoContent.stream = { url: movieNode.streamUrl }
        videoContent.title = movieNode.title

        m.videoPlayer.content = videoContent
        m.videoPlayer.streamFormat = "mp4"
        
        m.loadingLabel.visible = false
        m.movieRowList.visible = false 
        m.videoPlayer.visible = true
        m.videoPlayer.setFocus(true)
        m.videoPlayer.control = "play"
    end if
End Sub

Sub onItemSelected()
    selectedIndex = m.movieRowList.itemSelected
    content = m.movieRowList.content
    if content <> invalid AND content.getChildCount() > selectedIndex[0]
        selectedRow = content.getChild(selectedIndex[0])
        if selectedRow <> invalid AND selectedRow.getChildCount() > selectedIndex[1]
            selectedMovie = selectedRow.getChild(selectedIndex[1])
            playMovie(selectedMovie)
        end if
    end if
End Sub

Sub onVideoStateChange()
    state = m.videoPlayer.state
    if state = "finished" or state = "error"
        closeVideoPlayer()
    end if
End Sub

' Helper function to fire the launch beacon only once
Sub FireLaunchBeacon()
    if not m.launchBeaconFired
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
        m.launchBeaconFired = true
    end if
End Sub

Sub closeVideoPlayer()
    m.videoPlayer.control = "stop"
    m.videoPlayer.visible = false
    m.movieRowList.visible = true
    m.movieRowList.setFocus(true)
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

    ' Check if contentID was passed from main.brs
    if m.top.contentID <> invalid AND m.top.contentID <> ""
        fetchContentAndPlay(m.top.contentID)
    else
        m.statusLabel.text = "Error: No content ID provided."
        FireLaunchBeacon() ' Launch to error state
    end if
End Sub

Sub fetchContentAndPlay(contentId as String)
    fetcher = CreateObject("roUrlTransfer")
    fetcher.SetCertificatesFile("common:/certs/ca-bundle.crt")
    fetcher.InitClientCertificates()
    fetcher.SetUrl("${feedUrl}")
    
    port = CreateObject("roMessagePort")
    fetcher.SetMessagePort(port)
    fetcher.AsyncGetToString()
    
    ' Wait for the feed to download
    msg = wait(15000, port) ' 15 second timeout
    if type(msg) = "roUrlEvent"
        if msg.GetResponseCode() = 200
            ' Find the specific movie in the feed
            json = ParseJson(msg.GetString())
            movieData = FindMovieInFeed(json, contentId)
            if movieData <> invalid
                playMovie(movieData)
            else
                m.statusLabel.text = "Error: Content not found in feed."
                FireLaunchBeacon() ' Launch to error state
            end if
        else
            m.statusLabel.text = "Error loading content: " + msg.GetResponseCode().ToStr()
            FireLaunchBeacon() ' Launch to error state
        end if
    else if msg = invalid ' Timeout
        m.statusLabel.text = "Error: Timed out while loading content."
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
    return invalid ' Return invalid if not found
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
        ' CERTIFICATION REQUIREMENT: Fire beacon when deep-linked video starts playing.
        FireLaunchBeacon()
    else if state = "finished" or state = "error"
        ' Close the screen (and the channel) when the video is done.
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
        ' For a deep-linked video, the back button should exit the channel.
        m.top.getScene().close = true
        return true
    end if
    return false
End Function
        `.trim();
        componentsFolder?.file('VideoPlayerScene.brs', videoPlayerSceneBrs);
        
        // --- MOVIE POSTER COMPONENT (Unchanged) ---
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
