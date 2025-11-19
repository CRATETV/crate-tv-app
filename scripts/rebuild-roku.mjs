import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const rokuDir = path.join(projectRoot, 'roku');

// Helper to write files
function writeFile(relativePath, content) {
    const filePath = path.join(rokuDir, relativePath);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content.trim(), 'utf8');
    console.log(`✅ Created: ${relativePath}`);
}

// 1. CLEAN SLATE
if (fs.existsSync(rokuDir)) {
    fs.rmSync(rokuDir, { recursive: true, force: true });
    console.log("🗑️  Deleted old roku folder (removing corrupted files)...");
}
fs.mkdirSync(rokuDir);

// 2. MANIFEST
writeFile('manifest', `
title=Crate TV
subtitle=Stream Independent Film
major_version=2
minor_version=0
build_version=00001
mm_icon_focus_hd=pkg:/images/logo_hd.png
splash_screen_fhd=pkg:/images/splash_hd.jpg
splash_screen_hd=pkg:/images/splash_hd.jpg
ui_resolutions=fhd
uri_handlers=cratetv
bs_const=RNDEBUG=true
`);

// 3. SOURCE FILES
writeFile('source/Config.brs', `
Function GetApiUrl() as String
    return "https://cratetv.net/api"
End Function
`);

writeFile('source/Main.brs', `
sub Main(args as Dynamic)
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)
    scene = screen.CreateScene("MainScene")
    screen.show()
    while(true)
        msg = wait(0, m.port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
`);

// 4. COMPONENTS - MainScene (Router)
writeFile('components/MainScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/MainScene.brs" />
    <children>
        <Rectangle width="1920" height="1080" color="#141414" />
        <Group id="sceneContainer" />
        <BusySpinner id="globalSpinner" visible="true" translation="[960, 540]" />
    </children>
</component>
`);

writeFile('components/MainScene.brs', `
sub init()
    m.sceneContainer = m.top.findNode("sceneContainer")
    m.globalSpinner = m.top.findNode("globalSpinner")
    checkLoginStatus()
end sub

sub checkLoginStatus()
    m.authTask = CreateObject("roSGNode", "APITask")
    m.authTask.requestType = "checkLink"
    m.authTask.observeField("authResult", "onAuthResult")
    m.authTask.control = "RUN"
end sub

sub onAuthResult()
    result = m.authTask.authResult
    m.globalSpinner.visible = false
    if result <> invalid and result.linked = true
        showHome()
    else
        showLogin()
    end if
end sub

sub showLogin()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    loginScreen = CreateObject("roSGNode", "AccountLinkScene")
    loginScreen.observeField("loginSuccess", "onLoginSuccess")
    m.sceneContainer.appendChild(loginScreen)
    loginScreen.setFocus(true)
end sub

sub showHome()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    homeScreen = CreateObject("roSGNode", "HomeScene")
    m.sceneContainer.appendChild(homeScreen)
    homeScreen.setFocus(true)
end sub

sub onLoginSuccess()
    showHome()
end sub
`);

// 5. COMPONENTS - AccountLinkScene (Login)
writeFile('components/AccountLinkScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="AccountLinkScene" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/AccountLinkScene.brs" />
    <interface>
        <field id="loginSuccess" type="boolean" />
    </interface>
    <children>
        <Poster uri="pkg:/images/splash_hd.jpg" width="1920" height="1080" opacity="0.3" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.85" />
        <Group translation="[460, 300]">
            <Label text="Sign In to Crate TV" width="1000" horizAlign="center" color="#FFFFFF" translation="[0, 0]"><Font role="font" uri="font:BoldSystemFont" size="60" /></Label>
            <Label text="1. Go to cratetv.net/link on your computer or phone" width="1000" horizAlign="center" color="#AAAAAA" translation="[0, 100]"><Font role="font" uri="font:SystemFont" size="30" /></Label>
            <Label text="2. Enter this code:" width="1000" horizAlign="center" color="#AAAAAA" translation="[0, 150]"><Font role="font" uri="font:SystemFont" size="30" /></Label>
            <Label id="codeLabel" text="LOADING..." width="1000" horizAlign="center" color="#E50914" translation="[0, 220]"><Font role="font" uri="font:BoldSystemFont" size="120" /></Label>
            <Label text="This screen will update automatically." width="1000" horizAlign="center" color="#666666" translation="[0, 400]"><Font role="font" uri="font:SystemFont" size="24" /></Label>
        </Group>
        <Timer id="pollTimer" repeat="true" duration="5" />
    </children>
</component>
`);

writeFile('components/AccountLinkScene.brs', `
sub init()
    m.codeLabel = m.top.findNode("codeLabel")
    m.timer = m.top.findNode("pollTimer")
    m.timer.observeField("fire", "checkStatus")
    getCode()
end sub
sub getCode()
    m.codeTask = CreateObject("roSGNode", "APITask")
    m.codeTask.requestType = "getCode"
    m.codeTask.observeField("linkCode", "onCodeReceived")
    m.codeTask.control = "RUN"
end sub
sub onCodeReceived(event as Object)
    code = event.getData()
    if code <> invalid and code <> ""
        m.codeLabel.text = code
        m.timer.control = "start"
    else
        m.codeLabel.text = "ERROR"
    end if
    m.codeTask = invalid
end sub
sub checkStatus()
    m.statusTask = CreateObject("roSGNode", "APITask")
    m.statusTask.requestType = "checkLink"
    m.statusTask.observeField("authResult", "onStatusCheck")
    m.statusTask.control = "RUN"
end sub
sub onStatusCheck(event as Object)
    res = event.getData()
    if res <> invalid and res.linked = true
        m.timer.control = "stop"
        m.top.loginSuccess = true
    end if
    m.statusTask = invalid
end sub
`);

// 6. COMPONENTS - HomeScene (Netflix Style)
writeFile('components/HomeScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />
    <children>
        <!-- HERO -->
        <Poster id="heroBg" width="1920" height="1080" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#141414" opacity="0.5" />
        <Rectangle width="1920" height="1080" color="#141414" opacity="0.9" translation="[0, 800]" />
        
        <!-- INFO -->
        <Group id="heroGroup" translation="[100, 200]">
            <Label text="NOW STREAMING" color="#E50914" translation="[0, -40]"><Font role="font" uri="font:BoldSystemFont" size="24" /></Label>
            <Label id="heroTitle" width="1000" color="#FFFFFF" wrap="true"><Font role="font" uri="font:BoldSystemFont" size="80" /></Label>
            <LayoutGroup layoutDirection="horiz" itemSpacings="[20]" translation="[0, 130]">
                <Label id="heroMeta" text="" color="#CCCCCC"><Font role="font" uri="font:SystemFont" size="28" /></Label>
                <Rectangle width="50" height="32" color="#333333" cornerRadius="4">
                     <Label text="HD" width="50" height="32" horizAlign="center" color="#dddddd"><Font role="font" uri="font:BoldSystemFont" size="20" /></Label>
                </Rectangle>
            </LayoutGroup>
            <Label id="heroDesc" width="800" color="#DDDDDD" maxLines="3" wrap="true" translation="[0, 180]" lineSpacing="6"><Font role="font" uri="font:SystemFont" size="26" /></Label>
            <!-- Buttons -->
            <LayoutGroup layoutDirection="horiz" itemSpacings="[20]" translation="[0, 300]">
                <Rectangle width="220" height="60" color="#FFFFFF" cornerRadius="4">
                    <Label text="Play" width="220" height="60" horizAlign="center" vertAlign="center" color="#000000"><Font role="font" uri="font:BoldSystemFont" size="28" /></Label>
                </Rectangle>
                <Rectangle width="220" height="60" color="#666666" opacity="0.7" cornerRadius="4">
                    <Label text="More Info" width="220" height="60" horizAlign="center" vertAlign="center" color="#FFFFFF"><Font role="font" uri="font:BoldSystemFont" size="28" /></Label>
                </Rectangle>
            </LayoutGroup>
        </Group>

        <!-- ROW LIST -->
        <RowList 
            id="rowList" 
            translation="[0, 650]" 
            itemComponent="PosterItem" 
            numRows="2" 
            rowItemSize="[[320, 450]]" 
            rowItemSpacing="[[20, 0]]" 
            itemSize="[1920, 500]" 
            rowLabelOffset="[[100, 20]]" 
            rowLabelColor="#E5E5E5"
            focusXOffset="[100]" 
            showRowLabel="true" 
            rowFocusAnimationStyle="floatingFocus" 
        />
        <Video id="videoPlayer" visible="false" width="1920" height="1080" />
    </children>
</component>
`);

writeFile('components/HomeScene.brs', `
sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroBg = m.top.findNode("heroBg")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroDesc = m.top.findNode("heroDesc")
    m.heroMeta = m.top.findNode("heroMeta")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.rowList.observeField("rowItemFocused", "onItemFocused")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
    m.videoPlayer.observeField("state", "onVideoStateChanged")
    loadContent()
end sub
sub loadContent()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "feed"
    task.observeField("content", "onContentReady")
    task.control = "RUN"
end sub
sub onContentReady(event)
    content = event.getData()
    if content <> invalid
        m.rowList.content = content
        m.rowList.setFocus(true)
        if content.getChildCount() > 0
            updateHero(content.getChild(0).getChild(0))
        end if
    end if
end sub
sub onItemFocused()
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    content = m.rowList.content
    if content <> invalid
        rowNode = content.getChild(row)
        if rowNode <> invalid
            item = rowNode.getChild(col)
            updateHero(item)
        end if
    end if
end sub
sub updateHero(item)
    if item <> invalid
        m.heroBg.uri = item.hdPosterUrl
        m.heroTitle.text = item.title
        if item.description <> invalid then m.heroDesc.text = item.description else m.heroDesc.text = ""
        meta = ""
        if item.rating <> invalid then meta = item.rating
        if item.duration <> invalid then meta = meta + " | " + item.duration
        m.heroMeta.text = meta
    end if
end sub
sub onItemSelected()
    row = m.rowList.content.getChild(m.rowList.rowItemFocused[0])
    item = row.getChild(m.rowList.rowItemFocused[1])
    if item <> invalid
        m.videoPlayer.visible = true
        m.videoPlayer.setFocus(true)
        content = CreateObject("roSGNode", "ContentNode")
        content.url = item.url
        content.title = item.title
        content.streamFormat = "mp4"
        m.videoPlayer.content = content
        m.videoPlayer.control = "play"
    end if
end sub
sub onVideoStateChanged()
    if m.videoPlayer.state = "finished" or m.videoPlayer.state = "error"
        m.videoPlayer.control = "stop"
        m.videoPlayer.visible = false
        m.rowList.setFocus(true)
    end if
end sub
function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and key = "back" and m.videoPlayer.visible
        m.videoPlayer.control = "stop"
        m.videoPlayer.visible = false
        m.rowList.setFocus(true)
        return true
    end if
    return false
end function
`);

// 7. COMPONENTS - PosterItem (Performance Optimized)
writeFile('components/PosterItem.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="PosterItem" extends="Group">
    <interface>
        <field id="itemContent" type="node" onChange="onContentChanged" />
        <field id="width" type="float" />
        <field id="height" type="float" />
        <field id="rowFocusPercent" type="float" onChange="onFocusPercentChanged" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/PosterItem.brs" />
    <children>
        <LayoutGroup id="rankGroup" visible="false" layoutDirection="horiz" translation="[0, 60]">
            <Rectangle width="120" height="200" color="#00000000">
                <Label id="rankOutline" width="120" horizAlign="right" color="#FFD700" translation="[-4, 0]"><Font role="font" uri="font:BoldSystemFont" size="130" /></Label>
                <Label id="rankFill" width="120" horizAlign="right" color="#141414" translation="[0, 0]"><Font role="font" uri="font:BoldSystemFont" size="130" /></Label>
            </Rectangle>
        </LayoutGroup>
        <Poster id="poster" width="200" height="300" loadDisplayMode="scaleToZoom" loadWidth="200" loadHeight="300" />
        <Rectangle id="focusRing" width="210" height="310" translation="[-5, -5]" color="#FFFFFF" fill="false" opacity="0" stroke="4" />
    </children>
</component>
`);

writeFile('components/PosterItem.brs', `
sub init()
    m.poster = m.top.findNode("poster")
    m.rankGroup = m.top.findNode("rankGroup")
    m.rankOutline = m.top.findNode("rankOutline")
    m.rankFill = m.top.findNode("rankFill")
    m.focusRing = m.top.findNode("focusRing")
end sub
sub onContentChanged()
    item = m.top.itemContent
    if item <> invalid
        m.poster.uri = item.hdPosterUrl
        if item.rank > 0
            m.rankGroup.visible = true
            m.rankOutline.text = item.rank.ToStr()
            m.rankFill.text = item.rank.ToStr()
            m.poster.translation = [110, 0] 
            m.focusRing.translation = [105, -5]
        else
            m.rankGroup.visible = false
            m.poster.translation = [0, 0]
            m.focusRing.translation = [-5, -5]
        end if
    end if
end sub
sub onFocusPercentChanged()
    scale = 1 + (m.top.rowFocusPercent * 0.08)
    m.focusRing.opacity = m.top.rowFocusPercent
    m.poster.scale = [scale, scale]
    if m.rankGroup.visible then m.rankGroup.scale = [scale, scale]
end sub
`);

// 8. COMPONENTS - APITask (API Logic)
writeFile('components/APITask.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="APITask" extends="Task">
    <interface>
        <field id="content" type="node" />
        <field id="requestType" type="string" />
        <field id="linkCode" type="string" />
        <field id="authResult" type="assocarray" />
    </interface>
    <script type="text/brightscript" uri="pkg:/source/Config.brs" />
    <script type="text/brightscript" uri="pkg:/components/APITask.brs" />
</component>
`);

writeFile('components/APITask.brs', `
sub init()
    m.top.functionName = "routeRequest"
end sub
sub routeRequest()
    reqType = m.top.requestType
    if reqType = "getCode" then fetchCode()
    if reqType = "checkLink" then checkLink()
    if reqType = "feed" then fetchFeed()
end sub
function getDeviceId()
    di = CreateObject("roDeviceInfo")
    return di.GetChannelClientId()
end function
function makeRequest(url as String) as Object
    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.InitClientCertificates()
    req.SetUrl(url)
    str = req.GetToString()
    if str <> "" then return ParseJson(str)
    return invalid
end function
sub fetchCode()
    url = GetApiUrl() + "/get-roku-link-code?deviceId=" + getDeviceId()
    json = makeRequest(url)
    if json <> invalid then m.top.linkCode = json.code
end sub
sub checkLink()
    url = GetApiUrl() + "/check-roku-link-status?deviceId=" + getDeviceId()
    json = makeRequest(url)
    if json <> invalid then m.top.authResult = json
end sub
sub fetchFeed()
    url = GetApiUrl() + "/roku-feed?deviceId=" + getDeviceId()
    json = makeRequest(url)
    if json <> invalid
        rootNode = CreateObject("roSGNode", "ContentNode")
        
        ' Festival
        if json.isFestivalLive = true and json.festivalContent <> invalid
            festivalRow = rootNode.CreateChild("ContentNode")
            festivalRow.title = "🏆 " + json.festivalContent.config.title + " (LIVE)"
            for each day in json.festivalContent.days
                 for each block in day.blocks
                     for each film in block.children
                        parseItem(festivalRow, film, 0)
                     end for
                 end for
            end for
        end if

        ' Categories
        if json.categories <> invalid
            for each category in json.categories
                if category.children <> invalid and category.children.Count() > 0
                    row = rootNode.CreateChild("ContentNode")
                    row.title = category.title
                    isTopTen = (category.title.Instr("Top 10") >= 0)
                    rank = 1
                    for each video in category.children
                        if isTopTen
                            parseItem(row, video, rank)
                            rank = rank + 1
                        else
                            parseItem(row, video, 0)
                        end if
                    end for
                end if
            end for
        end if
        m.top.content = rootNode
    end if
end sub
sub parseItem(rowNode, itemData, rank)
    if itemData <> invalid
        itemNode = rowNode.CreateChild("ContentNode")
        itemNode.title = itemData.title
        if itemData.description <> invalid then itemNode.description = itemData.description else itemNode.description = ""
        itemNode.hdPosterUrl = itemData.HDPosterUrl
        itemNode.sdPosterUrl = itemData.SDPosterUrl
        itemNode.url = itemData.streamUrl
        itemNode.addField("rank", "int", false)
        itemNode.rank = rank
        itemNode.addField("rating", "string", false)
        if itemData.rating <> invalid then itemNode.rating = itemData.rating
        itemNode.addField("duration", "string", false)
        if itemData.duration <> invalid then itemNode.duration = itemData.duration
    end if
end sub
`);

// Create images dir
if (!fs.existsSync(path.join(rokuDir, 'images'))) {
    fs.mkdirSync(path.join(rokuDir, 'images'));
}

console.log("\n---------------------------------------------------");
console.log("✅ Roku App Rebuilt Successfully!");
console.log("---------------------------------------------------");
console.log("👉 ACTION REQUIRED:");
console.log("1. Copy 'logo_hd.png' and 'splash_hd.jpg' into the 'roku/images' folder.");
console.log("2. Go to 'roku' folder.");
console.log("3. Select ALL contents (manifest, source, components, images).");
console.log("4. Right-Click > Compress.");
console.log("5. Upload the ZIP to your Roku.");
console.log("---------------------------------------------------");