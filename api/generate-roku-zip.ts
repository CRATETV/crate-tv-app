
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
build_version=3
bs_version=3.0
mm_icon_focus_hd=pkg:/images/logo_400x90.png
splash_screen_hd=pkg:/images/splash_hd_1280x720.png
splash_screen_fhd=pkg:/images/splash_fhd_1920x1080.png
`.trim();

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
`.trim();

const homeSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Scene">

    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />

    <children>
        <!-- Background color as per Step 4 -->
        <Rectangle id="background" color="#1A1A1A" width="1920" height="1080" />

        <!-- Font definitions as per Step 4. Font files must be placed in a /fonts directory. -->
        <Label id="fontLoader">
            <font role="Roboto-Regular-40" uri="pkg:/fonts/Roboto-Regular.ttf" size="40" />
            <font role="Roboto-Regular-30" uri="pkg:/fonts/Roboto-Regular.ttf" size="30" />
            <font role="Roboto-Bold-40" uri="pkg:/fonts/Roboto-Bold.ttf" size="40" />
            <font role="Roboto-Bold-30" uri="pkg:/fonts/Roboto-Bold.ttf" size="30" />
        </Label>
        
        <!-- Loading indicator -->
        <Label 
            id="loadingLabel"
            text="Loading Crate TV..."
            translation="[960, 540]"
            horizAlign="center"
            vertAlign="center"
        >
            <font role="Roboto-Regular-40" />
        </Label>
        
        <!-- Main content group, initially hidden -->
        <Group id="contentGroup" visible="false">
            <RowList 
                id="contentRowList"
                translation="[80, 80]" ' Side margin of 80px, top margin
                itemComponentName="MoviePoster"
                itemSize="[300, 235]" ' 300x180 image + 15px space + 40px label height
                rowItemSpacing="[ [40, 0] ]" ' Horizontal spacing between tiles
                numRows="1"
                rowHeights="[235]"
                rowLabelOffset="[ [0, -50] ]" ' Position for row titles
                rowFocusAnimationStyle="floatingFocus"
                rowLabelFont="font:Roboto-Bold-30"
                itemSpacing="[0, 60]" ' Vertical spacing between rows as per Step 2
            />
        </Group>

        <!-- Task node for fetching data -->
        <ContentTask id="contentTask" />
    </children>

</component>
`.trim();

const homeSceneBrs = `
function init()
    m.loadingLabel = m.top.findNode("loadingLabel")
    m.contentGroup = m.top.findNode("contentGroup")
    m.contentRowList = m.top.findNode("contentRowList")
    
    m.contentTask = m.top.findNode("contentTask")
    m.contentTask.observeField("content", "onContentLoaded")
    m.contentTask.url = "https://api.cratetv.com/v1/rows" ' As specified in Step 6
    m.contentTask.control = "RUN"
end function

function onContentLoaded(event as object)
    contentNode = event.getData()
    if contentNode <> invalid
        m.contentRowList.content = contentNode
        m.loadingLabel.visible = false
        m.contentGroup.visible = true
        m.top.setFocus(true)
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
        <!-- The content for this tile, passed from the RowList -->
        <field id="itemContent" type="node" onChange="onContentChange" />
        <!-- The focus state of the tile -->
        <field id="focusPercent" type="float" onChange="onFocusChange" />
    </interface>

    <children>
        <!-- The blue focus border, initially invisible -->
        <Rectangle 
            id="focusRing"
            color="#1A73E8"
            width="316"  ' 300 + 8*2
            height="196" ' 180 + 8*2
            translation="[-8, -8]"
            visible="false" 
        />
        
        <!-- The movie poster image -->
        <Poster 
            id="tileImage"
            width="300"
            height="180"
        />

        <!-- The movie title label -->
        <Label 
            id="tileLabel"
            width="300"
            horizAlign="center"
            translation="[0, 195]" ' 180px image height + 15px space
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
end function

' Populates the tile with data from the RowList content.
function onContentChange()
    content = m.top.itemContent
    if content <> invalid
        m.tileImage.uri = content.PosterURL
        m.tileLabel.text = content.Title
    end if
end function

' Handles focus state changes.
function onFocusChange()
    focusPercent = m.top.focusPercent
    
    ' When focused (focusPercent = 1.0)
    if focusPercent = 1.0
        m.focusRing.visible = true
        m.tileLabel.font.role = "Roboto-Bold-30" ' Change to bold font
        m.tileLabel.color = "#FFFFFF" ' Ensure text is white
    else ' When unfocused
        m.focusRing.visible = false
        m.tileLabel.font.role = "Roboto-Regular-30" ' Change back to regular font
    end if
end function
`.trim();

const contentTaskXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="ContentTask" extends="Task">

    <interface>
        <!-- The URL to fetch -->
        <field id="url" type="string" />
        <!-- The parsed content result -->
        <field id="content" type="node" />
    </interface>
    
    <script type="text/brightscript" uri="pkg:/components/ContentTask.brs" />

</component>
`.trim();

const contentTaskBrs = `
' Corresponds to the GetContentFeed function from Step 5
function GetContentFeed()
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
                    print "GetContentFeed: Failed to parse JSON"
                    m.top.content = invalid
                end if
            else
                print "GetContentFeed: HTTP Error: "; msg.getResponseCode()
                m.top.content = invalid
            end if
        else
            print "GetContentFeed: Request timeout or error"
            m.top.content = invalid
        end if
    else
        print "GetContentFeed: Failed to start async request"
        m.top.content = invalid
    end if
end function

' Converts the parsed JSON AA into a SceneGraph ContentNode
function createContentNode(data as object) as object
    rowListContent = createObject("roSGNode", "ContentNode")
    
    if data.categories <> invalid
        for each category in data.categories
            row = createObject("roSGNode", "ContentNode")
            row.title = category.title
            
            for each movie in category.movies
                item = createObject("roSGNode", "ContentNode")
                item.Title = movie.Title
                item.PosterURL = movie.PosterURL
                item.VideoURL = movie.VideoURL
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

        // Root files
        zip.file('manifest', manifestContent);

        // Source folder
        const source = zip.folder('source');
        source?.file('main.brs', mainBrsContent);

        // Components folder
        const components = zip.folder('components');
        components?.file('HomeScene.xml', homeSceneXml);
        components?.file('HomeScene.brs', homeSceneBrs);
        components?.file('MoviePoster.xml', moviePosterXml);
        components?.file('MoviePoster.brs', moviePosterBrs);
        components?.file('ContentTask.xml', contentTaskXml);
        components?.file('ContentTask.brs', contentTaskBrs);
        
        // Fonts folder (The user must add the actual .ttf files to their project's /roku/fonts directory)
        zip.folder('fonts');

        // Images folder
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
             // If splash is missing, create a blank placeholder to avoid Roku errors
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
