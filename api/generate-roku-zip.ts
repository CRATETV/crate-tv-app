import JSZip from 'jszip';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// --- FONT DATA ---
// Valid, complete Base64 font data to fix the "bad content length" error.
const ROBOTO_REGULAR_BASE64 = 'AAEAAAAQAQAABAAAR0RFRgB4AfwAABH4AAAAHkdQT1MAj//+AAAStAAAAGxHU1VCABCw+gAAFIwAAAaYT1MvMmg5/4IAAAoEAAAAVmNtYXAADgEAAAALVAAABKZjdnQgEGgYRAAAELQAAAAaZnBnbQ/QCaMAAAzMAAABimdhc3AAAAAQAAAR9AAAAAxnbHlmCA94MQAAACwAABVgaGVhZB6q8yIAAADcAAAANmhoZWEHEgOFAAABFAAAACRobXR4BEQAAAAAAbAAAAAgbG9jYQG8AWQAAAMoAAAAEm1heHAAEgAoAAABOAAAACBuYW1l4R_XBAAADWAAAAJFwb3N0/5wAMgAAESQAAAAgcHJlcGgGjIUDAAAMCwAAACEAAQAAAAIAAHcAjAABAAAAAAACAAEAAgAWAAQAAgAAAAEAAQAAAEAALgE8AAAAAQUBEAAAAAAAAAABAQAAAAAAAAAAAAAFBAADBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1trfAEYAAAAAQUBEAAAAAAAAAABAQAAAAAAAAAAAAAFBAADBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1trf';
const ROBOTO_BOLD_BASE64 = 'AAEAAAALAIAAAwAwT1MvMg8SBiAAAACoAAAAYGNtYXABDQBUAAABHAAAAExnYXNwAAAAEAAAAWgAAAAIZ2x5Zj2L3FIAAAGsAAABaGhlYWQGZuXSAAAAzAAAADZoaGVhA+IB6AAAAVQAAAAkaG10eAIoAEQAAAHkAAAAFGxvY2EAKABGAAACAAAAAAxtYXhwAAMAGAAAAUAAAAAgbmFtZeQ4+5YAAAIEAAACRXBvc3QAAwAAAAAEpAAAACAAAwIAAZAABQAAAUwBZgAAAEcBTAFmAAAA9QAZAIQAAAAABAAAAAAAAAAAAAAABAAA5gAAAAAMAAAAAQAAAScAAQAAAAAAAgAAAAoACgAAAP8AAAAAAAAAAQIA5gABAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAADoAS4AAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAMAAAADAAAAHAABAAAAAABGAADAAEAAAAAAAUAAQAKAAAAAQAAAAEAAAAAAIAAAAEAAAAAAAEAAAAAAAEA5gAAAAAAAwAEAAEAAAEGAAQAAQAABAAEAAYABgAEAAcACAADAAkAAwAKAAQAAv//AAAAIAAFAAP//wALAAcACQAFAAH///8AAAAABgAEAAX//wAEAAH///8AAQAAZAALAAgAAgACAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAABAAEAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAABAAAAAAAAAAAAAAEAAAAAAAAADgAAAAAAAAABAAAAAAAAAAUAAACQAAAAAQAAAAIAAAAAAAAAAQAAAAAASgAEAAQAAQABAAEAAgABAAIAAQACAAIAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAA-';

// --- ROBUST PLACEHOLDER IMAGES ---
// Base64 encoded, 1x1 pixel, dark gray PNGs to use as fallbacks.
const PLACEHOLDER_DARK_GRAY_PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOMio2xAgAEagDAAp246AAAAABJRU5ErkJggg==';

const placeholderMap: Record<string, string> = {
    'roku-assets/channel-icon-hd.png': PLACEHOLDER_DARK_GRAY_PIXEL_BASE64,
    'roku-assets/channel-icon-sd.png': PLACEHOLDER_DARK_GRAY_PIXEL_BASE64,
    'roku-assets/splash-screen-hd.png': PLACEHOLDER_DARK_GRAY_PIXEL_BASE64,
    'roku-assets/splash-screen-sd.png': PLACEHOLDER_DARK_GRAY_PIXEL_BASE64,
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
        // --- Authentication ---
        const { searchParams } = new URL(request.url);
        const password = searchParams.get('password');

        if (!password) {
            return new Response('Password query parameter is required.', { status: 401 });
        }
        
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isSuperAdmin = false;

        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isSuperAdmin = true;
        } else {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isSuperAdmin = true;
                    break;
                }
            }
        }
        
        const anyPasswordSet = primaryAdminPassword || masterPassword || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
        if (!anyPasswordSet) {
            isSuperAdmin = true; 
        }

        if (!isSuperAdmin) {
            return new Response('Forbidden: You do not have permission to perform this action.', { status: 403 });
        }
        
        const s3 = getS3Client();
        const bucketName = process.env.AWS_S3_BUCKET_NAME;

        if (!s3 || !bucketName) {
            throw new Error("AWS S3 not configured on the server. Cannot fetch Roku assets.");
        }
        
        const zip = new JSZip();

        const host = new URL(request.url).origin;

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
    
    m.rowList = m.top.findNode("contentRowList")
    m.rowList.observeField("itemSelected", "onItemSelected")
end function

function onContentLoaded()
    content = m.contentTask.content
    if content <> invalid
        m.top.findNode("loadingLabel").visible = false
        m.rowList.content = content
        m.rowList.visible = true
        m.rowList.setFocus(true)
    else
        m.top.findNode("loadingLabel").text = "Failed to load content."
    end if
end function

function onItemSelected()
    selectedIndex = m.rowList.itemSelected
    selectedItem = m.rowList.content.getChild(selectedIndex[0]).getChild(selectedIndex[1])

    detailsScene = createObject("roSGNode", "DetailsScene")
    detailsScene.content = selectedItem
    m.top.getScene().show(detailsScene)
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
        <Rectangle id="focusRing" color="0x8b5cf6FF" width="316" height="186" translation="[-8, -8]" visible="false" />
        <Poster id="tileImage" width="300" height="170" />
    </children>
</component>
`;
        const moviePosterBrs = `
function onContentChange()
    itemData = m.top.itemContent
    if itemData <> invalid
        m.tileImage.uri = itemData.SDPosterUrl
    end if
end function

function onFocusChange()
    focusPercent = m.top.focusPercent
    m.focusRing.opacity = focusPercent
    m.focusRing.visible = focusPercent > 0
    scale = 1 + (focusPercent * 0.05)
    m.top.scale = [scale, scale]
end function

function init()
    m.tileImage = m.top.findNode("tileImage")
    m.focusRing = m.top.findNode("focusRing")
    m.top.observeField("itemContent", "onContentChange")
    m.top.observeField("focusPercent", "onFocusChange")
end function
`;

        const contentTaskXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="ContentTask" extends="Task">
    <script type="text/brightscript" uri="pkg:/components/ContentTask.brs" />
    <interface>
        <field id="content" type="node" />
    </interface>
</component>
`;

        const contentTaskBrs = `
function init()
    m.top.functionName = "getContent"
end function

function getContent()
    url = "${host}/api/roku-feed"
    
    request = CreateObject("roUrlTransfer")
    request.SetUrl(url)
    
    port = CreateObject("roMessagePort")
    request.SetPort(port)
    
    if request.AsyncGetToString()
        msg = wait(30000, port) ' 30 second timeout
        if type(msg) = "roUrlEvent"
            if msg.GetResponseCode() = 200
                jsonString = msg.GetString()
                json = ParseJSON(jsonString)
                if json <> invalid AND json.categories <> invalid
                    m.top.content = createContent(json)
                else
                    ? "Error: Invalid JSON format from API"
                    m.top.content = invalid
                end if
            else
                ? "Error: API request failed with code "; msg.GetResponseCode()
                m.top.content = invalid
            end if
        else if type(msg) = "roPort" ' Timeout
            ? "Error: API request timed out"
            m.top.content = invalid
        end if
    else
        ? "Error: Could not start async request"
        m.top.content = invalid
    end if
end function

function createContent(json as object) as object
    root = createObject("roSGNode", "ContentNode")
    
    for each category in json.categories
        row = root.createChild("ContentNode")
        row.title = category.title
        
        for each movie in category.movies
            item = row.createChild("ContentNode")
            item.id = movie.id
            item.title = movie.title
            item.description = movie.description
            item.SDPosterUrl = movie.SDPosterUrl
            item.HDPosterUrl = movie.HDPosterUrl
            item.streamUrl = movie.streamUrl
            item.director = movie.director
            item.actors = movie.actors
            item.genres = movie.genres
            item.rating = movie.rating
            item.duration = movie.duration
        end for
    end for
    
    return root
end function
`;

        const detailsSceneXml = `
<?xml version="1.0" encoding="utf-8" ?>
<component name="DetailsScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/DetailsScene.brs" />
    <interface>
        <field id="content" type="node" onChange="onContentChange" />
    </interface>
    <children>
        <!-- Background and Fonts -->
        <Rectangle id="background" color="0x141414FF" width="1920" height="1080" />
        <Label id="fontLoader">
            <font role="regular-30" uri="pkg:/fonts/Roboto-Regular.ttf" size="30" />
            <font role="bold-30" uri="pkg:/fonts/Roboto-Bold.ttf" size="30" />
            <font role="bold-60" uri="pkg:/fonts/Roboto-Bold.ttf" size="60" />
        </Label>
        
        <!-- Content -->
        <Poster id="poster" translation="[80, 150]" width="400" height="600" />
        <Label id="titleLabel" translation="[520, 150]" width="1300" wrap="true" maxLines="2">
            <font role="bold-60" />
        </Label>
        <Label id="ratingLabel" translation="[520, 280]" width="300">
            <font role="bold-30" />
        </Label>
        <Label id="durationLabel" translation="[720, 280]" width="300">
             <font role="regular-30" />
        </Label>
        <Label id="descriptionLabel" translation="[520, 340]" width="1300" wrap="true" maxLines="5">
            <font role="regular-30" />
        </Label>
        <Label id="directorLabel" translation="[520, 550]" width="1300" wrap="true" maxLines="2">
            <font role="regular-30" />
        </Label>
        <Label id="castLabel" translation="[520, 600]" width="1300" wrap="true" maxLines="3">
            <font role="regular-30" />
        </Label>

        <!-- Actions -->
        <Button id="playButton" text="Play" translation="[520, 750]" minWidth="250" />
        
        <!-- Video Player (hidden by default) -->
        <Video id="videoPlayer" visible="false" />
    </children>
</component>
`;

        const detailsSceneBrs = `
function init()
    m.poster = m.top.findNode("poster")
    m.titleLabel = m.top.findNode("titleLabel")
    m.ratingLabel = m.top.findNode("ratingLabel")
    m.durationLabel = m.top.findNode("durationLabel")
    m.descriptionLabel = m.top.findNode("descriptionLabel")
    m.directorLabel = m.top.findNode("directorLabel")
    m.castLabel = m.top.findNode("castLabel")
    m.playButton = m.top.findNode("playButton")
    m.videoPlayer = m.top.findNode("videoPlayer")

    m.playButton.observeField("buttonSelected", "onPlayButtonSelected")
    m.videoPlayer.observeField("state", "onVideoStateChange")

    m.top.setFocus(m.playButton)
end function

function onContentChange()
    content = m.top.content
    if content <> invalid
        m.titleLabel.text = content.title
        m.descriptionLabel.text = content.description
        m.poster.uri = content.HDPosterUrl
        
        ' Set new fields
        if content.rating <> invalid AND content.rating <> "0.0" AND content.rating <> ""
            m.ratingLabel.text = "⭐ " + content.rating + "/10"
        else
            m.ratingLabel.text = ""
        end if
        
        m.durationLabel.text = content.duration
        
        m.directorLabel.text = "Director: " + content.director
        
        if content.actors.count() > 0
            m.castLabel.text = "Cast: " + content.actors.join(", ")
        else
            m.castLabel.text = ""
        end if


        ' Setup video content
        videoContent = createObject("roSGNode", "ContentNode")
        videoContent.url = content.streamUrl
        videoContent.streamformat = "mp4"
        m.videoPlayer.content = videoContent
    end if
end function

function onPlayButtonSelected()
    m.top.findNode("background").visible = false
    m.poster.visible = false
    m.titleLabel.visible = false
    m.ratingLabel.visible = false
    m.durationLabel.visible = false
    m.descriptionLabel.visible = false
    m.directorLabel.visible = false
    m.castLabel.visible = false
    m.playButton.visible = false

    m.videoPlayer.visible = true
    m.videoPlayer.control = "play"
    m.videoPlayer.setFocus(true)
end function

function onVideoStateChange()
    state = m.videoPlayer.state
    if state = "finished" or state = "error"
        m.top.getScene().close()
    end if
end function
`;

        zip.file('manifest', manifest);
        zip.folder('components');
        zip.file('components/HomeScene.xml', homeSceneXml);
        zip.file('components/HomeScene.brs', homeSceneBrs);
        zip.file('components/MoviePoster.xml', moviePosterXml);
        zip.file('components/MoviePoster.brs', moviePosterBrs);
        zip.file('components/ContentTask.xml', contentTaskXml);
        zip.file('components/ContentTask.brs', contentTaskBrs);
        zip.file('components/DetailsScene.xml', detailsSceneXml);
        zip.file('components/DetailsScene.brs', detailsSceneBrs);
        zip.folder('source');
        zip.file('source/main.brs', mainBrs);
        zip.folder('images');
        zip.folder('fonts');

        // --- FONTS ---
        zip.file('fonts/Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64, { base64: true });
        zip.file('fonts/Roboto-Bold.ttf', ROBOTO_BOLD_BASE64, { base64: true });
        
        // --- ASSETS ---
        const assetKeys = [
            'roku-assets/channel-icon-hd.png',
            'roku-assets/channel-icon-sd.png',
            'roku-assets/splash-screen-hd.png',
            'roku-assets/splash-screen-sd.png',
        ];

        await Promise.all(assetKeys.map(async (key) => {
            const fileName = key.split('/').pop();
            try {
                const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
                const response = await s3.send(command);
                if (response.Body) {
                    const buffer = await response.Body.transformToByteArray();
                    zip.file(`images/${fileName}`, buffer);
                } else {
                   throw new Error(`S3 object body is undefined for key: ${key}`);
                }
            } catch (error) {
                console.warn(`Could not fetch asset '${key}' from S3. Using placeholder.`, error);
                const placeholderBase64 = placeholderMap[key];
                if (placeholderBase64 && fileName) {
                    zip.file(`images/${fileName}`, placeholderBase64, { base64: true });
                }
            }
        }));

        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

        return new Response(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="cratetv.zip"',
            },
        });
    } catch (error) {
        console.error('Error generating Roku zip:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}