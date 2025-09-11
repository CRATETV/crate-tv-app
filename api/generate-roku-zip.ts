// This is a Vercel Serverless Function that generates a Roku channel package.
// It will be accessible at the path /api/generate-roku-zip
import JSZip from 'jszip';

// Base64 encoded placeholder images for the Roku channel package
const placeholderHd_1280x720 = "iVBORw0KGgoAAAANSUhEUgAABQAAAAACgAQMAAADW3NdbAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABNJREFUeF7twQEBAAAAgiD/r25IQAEAWQEbAAEa4cOjAAAAAElFTkSuQmCC";
const placeholderFhd_1920x1080 = "iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4AQMAAADo/U5XAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABhJREFUeF7twQEBAAAAgiD/r25IQAEA/g8BIgABgaU+NQAAAABJRU5ErkJggg==";
const placeholderLogo_400x90 = "iVBORw0KGgoAAAANSUhEUgAAAZAAAABaAQMAAADoBH4LAAAABlBMVEUAAAAAAAACVfYgAAAAAXRSTlMAQObYZgAAABVJREFUeF7twQEBAAAAgiD/r25IQAEA+gMB2QABtLgN3wAAAABJRU5ErkJggg==";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const host = url.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const feedUrl = `${protocol}://${host}/api/roku-feed`;

        const zip = new JSZip();

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