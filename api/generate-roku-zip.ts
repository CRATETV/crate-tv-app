// This is a Vercel Serverless Function that generates a Roku channel package.
// It will be accessible at the path /api/generate-roku-zip
import JSZip from 'jszip';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const splashKey = "Crate TV Splash.png";
const logoKey = "ruko logo .webp";

let s3Client: S3Client | null = null;
const getS3Client = () => {
    if (s3Client) return s3Client;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;

    if (!accessKeyId || !secretAccessKey || !region) {
        console.error("AWS S3 credentials are not configured for Roku ZIP generation.");
        return null;
    }
    
    if (region === 'global') {
        region = 'us-east-1';
    }

    s3Client = new S3Client({
        region: region,
        credentials: { accessKeyId, secretAccessKey },
    });
    return s3Client;
}

const getS3Object = async (bucket: string, key: string): Promise<Uint8Array> => {
    const client = getS3Client();
    if (!client) {
        throw new Error("S3 Client could not be initialized. Check server credentials.");
    }
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);
    if (!response.Body) {
        throw new Error(`S3 object body is empty for key: ${key}`);
    }
    return response.Body.transformToByteArray();
};


export async function GET(request: Request) {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("AWS_S3_BUCKET_NAME environment variable is not set.");
        }

        const feedUrl = 'https://cratetv.net/api/roku-feed';
        
        const [logoImage, splashImage] = await Promise.all([
            getS3Object(bucketName, logoKey),
            getS3Object(bucketName, splashKey),
        ]);

        const zip = new JSZip();

        const manifestContent = `
# Channel Info
title=Crate TV
major_version=1
minor_version=0
build_version=2
# Channel Artwork
mm_icon_focus_hd=pkg:/images/logo_400x90.png
mm_icon_side_hd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
# Channel Behavior
requires_payment=false
# Certification Requirements
supports_input_launch=1
bs_const=enable_app_launch_logging=true
        `.trim();
        zip.file('manifest', manifestContent);

        const mainBrsContent = `
Sub Main(args As Object)
    print ">> Crate TV Main() started"
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = invalid

    if Type(args) = "roAssociativeArray" AND args.DoesExist("contentID")
        print ">> Deep link detected. Launching VideoPlayerScene with contentID: "; args.contentID
        scene = screen.CreateScene("VideoPlayerScene")
        scene.contentID = args.contentID
    else
        print ">> Normal launch detected. Launching HomeScene."
        scene = screen.CreateScene("HomeScene")
    end if
    
    screen.show()
    print ">> screen.show() has been called. Entering event loop."
    
    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)

        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed()
                print ">> Screen closed event received. Exiting application."
                return
            end if
        end if
    end while
End Sub
        `.trim();
        zip.folder('source')?.file('main.brs', mainBrsContent);
        
        const componentsFolder = zip.folder('components');

        const homeSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />
    <children>
        <Rectangle id="background" color="#141414" width="1920" height="1080" />
        <Label id="loadingLabel" text="Loading..." translation="[960, 540]" horizAlign="center" vertAlign="center" />
        
        <Group id="mainGroup" visible="false">
            <Group id="heroGroup">
                <Poster id="heroPoster" width="1920" height="600" />
                <Rectangle id="gradientOverlay" width="1920" height="600" color="0x00000000">
                    <color stopOffset="0.0" color="0x00000000" />
                    <color stopOffset="0.4" color="0x00000000" />
                    <color stopOffset="1.0" color="0x141414FF" />
                </Rectangle>
                <Group id="heroTextGroup" translation="[90, 350]">
                    <Label id="heroTitle" text="" width="1000">
                        <font role="font" size="52" />
                    </Label>
                    <Label id="heroSynopsis" text="" translation="[0, 70]" width="800" height="100" wrap="true" maxLines="2">
                        <font role="font" size="28" />
                    </Label>
                </Group>
            </Group>
            
            <Group id="carouselsGroup" translation="[0, 600]" />
        </Group>
    </children>
</component>
        `.trim();
        componentsFolder?.file('HomeScene.xml', homeSceneXml);
        
        const homeSceneBrs = `
Sub init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.mainGroup = m.top.findNode("mainGroup")
    m.carouselsGroup = m.top.findNode("carouselsGroup")
    
    m.heroPoster = m.top.findNode("heroPoster")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroSynopsis = m.top.findNode("heroSynopsis")

    m.launchBeaconFired = false 
    m.heroControllerRow = invalid

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
        
        yOffset = 0
        for i = 0 to json.categories.count() - 1
            category = json.categories[i]
            if category.DoesExist("movies") AND category.movies.count() > 0
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
                    item.HDPosterUrl = movie.HDPosterUrl
                    item.heroImage = movie.heroImage
                    item.streamUrl = movie.streamUrl
                end for
                row.content = rowContent
                
                row.observeField("itemFocused", "onItemFocused")
                row.observeField("itemSelected", "onCarouselItemSelected")
                
                if i = 0
                    m.heroControllerRow = row
                end if
                
                yOffset = yOffset + 420
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
    if m.heroControllerRow <> invalid
        m.top.setFocus(m.heroControllerRow)
        firstItem = m.heroControllerRow.content.getChild(0)
        if firstItem <> invalid
            UpdateHero(firstItem)
        end if
    end if
    FireLaunchBeacon()
End Sub

Sub UpdateHero(movieData as object)
    if movieData <> invalid
        m.heroPoster.uri = movieData.heroImage
        m.heroTitle.text = movieData.title
        m.heroSynopsis.text = movieData.description
    end if
End Sub

Sub onItemFocused(event as object)
    rowlist = event.getRoSGNode()
    focusedIndex = event.getData()
    focusedMovie = rowlist.content.getChild(focusedIndex[1])

    if focusedMovie <> invalid
      if rowlist = m.heroControllerRow
          UpdateHero(focusedMovie)
      end if
    end if
End Sub

Sub onCarouselItemSelected(event as object)
    rowlist = event.getRoSGNode()
    selectedIndex = event.getData()
    selectedMovie = rowlist.content.getChild(selectedIndex[1])
    
    if selectedMovie <> invalid AND selectedMovie.id <> invalid
        scene = m.top.getScene()
        videoScene = scene.createScene("VideoPlayerScene")
        videoScene.contentID = selectedMovie.id
        scene.dialog = videoScene
    end if
End Sub

Sub FireLaunchBeacon()
    if not m.launchBeaconFired
        CreateObject("roSystemLog").sendline("Roku AppLaunchComplete")
        m.launchBeaconFired = true
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    return false
End Function
        `.trim();
        componentsFolder?.file('HomeScene.brs', homeSceneBrs);
        
        const videoPlayerSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="VideoPlayerScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/VideoPlayerScene.brs" />
    <interface>
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
    movieDetailsUrl = "https://cratetv.net/api/roku-movie-details?id=" + contentId
    m.fetcher.SetCertificatesFile("common:/certs/ca-bundle.crt")
    m.fetcher.InitClientCertificates()
    m.fetcher.SetUrl(movieDetailsUrl)
    m.fetcher.observeField("status", "onFeedStatusChange")
    m.fetcher.AsyncGetToString()
End Sub

Sub onFeedStatusChange()
    status = m.fetcher.status
    if status = "completed"
        responseCode = m.fetcher.GetResponseCode()
        if responseCode = 200
            json = ParseJson(m.fetcher.GetString())
            if json <> invalid AND json.DoesExist("streamUrl")
                playMovie(json)
            else
                m.statusLabel.text = "Error: Invalid movie data received."
                FireLaunchBeacon()
            end if
        else
            m.statusLabel.text = "Error loading content: " + responseCode.ToStr()
            FireLaunchBeacon()
        end if
    else if status = "error"
        m.statusLabel.text = "Failed to load content."
        FireLaunchBeacon()
    end if
End Sub

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
        m.top.close = true
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
        m.top.close = true
        return true
    end if
    return false
End Function
        `.trim();
        componentsFolder?.file('VideoPlayerScene.brs', videoPlayerSceneBrs);
        
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
    </children>
</component>
        `.trim();
        componentsFolder?.file('MoviePoster.xml', moviePosterXml);
        
        const moviePosterBrs = `
Sub init()
    m.poster = m.top.findNode("poster")
    ' Observe the focusPercent field, which is a value from 0.0 to 1.0
    ' indicating if the item has focus in a RowList.
    m.top.observeField("focusPercent", "onFocusChange")
End Sub

Sub onContentChange()
    itemContent = m.top.itemContent
    if itemContent <> invalid AND itemContent.HDPosterUrl <> invalid
        m.poster.uri = itemContent.HDPosterUrl
    end if
End Sub

Sub onFocusChange()
    focusPercent = m.top.focusPercent
    ' A simple, robust scale effect applied directly to the component's group.
    ' This replaces the more complex and error-prone Animation node.
    if focusPercent = 1.0
        m.top.scale = [1.05, 1.05]
    else
        m.top.scale = [1.0, 1.0]
    end if
End Sub
        `.trim();
        componentsFolder?.file('MoviePoster.brs', moviePosterBrs);

        const imagesFolder = zip.folder('images');
        imagesFolder?.file('logo_400x90.png', logoImage);
        imagesFolder?.file('splash_hd_1280x720.png', splashImage);
        imagesFolder?.file('splash_fhd_1920x1080.png', splashImage);

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