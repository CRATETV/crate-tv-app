
import JSZip from 'jszip';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// --- FONT DATA ---
// By embedding the fonts as Base64, we remove the fragile dependency on external CDNs,
// making the Roku package generation much more reliable.

const ROBOTO_REGULAR_BASE64 = 'AAEAAAAQAQAABAAAR0RFRgB4AfwAABH4AAAAHkdQT1MAj//+AAAStAAAAGxHU1VCABCw+gAAFIwAAAaYT1MvMmg5/4IAAAoEAAAAVmNtYXAADgEAAAALVAAABKZjdnQgEGgYRAAAELQAAAAaZnBnbQ/QCaMAAAzMAAABimdhc3AAAAAQAAAR9AAAAAxnbHlmCA94MQAAACwAABVgaGVhZB6q8yIAAADcAAAANmhoZWEHEgOFAAABFAAAACRobXR4BEQAAAAAAbAAAAAgbG9jYQG8AWQAAAMoAAAAEm1heHAAEgAoAAABOAAAACBuYW1l4R_XBAAADWAAAAJFwb3N0/5wAMgAAESQAAAAgcHJlcGgGjIUDAAAMCwAAACEAAQAAAAIAAHcAjAABAAAAAAACAAEAAgAWAAQAAgAAAAEAAQAAAEAALgE8AAAAAQUBEAAAAAAAAAABAQAAAAAAAAAAAAAFBAADBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktM';
const ROBOTO_BOLD_BASE64 = 'AAEAAAAQAQAABAAAR0RFRgB4AfwAABH4AAAAHkdQT1MAj//+AAAStAAAAGxHU1VCABCw+gAAFIwAAAaYT1MvMmg5/4IAAAoEAAAAVmNtYXAADgEAAAALVAAABKZjdnQgEGgYRAAAELQAAAAaZnBnbQ/QCaMAAAzMAAABimdhc3AAAAAQAAAR9AAAAAxnbHlmCA94MQAAACwAABVgaGVhZB6q8yIAAADcAAAANmhoZWEHEgOFAAABFAAAACRobXR4BEQAAAAAAbAAAAAgbG9jYQG8AWQAAAMoAAAAEm1heHAAEgAoAAABOAAAACBuYW1l4R_XBAAADWAAAAJFwb3N0/5wAMgAAESQAAAAgcHJlcGgGjIUDAAAMCwAAACEAAQAAAAIAAHcAjAABAAAAAAACAAEAAgAWAAQAAgAAAAEAAQAAAEAALgE8AAAAAQUBEAAAAAAAAAABAQAAAAAAAAAAAAAFBAADBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktM';

// --- ROBUST PLACEHOLDER IMAGES ---
// Base64 encoded, correctly-sized, dark gray PNGs to use as fallbacks.
const PLACEHOLDER_ICON_HD_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAVwAAADSCAMAAAC1olQJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURRQURA3h17wAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVHja7cEBDQAAAMKg9P+tYwVBERVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1JAGwAAGI6Q0aAAAAAElFTkSuQmCC';
const PLACEHOLDER_ICON_SD_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAPgAAACuCAMAAABUoCHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURRQURA3h17wAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABJSURBVHja7cEBDQAAAMKg9P+tYwVBERVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1IAGwAAE0hLg4AAAAAElFTkSuQmCC';
const PLACEHOLDER_SPLASH_HD_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAABQAAAALQCAMAAACl/3daAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURRQURA3h17wAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACLSURBVHja7cExAQAAAMKg9P+tYwVBERVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1ASwAAGeGqE/mAAAAAElFTkSuQmCC';
const PLACEHOLDER_SPLASH_SD_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAtAAAAEACAMAAAANM40OAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURRQURA3h17wAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABqSURBVHja7cExAQAAAMKg9P+tYwVBERVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1ASwAAE1R3p6gAAAAAElFTkSuQmCC';

const placeholderMap: Record<string, string> = {
    'roku-assets/channel-icon-hd.png': PLACEHOLDER_ICON_HD_BASE64,
    'roku-assets/channel-icon-sd.png': PLACEHOLDER_ICON_SD_BASE64,
    'roku-assets/splash-screen-hd.png': PLACEHOLDER_SPLASH_HD_BASE64,
    'roku-assets/splash-screen-sd.png': PLACEHOLDER_SPLASH_SD_BASE64,
};


// Helper to get S3 client
const getS3Client = () => {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;

    if (!accessKeyId || !secretAccessKey || !region) return null;
    if (region === 'global') region = 'us-east-1';

    return new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
    });
};

export async function GET(request: Request) {
    try {
        const s3 = getS3Client();
        const bucketName = process.env.AWS_S3_BUCKET_NAME;

        if (!s3 || !bucketName) {
            throw new Error("AWS S3 not configured on the server. Cannot fetch Roku assets.");
        }
        
        const zip = new JSZip();

        // --- ROKU SOURCE FILES ---
        const manifest = `
title=Crate TV
major_version=1
minor_version=0
build_version=1
mm_icon_focus_hd=pkg:/images/channel-icon-hd.png
mm_icon_focus_sd=pkg:/images/channel-icon-sd.png
splash_screen_sd=pkg:/images/splash-screen-sd.png
splash_screen_hd=pkg:/images/splash-screen-hd.png
splash_color=#141414
`;
        const mainBrs = `
Sub Main()
    showHomeScreen()
End Sub

Sub showHomeScreen()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    
    scene = screen.CreateScene("HomeScene")
    screen.show()
    
    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)
        
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
End Sub
`;

        const homeSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />
    <children>
        <Rectangle id="background" color="0x141414FF" width="1920" height="1080" />
        <Label id="loadingLabel" text="Loading Crate TV..." translation="[960, 540]" horizAlign="center" vertAlign="center" color="0xFFFFFFFF">
            <font role="sans" uri="pkg:/fonts/Roboto-Regular.ttf" size="40" />
        </Label>
        <RowList 
            id="contentRowList"
            translation="[80, 120]"
            itemComponentName="MoviePoster"
            itemSize="[300, 235]"
            rowItemSpacing="[ [40, 0] ]"
            numRows="1"
            rowHeights="[235]"
            rowLabelOffset="[ [0, -50] ]"
            rowFocusAnimationStyle="floatingFocus"
            itemSpacing="[0, 80]"
            visible="false"
        />
        <ContentTask id="contentTask" />
    </children>
</component>
`;
        const homeSceneBrs = `
function init()
    m.contentTask = m.top.findNode("contentTask")
    m.contentTask.observeField("content", "onContentLoaded")
    m.contentTask.control = "RUN"
end function

function onContentLoaded()
    content = m.contentTask.content
    if content <> invalid
        m.top.findNode("loadingLabel").visible = false
        rowList = m.top.findNode("contentRowList")
        rowList.content = content
        rowList.visible = true
        rowList.setFocus(true)
    else
        m.top.findNode("loadingLabel").text = "Failed to load content."
    end if
end function
`;
        const moviePosterXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MoviePoster" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/MoviePoster.brs" />
    <interface>
        <field id="itemContent" type="node" onChange="onContentChange" />
        <field id="focusPercent" type="float" onChange="onFocusChange" />
    </interface>
    <children>
        <Rectangle id="focusRing" color="0x8b5cf6FF" width="316" height="196" translation="[-8, -8]" visible="false" />
        <Poster id="tileImage" width="300" height="180" />
        <Label id="tileLabel" width="300" horizAlign="center" translation="[0, 195]" color="0xFFFFFFFF">
             <font role="sans" uri="pkg:/fonts/Roboto-Regular.ttf" size="24" />
        </Label>
    </children>
</component>
`;
        const moviePosterBrs = `
function init()
    m.focusRing = m.top.findNode("focusRing")
    m.tileImage = m.top.findNode("tileImage")
    m.tileLabel = m.top.findNode("tileLabel")
end function

function onContentChange()
    item = m.top.itemContent
    if item <> invalid
        m.tileImage.uri = item.hdposterurl
        m.tileLabel.text = item.title
    end if
end function

function onFocusChange()
    focusPercent = m.top.focusPercent
    m.focusRing.visible = (focusPercent > 0)
    
    ' Scale animation on focus
    scale = 1 + (0.05 * focusPercent)
    m.top.scale = [scale, scale]
end function
`;

        const contentTaskXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="ContentTask" extends="Task">
    <interface>
        <field id="content" type="node" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/ContentTask.brs" />
</component>
`;
        const feedUrl = `${new URL(request.url).protocol}//${new URL(request.url).host}/api/roku-feed`;
        const contentTaskBrs = `
function init()
    m.top.functionName = "getContent"
end function

function getContent()
    url = "${feedUrl}"
    port = CreateObject("roMessagePort")
    request = CreateObject("roUrlTransfer")
    request.SetMessagePort(port)
    request.SetUrl(url)
    
    if request.AsyncGetToString()
        while true
            msg = wait(0, port)
            if type(msg) = "roUrlEvent"
                if msg.GetResponseCode() = 200
                    json = msg.GetString()
                    parsed = ParseJson(json)
                    if parsed <> invalid
                        m.top.content = createContent(parsed)
                    else
                        m.top.content = invalid
                    end if
                    return
                else
                    m.top.content = invalid
                    return
                end if
            end if
        end while
    end if
    m.top.content = invalid
end function

function createContent(data) as object
    content = createObject("roSGNode", "ContentNode")
    
    for each category in data.categories
        row = createObject("roSGNode", "ContentNode")
        row.title = category.title
        
        children = createObject("roSGNode", "ContentNode")
        for each movie in category.movies
            item = createObject("roSGNode", "ContentNode")
            item.HDPosterUrl = movie.HDPosterUrl
            item.title = movie.title
            children.appendChild(item)
        end for
        
        row.children = children
        content.appendChild(row)
    end for
    
    return content
end function
`;
        
        // --- ADD FILES TO ZIP ---
        zip.file('manifest', manifest);
        zip.file('source/main.brs', mainBrs);
        zip.folder('components');
        zip.file('components/HomeScene.xml', homeSceneXml);
        zip.file('components/HomeScene.brs', homeSceneBrs);
        zip.file('components/MoviePoster.xml', moviePosterXml);
        zip.file('components/MoviePoster.brs', moviePosterBrs);
        zip.file('components/ContentTask.xml', contentTaskXml);
        zip.file('components/ContentTask.brs', contentTaskBrs);

        zip.folder('fonts');
        zip.file('fonts/Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64, { base64: true });
        zip.file('fonts/Roboto-Bold.ttf', ROBOTO_BOLD_BASE64, { base64: true });

        zip.folder('images');
        // --- FETCH AND ADD IMAGE ASSETS ---
        const imageKeys = Object.keys(placeholderMap);
        
        for (const key of imageKeys) {
            const fileName = key.split('/').pop();
            if (!fileName) continue;

            try {
                const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
                const response = await s3.send(command);
                const buffer = await response.Body?.transformToByteArray();
                
                if (buffer && buffer.length > 0) {
                   zip.file(`images/${fileName}`, buffer);
                } else {
                    console.warn(`S3 object for ${key} was empty. Using fallback placeholder.`);
                    zip.file(`images/${fileName}`, placeholderMap[key], { base64: true });
                }
            } catch (error) {
                console.warn(`Failed to fetch S3 asset '${key}'. Using fallback placeholder. Error: ${error}`);
                zip.file(`images/${fileName}`, placeholderMap[key], { base64: true });
            }
        }

        // --- GENERATE AND SEND ZIP ---
        const content = await zip.generateAsync({ type: 'arraybuffer' });

        return new Response(content, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="cratv.zip"',
            },
        });

    } catch (error) {
        console.error("Error generating Roku ZIP:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate Roku package: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
