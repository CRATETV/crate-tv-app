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
'** Main Entry Point
'** This is the first function called when the channel starts.
'******************************************************************
Sub Main(args As Object)
    ' Enable memory monitoring events for certification requirements.
    ' This helps the channel manage memory usage effectively.
    app = CreateObject("roAppManager")
    app.EnableMemoryWarningEvent(true)
    app.EnableLowGeneralMemoryEvent(true)

    ' Pass any launch arguments (for deep linking) directly to the home screen function.
    ShowChannelHomeScreen(args)
End Sub

'******************************************************************
'** ShowChannelHomeScreen
'** Initializes and displays the main scene of the channel.
'******************************************************************
Sub ShowChannelHomeScreen(args as Object)
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    m.scene = screen.CreateScene("HomeScene")

    ' Pass launch parameters to the scene if they exist and are valid.
    if Type(args) = "roAssociativeArray" AND args.DoesExist("contentID")
        m.scene.setField("launchParams", args)
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
    <interface>
        <field id="launchParams" type="assocarray" />
    </interface>
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
    m.deepLinkedContentId = invalid

    m.top.observeField("launchParams", "onLaunchParamsSet")

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
                ' Fire beacon on failure to load feed, as an error screen is still a "first screen".
                CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
            end if
            exit while
        end if
    end while
End Sub

Sub onLaunchParamsSet()
    params = m.top.launchParams
    if params <> invalid AND params.DoesExist("contentID")
        m.deepLinkedContentId = params.contentID
    end if
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
        m.loadingLabel.visible = false
        m.movieRowList.visible = true
        m.movieRowList.setFocus(true)
        
        ' CERTIFICATION FIX: Fire the AppLaunchComplete beacon immediately after the home screen
        ' is rendered and interactive. This completes the "launch" phase.
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")

        ' CERTIFICATION FIX: After the launch is officially complete, handle any deep linking.
        ' This separates the two required actions cleanly.
        if m.deepLinkedContentId <> invalid
            PlayDeepLinkedContent(m.deepLinkedContentId)
            m.deepLinkedContentId = invalid
        end if
    else
        m.loadingLabel.text = "Failed to parse feed data or feed is empty."
        ' CERTIFICATION FIX: Also fire beacon if the app launches to an error state.
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
    end if
End Sub

Sub PlayDeepLinkedContent(contentId as String)
    content = m.movieRowList.content
    if content <> invalid
        for i = 0 to content.getChildCount() - 1
            row = content.getChild(i)
            if row <> invalid
                for j = 0 to row.getChildCount() - 1
                    movie = row.getChild(j)
                    if movie <> invalid AND movie.id = contentId
                        playMovie(movie)
                        return
                    end if
                end for
            end if
        end for
    end if
    print "Deep linked contentId not found: "; contentId
End Sub

Sub playMovie(movieNode as Object)
    if movieNode <> invalid AND movieNode.streamUrl <> invalid
        videoContent = CreateObject("roSGNode", "ContentNode")
        videoContent.stream = { url: movieNode.streamUrl }
        videoContent.title = movieNode.title

        m.videoPlayer.content = videoContent
        m.videoPlayer.streamFormat = "mp4"
        m.videoPlayer.visible = true
        m.videoPlayer.setFocus(true)
        m.videoPlayer.control = "play"

        m.movieRowList.visible = false
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