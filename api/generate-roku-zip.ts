import JSZip from 'jszip';
// FIX: Using a namespace import for the AWS S3 client to avoid potential type conflicts that may be causing the 'send' method error.
import * as S3 from "@aws-sdk/client-s3";

// --- FONT DATA ---
// By embedding the fonts as Base64, we remove the fragile dependency on external CDNs,
// making the Roku package generation much more reliable.

const ROBOTO_REGULAR_BASE64 = 'AAEAAAAQAQAABAAAR0RFRgB4AfwAABH4AAAAHkdQT1MAj//+AAAStAAAAGxHU1VCABCw+gAAFIwAAAaYT1MvMmg5/4IAAAoEAAAAVmNtYXAADgEAAAALVAAABKZjdnQgEGgYRAAAELQAAAAaZnBnbQ/QCaMAAAzMAAABimdhc3AAAAAQAAAR9AAAAAxnbHlmCA94MQAAACwAABVgaGVhZB6q8yIAAADcAAAANmhoZWEHEgOFAAABFAAAACRobXR4BEQAAAAAAbAAAAAgbG9jYQG8AWQAAAMoAAAAEm1heHAAEgAoAAABOAAAACBuYW1l4R_XBAAADWAAAAJFwb3N0/5wAMgAAESQAAAAgcHJlcGgGjIUDAAAMCwAAACEAAQAAAAIAAHcAjAABAAAAAAACAAEAAgAWAAQAAgAAAAEAAQAAAEAALgE8AAAAAQUBEAAAAAAAAAABAQAAAAAAAAAAAAAFBAADBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktM';
const ROBOTO_BOLD_BASE64 = 'AAEAAAAQAQAABAAAR0RFRgB4AfwAABH4AAAAHkdQT1MAj//+AAAStAAAAGxHU1VCABCw+gAAFIwAAAaYT1MvMmg5/4IAAAoEAAAAVmNtYXAADgEAAAALVAAABKZjdnQgEGgYRAAAELQAAAAaZnBnbQ/QCaMAAAzMAAABimdhc3AAAAAQAAAR9AAAAAxnbHlmCA94MQAAACwAABVgaGVhZB6q8yIAAADcAAAANmhoZWEHEgOFAAABFAAAACRobXR4BEQAAAAAAbAAAAAgbG9jYQG8AWQAAAMoAAAAEm1heHAAEgAoAAABOAAAACBuYW1l4R_XBAAADWAAAAJFwb3N0/5wAMgAAESQAAAAgcHJlcGgGjIUDAAAMCwAAACEAAQAAAAIAAHcAjAABAAAAAAACAAEAAgAWAAQAAgAAAAEAAQAAAEAALgE8AAAAAQUBEAAAAAAAAAABAQAAAAAAAAAAAAAFBAADBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktM';

// Helper to get S3 client
const getS3Client = () => {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;

    if (!accessKeyId || !secretAccessKey || !region) return null;
    if (region === 'global') region = 'us-east-1';

    return new S3.S3Client({
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
        // By defining the files here, we keep the Roku channel entirely self-contained within this API route.
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
        <Label id="tileLabel" width