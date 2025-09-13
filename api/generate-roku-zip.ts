
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
    print "--- Crate TV Channel Launch ---"
    print "Roku OS Version: "; CreateObject("roDeviceInfo").GetVersion()

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
    
    if scene = invalid
        print "FATAL ERROR: Scene object is invalid before screen.show()!"
        ' As a fallback, try to create HomeScene again to prevent a crash.
        scene = screen.CreateScene("HomeScene")
    end if

    print "Showing scene: "; scene.sub_type
    screen.show()
    print "--- Crate TV Channel Exit ---"
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
        
        <!-- A dedicated Task node to handle fetching data on the correct thread -->
        <ContentFetcherTask id="contentFetcher" />
    </children>
</component>
        `.trim();
        componentsFolder?.file('HomeScene.xml', homeSceneXml);
        
        const homeSceneBrs = `
' FIX: Implemented a more robust startup sequence using a Timer to prevent race conditions.
Sub init()
    print "[HomeScene.brs] >> init() ENTER"
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.mainGroup = m.top.findNode("mainGroup")
    m.carouselsGroup = m.top.findNode("carouselsGroup")
    m.launchBeaconFired = false
    m.firstRow = invalid ' Will hold the first created RowList for focus management

    m.top.setFocus(true)
    
    ' ROKU OS WORKAROUND: Use a Timer to reliably defer the start of the data fetch task.
    ' This prevents a potential race condition during scene initialization.
    m.fetchDelayTimer = m.top.createChild("Timer")
    m.fetchDelayTimer.repeat = false
    m.fetchDelayTimer.duration = 0.05 ' 50ms delay
    m.fetchDelayTimer.observeField("fire", "onFetchDelayTimerFired")
    m.fetchDelayTimer.control = "start"
    print "[HomeScene.brs] << init() EXIT. Fetch timer started."
End Sub

' This function is now called safely after the scene is fully initialized.
Sub onFetchDelayTimerFired()
    print "[HomeScene.brs] >> onFetchDelayTimerFired() ENTER"
    m.fetcher = m.top.findNode("contentFetcher")

    if m.fetcher = invalid
        print "[HomeScene.brs] FATAL ERROR: ContentFetcherTask node not found!"
        m.loadingLabel.text = "Error: Channel component failed to load."
        FireLaunchBeacon(false)
        return
    end if

    m.fetcher.observeField("output", "onFeedData")
    m.fetcher.uri = "${feedUrl}"
    m.fetcher.control = "RUN"
    print "[HomeScene.brs] << onFetchDelayTimerFired() EXIT. Fetcher task is running."
End Sub

' This function is called when the ContentFetcherTask has finished its work.
Sub onFeedData(event as object)
    print "[HomeScene.brs] >> onFeedData() ENTER"
    json = event.getData()
    if json <> invalid AND json.DoesExist("categories") AND json.categories.count() > 0
        
        yOffset = 0 ' Starting Y position for the first carousel title
        for i = 0 to json.categories.count() - 1
            category = json.categories[i]
            if category.movies.count() > 0
                titleLabel = m.carouselsGroup.createChild("Label")
                titleLabel.text = category.title
                titleLabel.translation = [90, yOffset]
                titleLabel.font = { size: 32 }
                yOffset = yOffset + 50

                row = m.carouselsGroup.createChild("RowList")
                row.translation = [90, yOffset]
                row.itemComponentName = "MoviePoster"
                row.itemSize = [240, 360]
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
                
                if m.firstRow = invalid then m.firstRow = row
                
                yOffset = yOffset + 420
            end if
        end for
        
        ShowHomeScreenUI()
    else
        m.loadingLabel.text = "Failed to parse feed data or feed is empty."
        FireLaunchBeacon(false)
    end if
    print "[HomeScene.brs] << onFeedData() EXIT"
End Sub

Sub ShowHomeScreenUI()
    print "[HomeScene.brs] >> ShowHomeScreenUI() ENTER"
    m.loadingLabel.visible = false
    m.mainGroup.visible = true
    if m.firstRow <> invalid then m.firstRow.setFocus(true)
    FireLaunchBeacon(true)
    print "[HomeScene.brs] << ShowHomeScreenUI() EXIT"
End Sub

' Launches the dedicated VideoPlayerScene for instant playback.
Sub onCarouselItemSelected(event as object)
    print "[HomeScene.brs] >> onCarouselItemSelected() ENTER"
    rowlist = event.getRoSGNode()
    selectedIndex = event.getData()
    selectedMovie = rowlist.content.getChild(selectedIndex[1])
    
    if selectedMovie <> invalid AND selectedMovie.id <> invalid
        scene = m.top.getScene()
        videoScene = scene.createScene("VideoPlayerScene")
        videoScene.setField("contentID", selectedMovie.id)
        scene.dialog = videoScene
    end if
    print "[HomeScene.brs] << onCarouselItemSelected() EXIT"
End Sub

' ROKU CERTIFICATION FIX: Fires the AppLaunchComplete beacon.
Sub FireLaunchBeacon(success as Boolean)
    if not m.launchBeaconFired
        print "[HomeScene.brs] Firing AppLaunchComplete beacon, success: "; success
        launchResult = "Failure"
        if success = true then launchResult = "Success"
        params = { "partner_id": "cratetv", "event_name": "AppLaunchComplete", "event_data": { "launch_result": launchResult } }
        CreateObject("roSystemLog").sendline(FormatJson(params))
        m.launchBeaconFired = true
    end if
End Sub

Function onKeyEvent() as Boolean
    return false ' Let OS handle back button to exit
End Function
        `.trim();
        componentsFolder?.file('HomeScene.brs', homeSceneBrs);
        
        // --- COMPONENT: ContentFetcherTask ---
        const contentFetcherTaskXml = `
<?xml version="1.0" encoding="UTF-8"?>
<component name="ContentFetcherTask" extends="Task">
    <interface>
        <field id="uri" type="string" />
        <field id="output" type="assocarray" />
        ' Add a control field to trigger the task run
        <field id="control" type="string" alias="TaskRunner.control" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/ContentFetcherTask.brs" />
</component>
        `.trim();
        componentsFolder?.file('ContentFetcherTask.xml', contentFetcherTaskXml);

        const contentFetcherTaskBrs = `
Sub init()
    m.top.functionName = "fetchContent"
End Sub

Sub fetchContent()
    print "[ContentFetcherTask.brs] >> fetchContent() ENTER"
    uri = m.top.uri
    if uri = invalid or uri = ""
        print "[ContentFetcherTask.brs] ERROR: No URI provided."
        return
    end if

    fetcher = CreateObject("roUrlTransfer")
    fetcher.SetCertificatesFile("common:/certs/ca-bundle.crt")
    fetcher.InitClientCertificates()
    fetcher.SetUrl(uri)
    
    port = CreateObject("roMessagePort")
    fetcher.SetMessagePort(port)
    
    if fetcher.AsyncGetToString()
        while true
            msg = wait(0, port)
            if type(msg) = "roUrlEvent"
                code = msg.GetResponseCode()
                if code = 200
                    print "[ContentFetcherTask.brs] Successfully fetched data."
                    m.top.output = ParseJson(msg.GetString())
                else
                    print "[ContentFetcherTask.brs] HTTP Error "; code
                    m.top.output = invalid
                end if
                exit while
            end if
        end while
    else
        print "[ContentFetcherTask.brs] ERROR: AsyncGetToString failed."
        m.top.output = invalid
    end if
    print "[ContentFetcherTask.brs] << fetchContent() EXIT"
End Sub
        `.trim();
        componentsFolder?.file('ContentFetcherTask.brs', contentFetcherTaskBrs);
        
        // --- COMPONENT: VideoPlayerScene ---
        const videoPlayerSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="VideoPlayerScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/VideoPlayerScene.brs" />
    <interface>
        <field id="contentID" type="string" />
    </interface>
    <children>
        <Label id="statusLabel" text="Loading video..." translation="[960, 540]" horizAlign="center" vertAlign="center" />
        <Video id="videoPlayer" width="1920" height="1080" visible="false" />
        <ContentFetcherTask id="contentFetcher" />
    </children>
</component>
        `.trim();
        componentsFolder?.file('VideoPlayerScene.xml', videoPlayerSceneXml);
        
        const videoPlayerSceneBrs = `
Sub init()
    print "[VideoPlayerScene.brs] >> init() ENTER"
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
    
    if m.top.contentID <> invalid AND m.top.contentID <> ""
        m.fetcher = m.top.findNode("contentFetcher")
        m.fetcher.observeField("output", "onFeedData")
        m.fetcher.control = "RUN"
        m.fetcher.uri = "${feedUrl}"
    else
        m.statusLabel.text = "Error: No content ID provided."
        FireLaunchBeacon(false)
    end if
    print "[VideoPlayerScene.brs] << init() EXIT"
End Sub

Sub onFeedData(event as object)
    print "[VideoPlayerScene.brs] >> onFeedData() ENTER"
    json = event.getData()
    movieData = FindMovieInFeed(json, m.top.contentID)
    if movieData <> invalid
        playMovie(movieData)
    else
        m.statusLabel.text = "Error: Content not found in feed."
        FireLaunchBeacon(false)
    end if
    print "[VideoPlayerScene.brs] << onFeedData() EXIT"
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
    print "[VideoPlayerScene.brs] >> playMovie() ENTER"
    videoContent = CreateObject("roSGNode", "ContentNode")
    videoContent.stream = { url: movieData.streamUrl }
    videoContent.title = movieData.title
    m.videoPlayer.content = videoContent
    m.videoPlayer.streamFormat = "mp4"
    m.statusLabel.visible = false
    m.videoPlayer.visible = true
    m.videoPlayer.setFocus(true)
    m.videoPlayer.control = "play"
    print "[VideoPlayerScene.brs] << playMovie() EXIT"
End Sub

Sub onVideoStateChange()
    state = m.videoPlayer.state
    if state = "playing" then FireLaunchBeacon(true)
    if state = "finished" or state = "error" then m.top.close = true
end sub

Sub FireLaunchBeacon(success as Boolean)
    if not m.launchBeaconFired
        print "[VideoPlayerScene.brs] Firing AppLaunchComplete beacon, success: "; success
        launchResult = "Failure"
        if success = true then launchResult = "Success"
        params = { "partner_id": "cratetv", "event_name": "AppLaunchComplete", "event_data": { "launch_result": launchResult } }
        CreateObject("roSystemLog").sendline(FormatJson(params))
        m.launchBeaconFired = true
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and key = "back"
        m.top.close = true
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
        <Rectangle id="focusRing" color="#E50914" width="252" height="372" translation="[-6, -6]" visible="false">
            <animations>
                <Animation id="focusAnimation" duration="0.3" easeFunction="easeOutQuint">
                    <Vector2DFieldInterpolator key="[0.0, 1.0]" field="scale" value="[ [1.0, 1.0], [1.05, 1.05] ]" />
                </Animation>
                <Animation id="unfocusAnimation" duration="0.3" easeFunction="easeOutQuint">
                     <Vector2DFieldInterpolator key="[0.0, 1.0]" field="scale" value="[ [1.05, 1.05], [1.0, 1.0] ]" />
                </Animation>
            </animations>
        </Rectangle>
    </children>
</component>
        `.trim();
        componentsFolder?.file('MoviePoster.xml', moviePosterXml);
        
        const moviePosterBrs = `
Sub init()
    m.top.observeField("focusPercent", "OnFocusChange")
    m.focusRing = m.top.findNode("focusRing")
    m.focusAnimation = m.top.findNode("focusAnimation")
    m.unfocusAnimation = m.top.findNode("unfocusAnimation")
End Sub

Sub onContentChange()
    itemContent = m.top.itemContent
    if itemContent <> invalid
        m.top.findNode("poster").uri = itemContent.HDPosterUrl
    end if
End Sub

Sub OnFocusChange()
    focusPercent = m.top.focusPercent
    if focusPercent > 0
        m.focusRing.visible = true
        m.focusAnimation.control = "start"
    else
        m.focusRing.visible = false
        m.unfocusAnimation.control = "start"
    end if
End Sub
        `.trim();
        componentsFolder?.file('MoviePoster.brs', moviePosterBrs);
        
        // --- Add image assets to the ZIP ---
        const imagesFolder = zip.folder('images');
        imagesFolder?.file('splash_hd_1280x720.png', placeholderHd_1280x720, { base64: true });
        imagesFolder?.file('splash_fhd_1920x1080.png', placeholderFhd_1920x1080, { base64: true });
        imagesFolder?.file('logo_400x90.png', placeholderLogo_400x90, { base64: true });

        // --- Generate and send the ZIP file ---
        const content = await zip.generateAsync({ type: 'blob' });
        
        return new Response(content, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="cratv.zip"',
            },
        });
    } catch (error) {
        console.error('Error generating Roku ZIP:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate Roku ZIP package.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
