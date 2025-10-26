// This is a Vercel Serverless Function that generates a Roku channel package.
// It will be accessible at the path /api/generate-roku-zip
import JSZip from 'jszip';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// --- ROKU CHANNEL SOURCE CODE ---
// This section contains the complete, correct source code for the channel components.

const manifestContent = `
title=Crate TV
major_version=1
minor_version=0
build_version=8
bs_version=3.0
mm_icon_focus_hd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
`.trim();

const mainBrsContent = `
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
        <Rectangle id="background" color="0x1A1A1AFF" width="1920" height="1080" />

        <Label id="fontLoader">
            <font role="Roboto-Regular-40" uri="pkg:/fonts/Roboto-Regular.ttf" size="40" />
            <font role="Roboto-Regular-30" uri="pkg:/fonts/Roboto-Regular.ttf" size="30" />
            <font role="Roboto-Bold-40" uri="pkg:/fonts/Roboto-Bold.ttf" size="40" />
            <font role="Roboto-Bold-30" uri="pkg:/fonts/Roboto-Bold.ttf" size="30" />
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
                translation="[80, 80]"
                itemComponentName="MoviePoster"
                itemSize="[300, 235]"
                rowItemSpacing="[ [40, 0] ]"
                numRows="1"
                rowHeights="[235]"
                rowLabelOffset="[ [0, -50] ]"
                rowFocusAnimationStyle="floatingFocus"
                itemSpacing="[0, 60]"
            />
        </Group>

        <ContentTask id="contentTask" />
    </children>

</component>
`.trim();

const homeSceneBrs = `
function init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.contentGroup = m.top.findNode("contentGroup")
    m.contentRowList = m.top.findNode("contentRowList")
    
    ' Create a font object programmatically for the row labels. This is the correct method.
    rowFont = createObject("roSGNode", "Font")
    rowFont.uri = "pkg:/fonts/Roboto-Bold.ttf"
    rowFont.size = 30
    m.contentRowList.rowLabelFont = rowFont
    
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
        m.contentRowList.setFocus(true)
    else
        m.loadingLabel.text = "Error: Could not load content."
    end if
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

    <children>
        <Rectangle 
            id="focusRing"
            color="0x1A73E8FF"
            width="316"
            height="196"
            translation="[-8, -8]"
            visible="false" 
        />
        
        <Poster 
            id="tileImage"
            width="300"
            height="180"
        />

        <Label 
            id="tileLabel"
            width="300"
            horizAlign="center"
            translation="[0, 195]"
            color="0xFFFFFFFF"
        >
             <font role="Roboto-Regular-30" />
        </Label>
    </children>

</component>
`.trim();

const moviePosterBrs = `
function init()
    m.focusRing = m.top.findNode("focusRing")
    m.tileImage = m.top.findNode("tileImage")
    m.tileLabel = m.top.findNode("tileLabel")
    
    ' Create and store valid font objects for focus changes.
    m.regularFont = createObject("roSGNode", "Font")
    m.regularFont.uri = "pkg:/fonts/Roboto-Regular.ttf"
    m.regularFont.size = 30

    m.boldFont = createObject("roSGNode", "Font")
    m.boldFont.uri = "pkg:/fonts/Roboto-Bold.ttf"
    m.boldFont.size = 30
end function

' Populates the tile with data from the RowList content.
function onContentChange()
    content = m.top.itemContent
    if content <> invalid
        m.tileImage.uri = content.HDPosterUrl
        m.tileLabel.text = content.title
    end if
end function

' Handles focus state changes.
function onFocusChange()
    focusPercent = m.top.focusPercent
    
    if focusPercent = 1.0 ' When focused
        m.focusRing.visible = true
        m.tileLabel.font = m.boldFont
    else ' When unfocused
        m.focusRing.visible = false
        m.tileLabel.font = m.regularFont
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
' The main entry point for the Task node.
function main()
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
                if parsedJson <> invalid
                    m.top.content = createContentNode(parsedJson)
                else
                    print "ContentTask: Failed to parse JSON"
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
                item.title = movie.title
                item.HDPosterUrl = movie.HDPosterUrl
                item.description = movie.description
                item.streamUrl = movie.streamUrl
                row.appendChild(item)
            end for
            rowListContent.appendChild(row)
        end for
    end if
    
    return rowListContent
end function
`.trim();

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
        components?.file('MoviePoster.xml', moviePosterXml);
        components?.file('MoviePoster.brs', moviePosterBrs);
        components?.file('ContentTask.xml', contentTaskXml);
        components?.file('ContentTask.brs', contentTaskBrs);
        
        zip.folder('fonts');

        const [logoImage, splashImage] = await Promise.all([
            getS3Object(bucketName, logoKey),
            getS3Object(bucketName, splashKey),
        ]);

        const images = zip.folder('images');
        if (logoImage) images?.file('logo_400x90.png', logoImage);
        if (splashImage) {
            images?.file('splash_hd_1280x720.png', splashImage);
            images?.file('splash_fhd_1920x1080.png', splashImage);
        } else {
            const placeholder = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 120, 1, 99, 97, 0, 2, 0, 0, 25, 0, 5, 147, 10, 217, 160, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
            images?.file('splash_hd_1280x720.png', placeholder);
            images?.file('splash_fhd_1920x1080.png', placeholder);
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