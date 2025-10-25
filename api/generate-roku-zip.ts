
// This is a Vercel Serverless Function that generates a Roku channel package.
// It will be accessible at the path /api/generate-roku-zip
import JSZip from 'jszip';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// --- ROKU CHANNEL SOURCE CODE ---
// All source is now embedded here to prevent file encoding (BOM) issues.

const manifestContent = `
title=Crate TV
major_version=1
minor_version=0
build_version=1
mm_icon_focus_hd=pkg:/images/logo_400x90.png
mm_icon_focus_sd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
`;

const mainBrsContent = `
sub main(args as object)
    if args <> invalid and args.contentid <> invalid
        screen = CreateObject("roSGScreen")
        port = CreateObject("roMessagePort")
        screen.setMessagePort(port)
        
        scene = screen.createScene("VideoPlayerScene")
        scene.contentID = args.contentid
        screen.control = "RUN"
        screen.show()

        while true
            msg = wait(0, port)
            if type(msg) = "roSGScreenEvent"
                if msg.isScreenClosed() then return
            end if
        end while
    else
        showHomeScreen()
    end if
end sub

sub showHomeScreen()
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.setMessagePort(port)
    
    scene = screen.createScene("HomeScene")
    screen.show()

    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
`;

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
                <Poster width="1200" height="600" color="0x141414FF" blendColor="0x14141400" orientation="horizontal" />
                <Poster width="1920" height="250" translation="[0, 350]" color="0x14141400" blendColor="0x141414FF" />
                <Group id="heroTextGroup" translation="[90, 350]">
                    <Label id="heroTitle" text="" width="1000"><font role="font" size="52" /></Label>
                    <Label id="heroSynopsis" text="" translation="[0, 70]" width="800" height="100" wrap="true" maxLines="2"><font role="font" size="28" /></Label>
                    <Label id="playHintLabel" text="Press OK to Play" translation="[0, 180]" width="800"><font role="font" size="24" color="#A0A0A0FF" /></Label>
                </Group>
            </Group>
            <Group id="carouselsGroup" translation="[0, 600]" />
        </Group>
    </children>
</component>
`;

const homeSceneBrs = `
function init()
    m.top.background = m.top.findNode("background")
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.mainGroup = m.top.findNode("mainGroup")
    m.heroPoster = m.top.findNode("heroPoster")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroSynopsis = m.top.findNode("heroSynopsis")
    m.playHintLabel = m.top.findNode("playHintLabel")
    m.carouselsGroup = m.top.findNode("carouselsGroup")

    m.contentTask = createObject("roSGNode", "ContentTask")
    m.contentTask.observeField("content", "onContentLoaded")
    m.contentTask.control = "RUN"
end function

function onContentLoaded(event as object)
    content = event.getData()
    if content <> invalid
        m.content = content
        createCarousels()
        m.loadingLabel.visible = false
        m.mainGroup.visible = true
        m.top.setFocus(true)
    else
        m.loadingLabel.text = "Failed to load content."
    end if
end function

function createCarousels()
    yOffset = 0
    for i = 0 to m.content.categories.getChildCount() - 1
        category = m.content.categories.getChild(i)
        
        if category <> invalid and category.movies <> invalid and category.movies.getChildCount() > 0
            categoryLabel = createObject("roSGNode", "Label")
            categoryLabel.text = category.title
            categoryLabel.translation = [90, yOffset]
            categoryLabel.font.size = 32
            m.carouselsGroup.appendChild(categoryLabel)
            yOffset += 50
            
            rowlist = createObject("roSGNode", "RowList")
            rowlist.translation = [0, yOffset]
            rowlist.itemSize = [320, 180]
            rowlist.itemComponentName = "MoviePoster"
            
            listContent = createObject("roSGNode", "ContentNode")
            for j = 0 to category.movies.getChildCount() - 1
                movie = category.movies.getChild(j)
                itemNode = createObject("roSGNode", "ContentNode")
                itemNode.addFields(movie)
                listContent.appendChild(itemNode)
            end for
            rowlist.content = listContent
            
            rowlist.observeField("rowItemSelected", "onRowItemSelected")
            rowlist.observeField("itemFocused", "onItemFocused")
            
            m.carouselsGroup.appendChild(rowlist)
            yOffset += 250
        end if
    end for
    
    ' Set initial hero
    firstRow = m.carouselsGroup.getChild(1)
    if firstRow <> invalid and firstRow.content <> invalid and firstRow.content.getChildCount() > 0
        firstMovie = firstRow.content.getChild(0)
        updateHero(firstMovie)
    end if
end function

function onRowItemSelected(event as object)
    rowlist = event.getRoSGNode()
    selectedIndex = event.getData()
    selectedMovie = rowlist.content.getChild(selectedIndex)
    
    if selectedMovie <> invalid
        ' Launch video player scene
        scene = m.top.getScene()
        videoScene = scene.createScene("VideoPlayerScene")
        videoScene.contentID = selectedMovie.id
        videoScene.control = "RUN"
        scene.show(videoScene)
    end if
end function

function onItemFocused(event as object)
    rowlist = event.getRoSGNode()
    focusedIndex = event.getData()
    focusedMovie = rowlist.content.getChild(focusedIndex)
    if focusedMovie <> invalid
        updateHero(focusedMovie)
    end if
end function

function updateHero(movie as object)
    m.heroPoster.uri = movie.heroImage
    m.heroTitle.text = movie.title
    m.heroSynopsis.text = movie.description
end function
`;

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
`;

const videoPlayerSceneBrs = `
function init()
    m.statusLabel = m.top.findNode("statusLabel")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.videoPlayer.observeField("state", "onVideoStateChange")
    
    m.contentTask = createObject("roSGNode", "ContentTask")
    m.contentTask.observeField("content", "onContentLoaded")

    m.top.observeField("wasClosed", "onSceneClosed")
end function

function onControlFieldChange()
    if m.top.control = "RUN"
        m.contentTask.contentID = m.top.contentID
        m.contentTask.control = "RUN"
    end if
end function

function onContentLoaded(event as object)
    movieData = event.getData()
    if movieData <> invalid and movieData.streamUrl <> invalid and movieData.streamUrl <> ""
        content = createObject("roSGNode", "ContentNode")
        content.url = movieData.streamUrl
        content.title = movieData.title
        m.videoPlayer.content = content
        
        m.statusLabel.visible = false
        m.videoPlayer.visible = true
        m.videoPlayer.control = "play"
        m.videoPlayer.setFocus(true)
    else
        m.statusLabel.text = "Could not load video."
    end if
end function

function onVideoStateChange(event as object)
    state = event.getData()
    if state = "finished"
        m.top.close = true
    else if state = "error"
        m.statusLabel.text = "Video playback error."
        m.statusLabel.visible = true
        m.videoPlayer.visible = false
    end if
end function

function onSceneClosed()
    m.videoPlayer.control = "stop"
end function
`;

const moviePosterXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MoviePoster" extends="Poster">
    <script type="text/brightscript" uri="pkg:/components/MoviePoster.brs" />
    <interface>
        <field id="itemContent" type="node" onChange="onContentChange" />
    </interface>
</component>
`;

const moviePosterBrs = `
function onContentChange()
    m.top.uri = m.top.itemContent.SDPosterUrl
end function
`;

const contentTaskXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="ContentTask" extends="Task">
    <interface>
        <field id="control" type="string" alwaysnotify="true" alias="nodecontrol" />
        <field id="contentID" type="string" alwaysnotify="true" />
        <field id="content" type="node" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/ContentTask.brs" />
</component>
`;

const contentTaskBrs = `
function init()
    m.top.functionName = "getContent"
end function

function getContent()
    if m.top.contentID <> invalid and m.top.contentID <> ""
        url = "https://cratetv.net/api/roku-movie-details?id=" + m.top.contentID
    else
        url = "https://cratetv.net/api/roku-feed"
    end if
    
    port = createObject("roMessagePort")
    request = createObject("roUrlTransfer")
    request.setMessagePort(port)
    request.setUrl(url)
    
    if request.asyncGetToString()
        msg = wait(30000, port) ' 30 second timeout
        if type(msg) = "roUrlEvent"
            if msg.getResponseCode() = 200
                jsonString = msg.getString()
                parsedJson = parseJson(jsonString)
                if parsedJson <> invalid
                    m.top.content = parsedJson
                else
                    print "Failed to parse JSON"
                end if
            else
                print "HTTP Error: "; msg.getResponseCode()
            end if
        else
            print "Request timeout or error"
        end if
    end if
end function
`;

// --- END OF ROKU SOURCE ---

const splashKey = "Crate TV Splash.png";
const logoKey = "ruko logo .webp";

let s3Client: S3Client | null = null;
const getS3Client = () => {
    if (s3Client) return s3Client;
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_REGION } = process.env;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_REGION) return null;
    s3Client = new S3Client({
        region: AWS_S3_REGION === 'global' ? 'us-east-1' : AWS_S3_REGION,
        credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });
    return s3Client;
}

const getS3Object = async (bucket: string, key: string): Promise<Uint8Array | null> => {
    const client = getS3Client();
    if (!client) return null;
    try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await client.send(command);
        return response.Body ? await response.Body.transformToByteArray() : null;
    } catch (error) {
        console.error(`Failed to fetch S3 object '${key}':`, error);
        return null;
    }
};

export async function GET(request: Request) {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not set.");
        
        const zip = new JSZip();

        zip.file('manifest', manifestContent);
        const source = zip.folder('source');
        source?.file('main.brs', mainBrsContent);

        const components = zip.folder('components');
        components?.file('HomeScene.xml', homeSceneXml);
        components?.file('HomeScene.brs', homeSceneBrs);
        components?.file('VideoPlayerScene.xml', videoPlayerSceneXml);
        components?.file('VideoPlayerScene.brs', videoPlayerSceneBrs);
        components?.file('MoviePoster.xml', moviePosterXml);
        components?.file('MoviePoster.brs', moviePosterBrs);
        components?.file('ContentTask.xml', contentTaskXml);
        components?.file('ContentTask.brs', contentTaskBrs);

        const [logoImage, splashImage] = await Promise.all([
            getS3Object(bucketName, logoKey),
            getS3Object(bucketName, splashKey),
        ]);

        const images = zip.folder('images');
        if (logoImage) images?.file('logo_400x90.png', logoImage);
        if (splashImage) {
            images?.file('splash_hd_1280x720.png', splashImage);
            images?.file('splash_fhd_1920x1080.png', splashImage);
        }

        const zipContent = await zip.generateAsync({ type: 'blob' });
        
        return new Response(zipContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="cratv.zip"'
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate Roku package: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
