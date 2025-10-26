import JSZip from 'jszip';
// FIX: Using a namespace import for the AWS S3 client to avoid potential type conflicts that may be causing the 'send' method error.
import * as S3 from "@aws-sdk/client-s3";

// --- ROKU CHANNEL SOURCE CODE ---
// This section contains the complete, correct source code for the channel components.

const manifestContent = `
title=Crate TV
major_version=1
minor_version=1
build_version=1
mm_icon_focus_hd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
`.trim();

const mainBrsContent = `
' Crate TV Roku Channel
' Version 2.0 - Stability Update
sub main()
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.setMessagePort(port)
    
    screen.createScene("HomeScene")
    screen.show()

    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
`.trim();

const homeSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Scene">

    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />

    <children>
        <Rectangle id="background" color="0x141414FF" width="1920" height="1080" />

        <Label id="fontLoader" visible="false">
            <font role="Roboto-Regular-30" uri="pkg:/fonts/Roboto-Regular.ttf" size="30" />
            <font role="Roboto-Bold-30" uri="pkg:/fonts/Roboto-Bold.ttf" size="30" />
            <font role="Roboto-Regular-40" uri="pkg:/fonts/Roboto-Regular.ttf" size="40" />
            <font role="Roboto-Bold-60" uri="pkg:/fonts/Roboto-Bold.ttf" size="60" />
        </Label>
        
        <Label 
            id="loadingLabel"
            text="Loading Crate TV..."
            translation="[960, 540]"
            horizAlign="center"
            vertAlign="center"
            color="0xFFFFFFFF"
        >
            <font role="Roboto-Regular-40" />
        </Label>
        
        <Group id="contentGroup" visible="false">
            <RowList 
                id="contentRowList"
                translation="[80, 120]"
                itemComponentName="MoviePoster"
                itemSize="[250, 215]"
                rowItemSpacing="[ [30, 0] ]"
                numRows="1"
                rowHeights="[215]"
                rowLabelOffset="[ [0, -50] ]"
                rowFocusAnimationStyle="floatingFocus"
                itemSpacing="[0, 100]"
            />
        </Group>

        <ContentTask id="contentTask" />
    </children>

</component>
`.trim();

const homeSceneBrs = `
function getFontByRole(role as string) as object
    fontLoader = m.top.findNode("fontLoader")
    if fontLoader <> invalid
        for each font in fontLoader.fonts
            if font.role = role
                return font
            end if
        end for
    end if
    return invalid
end function

function init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.contentGroup = m.top.findNode("contentGroup")
    m.contentRowList = m.top.findNode("contentRowList")
    
    m.contentRowList.rowLabelFont = getFontByRole("Roboto-Bold-30")
    
    m.contentTask = m.top.findNode("contentTask")
    m.contentTask.observeField("content", "onContentLoaded")
    m.contentTask.url = "https://cratetv.net/api/roku-feed"
    m.contentTask.control = "RUN"
end function

function onContentLoaded(event as object)
    contentNode = event.getData()
    if contentNode <> invalid and contentNode.getChildCount() > 0
        m.contentRowList.content = contentNode
        m.loadingLabel.visible = false
        m.contentGroup.visible = true
        m.top.setFocus(m.contentRowList)
    else
        m.loadingLabel.text = "Error: Could not load content from the server."
    end if
end function

function onKeyEvent(key as string, press as boolean) as boolean
    if press
        if key = "OK"
            if m.contentRowList.hasFocus()
                selectedIndices = m.contentRowList.rowItemSelected
                if selectedIndices <> invalid and selectedIndices.count() = 2
                    rowIndex = selectedIndices[0]
                    itemIndex = selectedIndices[1]
                    movieData = m.contentRowList.content.getChild(rowIndex).getChild(itemIndex)
                    
                    if movieData <> invalid
                        detailsScene = createObject("roSGNode", "DetailsScene")
                        detailsScene.content = movieData
                        m.top.getScene().showScene(detailsScene)
                        return true
                    end if
                end if
            end if
        end if
    end if
    return false
end function
`.trim();

const moviePosterXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MoviePoster" extends="Group">

    <script type="text/brightscript" uri="pkg:/components/MoviePoster.brs" />

    <interface>
        <field id="itemContent" type="node" onChange="onContentChange" />
        <field id="focusPercent" type="float" onChange="onFocusChange" />
    </interface>
    
    <animations>
        <Animation id="scaleUp" duration="0.2" easeFunction="linear" >
            <Vector2DFieldInterpolator key="[0.0, 1.0]" field="scale" value="[ [1.0, 1.0], [1.1, 1.1] ]" />
        </Animation>
        <Animation id="scaleDown" duration="0.2" easeFunction="linear" >
            <Vector2DFieldInterpolator key="[0.0, 1.0]" field="scale" value="[ [1.1, 1.1], [1.0, 1.0] ]" />
        </Animation>
    </animations>

    <children>
        <Rectangle 
            id="focusRing"
            color="0x8b5cf6FF"
            width="266"
            height="166"
            translation="[-8, -8]"
            visible="false" 
        />
        
        <Poster 
            id="tileImage"
            width="250"
            height="150"
        />

        <Label 
            id="tileLabel"
            width="250"
            horizAlign="center"
            translation="[0, 165]"
            color="0xFFFFFFFF"
        >
             <font role="Roboto-Regular-30" />
        </Label>
    </children>

</component>
`.trim();

const moviePosterBrs = `
function getFontByRole(role as string) as object
    scene = getScene()
    if scene = invalid then return invalid
    
    fontLoader = scene.findNode("fontLoader")
    if fontLoader <> invalid
        for each font in fontLoader.fonts
            if font.role = role
                return font
            end if
        end for
    end if
    return invalid
end function

function init()
    m.focusRing = m.top.findNode("focusRing")
    m.tileImage = m.top.findNode("tileImage")
    m.tileLabel = m.top.findNode("tileLabel")
    
    m.regularFont = getFontByRole("Roboto-Regular-30")
    m.boldFont = getFontByRole("Roboto-Bold-30")
    
    m.scaleUp = m.top.findNode("scaleUp")
    m.scaleDown = m.top.findNode("scaleDown")
end function

function onContentChange()
    content = m.top.itemContent
    if content <> invalid
        m.tileImage.uri = content.HDPosterUrl
        m.tileLabel.text = content.title
    end if
end function

function onFocusChange()
    focusPercent = m.top.focusPercent
    
    if focusPercent = 1.0
        m.focusRing.visible = true
        if m.boldFont <> invalid then m.tileLabel.font = m.boldFont
        m.scaleUp.start()
    else
        m.focusRing.visible = false
        if m.regularFont <> invalid then m.tileLabel.font = m.regularFont
        m.scaleDown.start()
    end if
end function
`.trim();

const contentTaskXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="ContentTask" extends="Task">
    <interface>
        <field id="url" type="string" />
        <field id="content" type="node" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/ContentTask.brs" />
</component>
`.trim();

const contentTaskBrs = `
function init()
    m.top.functionName = "fetchContent"
end function

function fetchContent()
    url = m.top.url
    port = createObject("roMessagePort")
    request = createObject("roUrlTransfer")
    request.setCertificatesFile("common:/certs/ca-bundle.crt")
    request.initClientCertificates()
    request.setMessagePort(port)
    request.setUrl(url)
    
    if request.asyncGetToString()
        msg = wait(30000, port) ' 30 second timeout
        if type(msg) = "roUrlEvent"
            if msg.getResponseCode() = 200
                jsonString = msg.getString()
                parsedJson = parseJson(jsonString)
                if parsedJson <> invalid and parsedJson.categories <> invalid
                    m.top.content = createContentNode(parsedJson)
                else
                    print "ContentTask: Failed to parse JSON or 'categories' key missing"
                    m.top.content = invalid
                end if
            else
                print "ContentTask: HTTP Error: "; msg.getResponseCode()
                m.top.content = invalid
            end if
        else
            print "ContentTask: Request timeout or error"
            m.top.content = invalid
        end if
    else
        print "ContentTask: Failed to start async request"
        m.top.content = invalid
    end if
end function

function createContentNode(data as object) as object
    rowListContent = createObject("roSGNode", "ContentNode")
    
    if data.categories <> invalid
        for each category in data.categories
            row = createObject("roSGNode", "ContentNode")
            row.title = category.title
            
            for each movie in category.movies
                item = createObject("roSGNode", "ContentNode")
                for each field in movie
                    item.setField(field, movie[field])
                end for
                row.appendChild(item)
            end for
            rowListContent.appendChild(row)
        end for
    end if
    
    return rowListContent
end function
`.trim();

const detailsSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="DetailsScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/DetailsScene.brs" />
    <interface>
        <field id="content" type="node" onChange="onContentChange" />
    </interface>
    <children>
        <Rectangle id="background" color="0x141414FF" width="1920" height="1080" />
        <Poster id="heroImage" width="1920" height="1080" loadDisplayMode="scaleToFill" />
        <Rectangle id="vignette" color="0x000000FF" width="1920" height="1080" opacity="0.8">
            <Gradient id="fade" gradient="linear" startColor="0x00000000" endColor="0x141414FF" direction="up" />
        </Rectangle>
        <Group translation="[80, 500]">
            <Label id="titleLabel" width="1200" wrap="true">
                <font role="Roboto-Bold-60" />
            </Label>
            <Label id="descriptionLabel" width="1000" wrap="true" translation="[0, 90]" maxLines="5" color="0xC8C8C8FF">
                <font role="Roboto-Regular-30" />
            </Label>
            <ButtonGroup id="buttonGroup" translation="[0, 280]" itemSpacings="[20]">
                <Button id="playButton" text="Play" />
                <Button id="backButton" text="Back" />
            </ButtonGroup>
        </Group>
    </children>
</component>
`.trim();

const detailsSceneBrs = `
function init()
    m.heroImage = m.top.findNode("heroImage")
    m.titleLabel = m.top.findNode("titleLabel")
    m.descriptionLabel = m.top.findNode("descriptionLabel")
    m.buttonGroup = m.top.findNode("buttonGroup")
    m.top.setFocus(m.buttonGroup)
end function

function onContentChange()
    content = m.top.content
    if content <> invalid
        m.heroImage.uri = content.heroImage
        m.titleLabel.text = content.title
        m.descriptionLabel.text = content.description
    end if
end function

function onKeyEvent(key as string, press as boolean) as boolean
    if press
        if key = "OK"
            focusedButton = m.buttonGroup.focusedChild
            if focusedButton <> invalid
                if focusedButton.id = "playButton"
                    videoScene = createObject("roSGNode", "VideoScene")
                    videoScene.content = m.top.content
                    m.top.getScene().showScene(videoScene)
                    return true
                else if focusedButton.id = "backButton"
                    m.top.close = true
                    return true
                end if
            end if
        else if key = "back"
            m.top.close = true
            return true
        end if
    end if
    return false
end function
`.trim();

const videoSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="VideoScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/VideoScene.brs" />
    <interface>
        <field id="content" type="node" onChange="onContentChange" />
    </interface>
    <children>
        <Video id="videoPlayer" width="1920" height="1080" />
    </children>
</component>
`.trim();

const videoSceneBrs = `
function init()
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.videoPlayer.observeField("state", "onVideoStateChange")
    m.top.setFocus(m.videoPlayer)
end function

function onContentChange()
    content = m.top.content
    if content <> invalid and content.streamUrl <> invalid and content.streamUrl <> ""
        videoContent = createObject("roSGNode", "ContentNode")
        videoContent.url = content.streamUrl
        videoContent.streamformat = "mp4"
        
        m.videoPlayer.content = videoContent
        m.videoPlayer.control = "play"
    else
        print "VideoScene: No valid streamUrl provided. Closing scene."
        m.top.close = true
    end if
end function

function onVideoStateChange(event as object)
    state = event.getData()
    if state = "finished" or state = "error"
        m.videoPlayer.control = "stop"
        m.top.close = true
    end if
end function

function onKeyEvent(key as string, press as boolean) as boolean
    if press and key = "back"
        m.videoPlayer.control = "stop"
        m.top.close = true
        return true
    end if
    return false
end function
`.trim();

// --- END OF ROKU SOURCE ---

const splashKey = "Crate TV Splash.png";
const logoKey = "ruko logo .webp";

let s3Client: S3.S3Client | null = null;
const getS3Client = () => {
    if (s3Client) return s3Client;
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_REGION } = process.env;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_REGION) return null;
    s3Client = new S3.S3Client({
        region: AWS_S3_REGION === 'global' ? 'us-east-1' : AWS_S3_REGION,
        credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });
    return s3Client;
}

const getS3Object = async (bucket: string, key: string): Promise<Uint8Array> => {
    const client = getS3Client();
    if (!client) throw new Error("S3 client could not be initialized. Check server environment variables.");
    try {
        const command = new S3.GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await client.send(command);
        if (!response.Body) throw new Error(`S3 object body is empty for key: ${key}`);
        return await response.Body.transformToByteArray();
    } catch (error) {
        console.error(`Failed to fetch S3 object '${key}':`, error);
        throw new Error(`Could not download required channel asset: ${key}. Please check if the file exists in the S3 bucket and that bucket permissions are correct.`);
    }
};

const getHttpObject = async (url: string): Promise<Uint8Array> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error fetching asset! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    } catch (error) {
        console.error(`Failed to fetch HTTP object from '${url}':`, error);
        throw new Error(`Could not download required channel asset from URL: ${url}.`);
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
        components?.file('MoviePoster.xml', moviePosterXml);
        components?.file('MoviePoster.brs', moviePosterBrs);
        components?.file('ContentTask.xml', contentTaskXml);
        components?.file('ContentTask.brs', contentTaskBrs);
        components?.file('DetailsScene.xml', detailsSceneXml);
        components?.file('DetailsScene.brs', detailsSceneBrs);
        components?.file('VideoScene.xml', videoSceneXml);
        components?.file('VideoScene.brs', videoSceneBrs);

        
        const fontsFolder = zip.folder('fonts');

        // Fetch fonts from a public CDN to remove S3 dependency
        const fontRegularUrl = "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/Roboto-Regular.ttf";
        const fontBoldUrl = "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/Roboto-Bold.ttf";

        // Fetch assets. Logo/splash from S3, fonts from CDN.
        const [logoImage, splashImage, fontRegular, fontBold] = await Promise.all([
            getS3Object(bucketName, logoKey),
            getS3Object(bucketName, splashKey),
            getHttpObject(fontRegularUrl),
            getHttpObject(fontBoldUrl)
        ]);
        
        fontsFolder?.file('Roboto-Regular.ttf', fontRegular);
        fontsFolder?.file('Roboto-Bold.ttf', fontBold);

        const images = zip.folder('images');
        images?.file('logo_400x90.png', logoImage);
        images?.file('splash_hd_1280x720.png', splashImage);
        images?.file('splash_fhd_1920x1080.png', splashImage);

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