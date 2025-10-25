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
build_version=2
mm_icon_focus_hd=pkg:/images/logo_400x90.png
mm_icon_focus_sd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
`;

const mainBrsContent = `
sub main(args as object)
    showHomeScreen()
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
        
        <VideoPlayer id="videoPlayer" visible="false" />

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
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.videoPlayer.observeField("visible", "onVideoPlayerVisibilityChange")

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
    if m.content.categories = invalid or m.content.categories.count() = 0
        m.loadingLabel.text = "No content available."
        m.loadingLabel.visible = true
        m.mainGroup.visible = false
        return
    end if

    for i = 0 to m.content.categories.count() - 1
        category = m.content.categories[i]
        
        if category <> invalid and category.movies <> invalid and category.movies.count() > 0
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
            for j = 0 to category.movies.count() - 1
                movie = category.movies[j]
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
    
    firstRowList = m.carouselsGroup.getChild(1)
    if firstRowList <> invalid and firstRowList.content <> invalid and firstRowList.content.getChildCount() > 0
        firstMovie = firstRowList.content.getChild(0)
        updateHero(firstMovie)
    end if
end function

function onRowItemSelected(event as object)
    rowlist = event.getRoSGNode()
    selectedIndex = event.getData()
    selectedMovie = rowlist.content.getChild(selectedIndex)
    
    if selectedMovie <> invalid
        m.mainGroup.visible = false
        m.videoPlayer.contentID = selectedMovie.id
        m.videoPlayer.visible = true
        m.videoPlayer.setFocus(true)
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

function onVideoPlayerVisibilityChange(event as object)
    isVisible = event.getData()
    if not isVisible
        m.mainGroup.visible = true
        m.top.setFocus(true)
        m.videoPlayer.contentID = invalid
        m.videoPlayer.control = "stop"
    end if
end function
`;

const videoPlayerXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="VideoPlayer" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/VideoPlayer.brs" />
    <interface>
        <field id="contentID" type="string" onChange="onContentIDChange" />
        <field id="control" type="string" onChange="onControlChange" />
    </interface>
    <children>
        <Rectangle id="background" color="0x000000FF" width="1920" height="1080" />
        <Label 
            id="statusLabel" 
            text="Loading video..." 
            translation="[960, 540]" 
            horizAlign="center" 
            vertAlign="center" />
        <Video
            id="videoPlayerNode"
            width="1920"
            height="1080"
            visible="false"
        />
    </children>
</component>
`;

const videoPlayerBrs = `
function init()
    m.statusLabel = m.top.findNode("statusLabel")
    m.videoPlayerNode = m.top.findNode("videoPlayerNode")
    m.videoPlayerNode.observeField("state", "onVideoStateChange")
    
    m.contentTask = createObject("roSGNode", "ContentTask")
    m.contentTask.observeField("content", "onContentLoaded")
end function

function onContentIDChange()
    contentID = m.top.contentID
    if contentID <> invalid and contentID <> ""
        m.statusLabel.visible = true
        m.videoPlayerNode.visible = false
        m.contentTask.contentID = contentID
        m.contentTask.control = "RUN"
    else
        m.videoPlayerNode.control = "stop"
    end if
end function

function onContentLoaded(event as object)
    fullMovieData = event.getData()
    if fullMovieData <> invalid and fullMovieData.streamUrl <> invalid and fullMovieData.streamUrl <> ""
        contentNode = createObject("roSGNode", "ContentNode")
        contentNode.url = fullMovieData.streamUrl
        contentNode.title = fullMovieData.title
        m.videoPlayerNode.content = contentNode
        
        m.statusLabel.visible = false
        m.videoPlayerNode.visible = true
        m.videoPlayerNode.control = "play"
        m.videoPlayerNode.setFocus(true)
    else
        m.statusLabel.text = "Could not load video."
    end if
end function

function onVideoStateChange(event as object)
    state = event.getData()
    if state = "finished" or state = "error"
        m.top.visible = false
    end if
end function

function onControlChange()
    if m.top.control = "stop"
        m.videoPlayerNode.control = "stop"
    end if
end function

function onKeyEvent(key as string, press as boolean) as boolean
    if press and key = "back"
        m.videoPlayerNode.control = "stop"
        m.top.visible = false
        return true
    end if
    return false
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
                    m.top.content = invalid
                end if
            else
                print "HTTP Error: "; msg.getResponseCode()
                m.top.content = invalid
            end if
        else
            print "Request timeout or error"
            m.top.content = invalid
        end if
    else
         m.top.content = invalid
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
        components?.file('VideoPlayer.xml', videoPlayerXml);
        components?.file('VideoPlayer.brs', videoPlayerBrs);
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