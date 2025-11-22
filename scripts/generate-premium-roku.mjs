import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const rokuDir = path.join(projectRoot, 'roku');

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
}
fs.mkdirSync(rokuDir);

// 2. MANIFEST
writeFile('manifest', `
title=Crate TV
subtitle=Stream Independent Film
major_version=3
minor_version=5
build_version=00001
mm_icon_focus_hd=pkg:/images/logo_hd.png
splash_screen_fhd=pkg:/images/splash_hd.jpg
splash_screen_hd=pkg:/images/splash_hd.jpg
ui_resolutions=fhd
uri_handlers=cratetv
bs_const=RNDEBUG=true
splash_screen_color=#000000
`);

// 3. CONFIG
writeFile('source/Config.brs', `
Function GetApiUrl() as String
    return "https://cratetv.net/api"
End Function
`);

// 4. MAIN LAUNCHER
writeFile('source/Main.brs', `
sub Main(args)
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

// 5. MAIN SCENE (Router)
writeFile('components/MainScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/MainScene.brs" />
    <children>
        <Rectangle width="1920" height="1080" color="#000000" />
        <Group id="sceneContainer" />
        <BusySpinner id="globalSpinner" visible="true" translation="[960, 540]" />
    </children>
</component>
`);

writeFile('components/MainScene.brs', `
sub init()
    m.sceneContainer = m.top.findNode("sceneContainer")
    m.globalSpinner = m.top.findNode("globalSpinner")
    checkLogin()
end sub
sub checkLogin()
    m.authTask = CreateObject("roSGNode", "APITask")
    m.authTask.requestType = "checkLink"
    m.authTask.observeField("authResult", "onAuthResult")
    m.authTask.control = "RUN"
end sub
sub onAuthResult()
    res = m.authTask.authResult
    m.globalSpinner.visible = false
    if res <> invalid and res.linked = true
        showHome()
    else
        showLogin()
    end if
end sub
sub showLogin()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    node = CreateObject("roSGNode", "AccountLinkScene")
    node.observeField("loginSuccess", "onLoginSuccess")
    m.sceneContainer.appendChild(node)
    node.setFocus(true)
end sub
sub showHome()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    node = CreateObject("roSGNode", "HomeScene")
    m.sceneContainer.appendChild(node)
    node.setFocus(true)
end sub
sub onLoginSuccess()
    showHome()
end sub
`);

// 6. ACCOUNT LINK SCENE (Red/White/Black Theme)
writeFile('components/AccountLinkScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="AccountLinkScene" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/AccountLinkScene.brs" />
    <interface><field id="loginSuccess" type="boolean" /></interface>
    <children>
        <Poster uri="pkg:/images/splash_hd.jpg" width="1920" height="1080" opacity="0.3" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.9" />
        
        <!-- CODE VIEW -->
        <Group id="linkGroup">
            <Label text="Sign In to Crate TV" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 200]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="60" /></Label>
            <Label text="WEB: cratetv.net/link" width="1920" horizAlign="center" color="#AAAAAA" translation="[0, 300]"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="30" /></Label>
            <Label id="codeLabel" text="..." width="1920" horizAlign="center" color="#E50914" translation="[0, 400]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="120" /></Label>
            <Button id="emailBtn" text="Sign In with Password" translation="[810, 600]" minWidth="300" />
        </Group>

        <!-- PASSWORD VIEW -->
        <Group id="loginGroup" visible="false">
            <Rectangle width="1920" height="1080" color="#141414" />
            <Label id="inputLabel" text="Enter Email" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 150]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="40" /></Label>
            <Rectangle width="800" height="60" color="#333333" translation="[560, 220]"><Label id="inputText" text="" color="#FFFFFF" translation="[10, 10]" /></Rectangle>
            <Keyboard id="keyboard" translation="[560, 300]" />
            <Label id="statusLabel" width="1920" horizAlign="center" color="#E50914" translation="[0, 800]" />
            <Button id="backBtn" text="Back" translation="[100, 100]" />
        </Group>
        <Timer id="pollTimer" repeat="true" duration="5" />
    </children>
</component>
`);

writeFile('components/AccountLinkScene.brs', `
sub init()
    m.linkGroup = m.top.findNode("linkGroup")
    m.loginGroup = m.top.findNode("loginGroup")
    m.codeLabel = m.top.findNode("codeLabel")
    m.emailBtn = m.top.findNode("emailBtn")
    m.keyboard = m.top.findNode("keyboard")
    m.inputText = m.top.findNode("inputText")
    m.inputLabel = m.top.findNode("inputLabel")
    m.statusLabel = m.top.findNode("statusLabel")
    m.backBtn = m.top.findNode("backBtn")
    m.timer = m.top.findNode("pollTimer")
    m.mode = "email"
    m.email = ""
    m.emailBtn.observeField("buttonSelected", "showLogin")
    m.backBtn.observeField("buttonSelected", "showLink")
    m.keyboard.observeField("text", "onKeyText")
    m.keyboard.observeField("buttonSelected", "onKeyAction")
    m.timer.observeField("fire", "checkLinkStatus")
    getCode()
    m.emailBtn.setFocus(true)
end sub
sub getCode()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "getCode"
    task.observeField("linkCode", "onCode")
    task.control = "RUN"
end sub
sub onCode(evt)
    m.codeLabel.text = evt.getData()
    m.timer.control = "start"
end sub
sub checkLinkStatus()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "checkLink"
    task.observeField("authResult", "onStatus")
    task.control = "RUN"
end sub
sub onStatus(evt)
    res = evt.getData()
    if res.linked = true
        m.timer.control = "stop"
        m.top.loginSuccess = true
    end if
end sub
sub showLogin()
    m.linkGroup.visible = false
    m.loginGroup.visible = true
    m.timer.control = "stop"
    m.keyboard.setFocus(true)
end sub
sub showLink()
    m.loginGroup.visible = false
    m.linkGroup.visible = true
    m.timer.control = "start"
    m.emailBtn.setFocus(true)
end sub
sub onKeyText(evt)
    m.inputText.text = evt.getData()
end sub
sub onKeyAction()
    txt = m.keyboard.text
    if txt = "" return
    if m.mode = "email"
        m.email = txt
        m.mode = "password"
        m.inputLabel.text = "Enter Password"
        m.inputText.text = ""
        m.keyboard.text = ""
        m.keyboard.textEditBox.secureMode = true
    else
        doLogin(m.email, txt)
    end if
end sub
sub doLogin(email, pass)
    m.statusLabel.text = "Signing in..."
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "login"
    task.email = email
    task.password = pass
    task.observeField("authResult", "onLoginRes")
    task.control = "RUN"
end sub
sub onLoginRes(evt)
    res = evt.getData()
    if res.success
        m.top.loginSuccess = true
    else
        m.statusLabel.text = "Login Failed"
        m.mode = "email"
        m.inputLabel.text = "Enter Email"
        m.keyboard.textEditBox.secureMode = false
        m.keyboard.text = ""
        m.inputText.text = ""
    end if
end sub
`);

// 7. HOME SCENE (Removed "Crate Featured", Fix Colors)
writeFile('components/HomeScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeScene" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/HomeScene.brs" />
    <children>
        <!-- HERO BG -->
        <Poster id="heroBg" width="1920" height="1080" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.3" />
        <Rectangle width="1920" height="1080" color="#141414" opacity="1" translation="[0, 750]" />
        
        <!-- HERO INFO -->
        <Group id="heroGroup" translation="[100, 200]">
            <Label id="heroTitle" width="1000" color="#FFFFFF" wrap="true"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="90" /></Label>
            
            <LayoutGroup layoutDirection="horiz" itemSpacings="[20]" translation="[0, 130]">
                <Label id="heroMeta" color="#CCCCCC"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="28" /></Label>
                <Rectangle width="50" height="32" color="#333" cornerRadius="4"><Label text="HD" width="50" height="32" horizAlign="center" color="#DDD"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="20" /></Label></Rectangle>
            </LayoutGroup>
            
            <Label id="heroDesc" width="800" color="#DDD" maxLines="3" wrap="true" translation="[0, 180]" lineSpacing="6"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="26" /></Label>
            
            <!-- Custom Buttons -->
            <LayoutGroup layoutDirection="horiz" itemSpacings="[20]" translation="[0, 320]">
                <Rectangle width="200" height="60" color="#FFFFFF" cornerRadius="5"><Label text="▶ Play" width="200" height="60" horizAlign="center" vertAlign="center" color="#000"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="26" /></Label></Rectangle>
            </LayoutGroup>
        </Group>

        <!-- GRID -->
        <RowList 
            id="rowList" 
            translation="[0, 600]" 
            itemComponent="PosterItem" 
            numRows="2" 
            rowItemSize="[[250, 375]]" 
            rowItemSpacing="[[20, 0]]" 
            itemSize="[1920, 500]" 
            rowLabelOffset="[[100, 20]]" 
            rowLabelColor="#FFFFFF" 
            focusXOffset="[100]" 
            showRowLabel="true" 
            rowFocusAnimationStyle="floatingFocus" 
        />
        <Timer id="heroTimer" repeat="true" duration="8" />
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
    m.heroTimer = m.top.findNode("heroTimer")
    m.rowList.observeField("rowItemFocused", "onFocus")
    m.rowList.observeField("rowItemSelected", "onSelect")
    m.heroTimer.observeField("fire", "rotateHero")
    m.heroItems = []
    m.heroIndex = 0
    m.isRowFocused = false
    loadContent()
end sub
sub loadContent()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "feed"
    task.observeField("feedData", "onContent")
    task.control = "RUN"
end sub
sub onContent(evt)
    data = evt.getData()
    if data <> invalid
        m.rowList.content = data.rows
        m.heroItems = data.heroItems
        m.rowList.setFocus(true)
        if m.heroItems.Count() > 0
            updateHero(m.heroItems[0])
            m.heroTimer.control = "start"
        end if
    end if
end sub
sub rotateHero()
    if m.isRowFocused return
    if m.heroItems.Count() = 0 return
    m.heroIndex = m.heroIndex + 1
    if m.heroIndex >= m.heroItems.Count() then m.heroIndex = 0
    updateHero(m.heroItems[m.heroIndex])
end sub
sub onFocus()
    m.isRowFocused = true
    m.heroTimer.control = "stop"
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    content = m.rowList.content
    if content <> invalid
        item = content.getChild(row).getChild(col)
        updateHero(item)
    end if
end sub
sub updateHero(item)
    if item = invalid return
    m.heroBg.uri = item.hdPosterUrl
    m.heroTitle.text = item.title
    m.heroDesc.text = item.description
    meta = ""
    if item.rating <> invalid then meta = item.rating
    if item.duration <> invalid then meta = meta + " | " + item.duration
    m.heroMeta.text = meta
end sub
sub onSelect()
    ' FIX: Explicitly get the content from the row to ensure correct video URL
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    content = m.rowList.content
    
    if content <> invalid
        item = content.getChild(row).getChild(col)
        if item <> invalid
            playVideo(item)
        end if
    end if
end sub
sub playVideo(item)
    ' FIX: Create the player and force focus
    player = CreateObject("roSGNode", "PlayerOverlay")
    player.content = item
    m.top.getScene().appendChild(player)
    player.setFocus(true)
end sub
`);

// 8. PLAYER OVERLAY (Crash Fix Included)
writeFile('components/PlayerOverlay.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="PlayerOverlay" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/PlayerOverlay.brs" />
    <interface><field id="content" type="node" onChange="onContentSet" /></interface>
    <children>
        <Video id="video" width="1920" height="1080" />
        <Group id="overlay" visible="false">
            <Rectangle width="1920" height="1080" color="#000000" opacity="0.85" />
            <Label id="title" translation="[100, 100]" color="#FFF"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="60"/></Label>
            <Label text="CAST & CREW" translation="[100, 220]" color="#E50914"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="30"/></Label>
            <Label id="actorList" translation="[100, 280]" width="1700" wrap="true" color="#DDD" lineSpacing="10"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="32"/></Label>
            <Label text="Press PLAY to Resume" translation="[100, 900]" color="#AAA"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="24"/></Label>
        </Group>
    </children>
</component>
`);

writeFile('components/PlayerOverlay.brs', `
sub init()
    m.video = m.top.findNode("video")
    m.overlay = m.top.findNode("overlay")
    m.title = m.top.findNode("title")
    m.actorList = m.top.findNode("actorList")
    m.video.observeField("state", "onState")
end sub
sub onContentSet()
    item = m.top.content
    
    ' FIX: Ensure video node is ready and focused
    content = CreateObject("roSGNode", "ContentNode")
    content.url = item.url
    content.streamFormat = "mp4"
    m.video.content = content
    m.video.visible = true
    m.video.setFocus(true)
    m.video.control = "play"
    
    m.title.text = item.title
    
    actorsStr = ""
    if item.actors <> invalid
        for each actor in item.actors
            if actor.name <> invalid
                actorsStr = actorsStr + "• " + actor.name + chr(10)
                if actor.bio <> invalid and actor.bio <> ""
                    ' Safe bio truncation to prevent overload
                    bio = actor.bio
                    if bio.Len() > 200 then bio = bio.Left(200) + "..."
                    actorsStr = actorsStr + "  " + bio + chr(10)
                end if
                actorsStr = actorsStr + chr(10)
            end if
        end for
    end if
    m.actorList.text = actorsStr
end sub
sub onState()
    if m.video.state = "paused" then m.overlay.visible = true else m.overlay.visible = false
    if m.video.state = "finished" or m.video.state = "error"
        m.top.getScene().removeChild(m.top)
    end if
end sub
function onKeyEvent(key, press)
    if press
        if key = "back"
            m.video.control = "stop"
            m.top.getScene().removeChild(m.top)
            return true
        else if key = "play"
            if m.video.state = "paused" then m.video.control = "resume" else m.video.control = "pause"
            return true
        end if
    end if
    return false
end function
`);

// 9. POSTER ITEM
writeFile('components/PosterItem.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="PosterItem" extends="Group">
    <interface>
        <field id="itemContent" type="node" onChange="onContent" />
        <field id="width" type="float" />
        <field id="height" type="float" />
        <field id="rowFocusPercent" type="float" onChange="onFocus" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/PosterItem.brs" />
    <children>
        <LayoutGroup id="rankGroup" visible="false" layoutDirection="horiz" translation="[0, 60]">
            <Rectangle width="100" height="200" color="#00000000">
                <Label id="rankOutline" width="100" horizAlign="right" color="#FFD700" translation="[-4, 0]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="110" /></Label>
                <Label id="rankFill" width="100" horizAlign="right" color="#141414" translation="[0, 0]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="110" /></Label>
            </Rectangle>
        </LayoutGroup>
        <Poster id="poster" width="250" height="375" loadDisplayMode="scaleToZoom" loadWidth="250" loadHeight="375" />
        <Rectangle id="focusRing" width="260" height="385" translation="[-5, -5]" color="#FFFFFF" fill="false" opacity="0" stroke="4" />
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
sub onContent()
    item = m.top.itemContent
    if item <> invalid
        m.poster.uri = item.hdPosterUrl
        if item.rank > 0
            m.rankGroup.visible = true
            m.rankOutline.text = item.rank.ToStr()
            m.rankFill.text = item.rank.ToStr()
            m.poster.translation = [100, 0] 
            m.focusRing.translation = [95, -5]
        else
            m.rankGroup.visible = false
            m.poster.translation = [0, 0]
            m.focusRing.translation = [-5, -5]
        end if
    end if
end sub
sub onFocus()
    scale = 1 + (m.top.rowFocusPercent * 0.08)
    m.focusRing.opacity = m.top.rowFocusPercent
    m.poster.scale = [scale, scale]
    if m.rankGroup.visible then m.rankGroup.scale = [scale, scale]
end sub
`);

// 10. API TASK
writeFile('components/APITask.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="APITask" extends="Task">
    <interface>
        <field id="requestType" type="string" />
        <field id="email" type="string" />
        <field id="password" type="string" />
        <field id="linkCode" type="string" />
        <field id="authResult" type="assocarray" />
        <field id="feedData" type="assocarray" />
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
    r = m.top.requestType
    if r="getCode" then fetchCode()
    if r="checkLink" then checkLink()
    if r="login" then doLogin()
    if r="feed" then fetchFeed()
end sub
function getId()
    di = CreateObject("roDeviceInfo")
    return di.GetChannelClientId()
end function
function req(url, method="GET", body="")
    r = CreateObject("roUrlTransfer")
    r.SetCertificatesFile("common:/certs/ca-bundle.crt")
    r.InitClientCertificates()
    r.SetUrl(url)
    if method="POST"
        r.SetRequest("POST")
        r.AddHeader("Content-Type", "application/json")
        r.AsyncPostFromString(body)
    else
        r.AsyncGetToString()
    end if
    port = CreateObject("roMessagePort")
    r.SetPort(port)
    msg = wait(10000, port)
    if type(msg)="roUrlEvent" and msg.GetResponseCode()=200
        return ParseJson(msg.GetString())
    end if
    return invalid
end function
sub fetchCode()
    res = req(GetApiUrl() + "/get-roku-link-code?deviceId=" + getId())
    if res <> invalid then m.top.linkCode = res.code
end sub
sub checkLink()
    res = req(GetApiUrl() + "/check-roku-link-status?deviceId=" + getId())
    if res <> invalid then m.top.authResult = res
end sub
sub doLogin()
    pay = { email: m.top.email, password: m.top.password, deviceId: getId() }
    res = req(GetApiUrl() + "/roku-device-login", "POST", FormatJson(pay))
    if res <> invalid and res.success then m.top.authResult = {success:true} else m.top.authResult = {success:false}
end sub
sub fetchFeed()
    json = req(GetApiUrl() + "/roku-feed?deviceId=" + getId())
    if json <> invalid
        result = {}
        hero = []
        if json.heroItems <> invalid
            for each i in json.heroItems
                hero.push(createNode(i))
            end for
        end if
        result.heroItems = hero
        root = CreateObject("roSGNode", "ContentNode")
        if json.isFestivalLive = true and json.festivalContent <> invalid
            row = root.CreateChild("ContentNode")
            row.title = "🏆 " + json.festivalContent.config.title + " (LIVE)"
            if json.festivalContent.days <> invalid
                for each d in json.festivalContent.days
                    if d.blocks <> invalid
                        for each b in d.blocks
                            if b.children <> invalid
                                for each f in b.children
                                    addNode(row, f, 0)
                                end for
                            end if
                        end for
                    end if
                end for
            end if
        end if
        if json.categories <> invalid
            for each cat in json.categories
                if cat.children <> invalid and cat.children.Count() > 0
                    row = root.CreateChild("ContentNode")
                    row.title = cat.title
                    isTop = (cat.title.Instr("Top 10") >= 0)
                    rank = 1
                    for each vid in cat.children
                        if isTop
                            addNode(row, vid, rank)
                            rank = rank + 1
                        else
                            addNode(row, vid, 0)
                        end if
                    end for
                end if
            end for
        end if
        result.rows = root
        m.top.feedData = result
    end if
end sub
sub addNode(parent, data, rank)
    node = createNode(data)
    if node <> invalid
        node.addField("rank", "int", false)
        node.rank = rank
        parent.appendChild(node)
    end if
end sub
function createNode(d)
    if d = invalid return invalid
    n = CreateObject("roSGNode", "ContentNode")
    n.title = d.title
    n.url = d.streamUrl
    n.hdPosterUrl = d.hdPosterUrl
    n.sdPosterUrl = d.sdPosterUrl
    if d.description <> invalid then n.description = d.description else n.description = ""
    n.addField("rating", "string", false)
    if d.rating <> invalid then n.rating = d.rating
    n.addField("duration", "string", false)
    if d.duration <> invalid then n.duration = d.duration
    n.addField("actors", "array", false)
    if d.actors <> invalid then n.actors = d.actors else n.actors = []
    return n
end function
`);

// Ensure dirs
if (!fs.existsSync(path.join(rokuDir, 'images'))) fs.mkdirSync(path.join(rokuDir, 'images'));
if (!fs.existsSync(path.join(rokuDir, 'fonts'))) fs.mkdirSync(path.join(rokuDir, 'fonts'));

console.log("\n---------------------------------------------------");
console.log("✅ ROKU APP REBUILT SUCCESSFULLY!");
console.log("👉 STEP 1: Drag 'logo_hd.png' & 'splash_hd.jpg' into 'roku/images'");
console.log("👉 STEP 2: Drag 'Bold.ttf' & 'Regular.ttf' into 'roku/fonts'");
console.log("👉 STEP 3: Zip the 'roku' contents (manifest, source, etc) and Upload.");
console.log("---------------------------------------------------");