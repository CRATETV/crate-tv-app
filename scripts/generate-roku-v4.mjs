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

// 1. WIPE OLD FOLDER
if (fs.existsSync(rokuDir)) {
    fs.rmSync(rokuDir, { recursive: true, force: true });
}
fs.mkdirSync(rokuDir);

// 2. MANIFEST (v4.0)
writeFile('manifest', `
title=Crate TV
subtitle=Stream Independent Film
major_version=4
minor_version=0
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

// 5. MAIN SCENE (The Layout Manager)
writeFile('components/MainScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/MainScene.brs" />
    <children>
        <!-- Global Background -->
        <Rectangle width="1920" height="1080" color="#141414" />

        <!-- Page Container -->
        <Group id="pageContainer" />

        <!-- Persistent Top Navigation Bar (Z-Index High) -->
        <Group id="topBar" translation="[0, 0]">
            <Rectangle width="1920" height="100" color="#000000" opacity="0.9" />
            <Poster uri="pkg:/images/logo_hd.png" width="150" height="80" translation="[50, 10]" />
            
            <LayoutGroup id="navMenu" layoutDirection="horiz" translation="[300, 25]" itemSpacings="[30]">
                <Button id="navHome" text="HOME" minWidth="150" />
                <Button id="navSearch" text="SEARCH" minWidth="150" />
                <Button id="navSettings" text="SETTINGS" minWidth="150" />
            </LayoutGroup>
        </Group>

        <!-- Global Spinner -->
        <BusySpinner id="globalSpinner" visible="true" translation="[960, 540]" />
    </children>
</component>
`);

writeFile('components/MainScene.brs', `
sub init()
    m.pageContainer = m.top.findNode("pageContainer")
    m.topBar = m.top.findNode("topBar")
    m.navMenu = m.top.findNode("navMenu")
    m.globalSpinner = m.top.findNode("globalSpinner")
    
    ' Navigation Buttons
    m.navHome = m.top.findNode("navHome")
    m.navSearch = m.top.findNode("navSearch")
    m.navSettings = m.top.findNode("navSettings")
    
    ' Focus Logic
    m.currentView = invalid
    m.focusState = "loading" 

    ' Start App
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
        loadView("HomeView")
    else
        loadView("AccountLinkScene")
        m.topBar.visible = false ' Hide nav on login screen
    end if
end sub

sub loadView(componentName)
    m.pageContainer.removeChildren(m.pageContainer.getChildren(-1, 0))
    m.currentView = CreateObject("roSGNode", componentName)
    
    if componentName = "HomeView"
        m.topBar.visible = true
        m.currentView.observeField("viewState", "onHomeViewState") ' Listen for "details" clicks
        m.focusState = "content"
    else if componentName = "AccountLinkScene"
        m.currentView.observeField("loginSuccess", "onLoginSuccess")
        m.focusState = "login"
    end if
    
    m.pageContainer.appendChild(m.currentView)
    m.currentView.setFocus(true)
end sub

sub onLoginSuccess()
    loadView("HomeView")
end sub

' Handle clicks from HomeView (poster clicked)
sub onHomeViewState()
    state = m.currentView.viewState
    if state <> invalid and state.action = "openDetails"
        openDetails(state.item)
    end if
end sub

sub openDetails(item)
    details = CreateObject("roSGNode", "DetailsView")
    details.content = item
    m.pageContainer.appendChild(details)
    details.setFocus(true)
    m.focusState = "details"
end sub

' --- GLOBAL FOCUS HANDLER ---
function onKeyEvent(key, press)
    if press
        if key = "up" and m.focusState = "content"
            ' If user is at top of grid, move focus to Nav Bar
            if m.currentView.isAtTop = true
                m.navHome.setFocus(true)
                m.focusState = "nav"
                return true
            end if
        else if key = "down" and m.focusState = "nav"
            ' Move focus back to content
            m.currentView.setFocus(true)
            m.focusState = "content"
            return true
        else if key = "back"
            if m.focusState = "details"
                m.pageContainer.removeChild(m.pageContainer.getChild(m.pageContainer.getChildCount() - 1))
                m.currentView.setFocus(true)
                m.focusState = "content"
                return true
            end if
        end if
    end if
    return false
end function
`);

// 6. HOME VIEW (16:9 Posters, Hero)
writeFile('components/HomeView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeView" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/HomeView.brs" />
    <interface>
        <field id="viewState" type="assocarray" /> <!-- Sends clicks to MainScene -->
        <field id="isAtTop" type="boolean" value="true" /> <!-- For Focus Logic -->
    </interface>
    <children>
        <!-- HERO BACKGROUND -->
        <Poster id="heroBg" width="1920" height="1080" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#141414" opacity="0.8" /> <!-- Stronger fade for content readability -->

        <!-- CONTENT ROWS -->
        <!-- itemSize: 320x180 is standard 16:9 Thumbnail -->
        <RowList 
            id="rowList" 
            translation="[0, 120]" 
            itemComponent="CinematicPosterItem" 
            numRows="3" 
            rowItemSize="[[320, 180]]" 
            rowItemSpacing="[[20, 40]]" 
            itemSize="[1920, 300]" 
            rowLabelOffset="[[80, -30]]" 
            rowLabelColor="#E5E5E5"
            rowLabelFont="font:BoldSystemFont"
            focusXOffset="[80]" 
            showRowLabel="true" 
            rowFocusAnimationStyle="floatingFocus" 
        />
    </children>
</component>
`);

writeFile('components/HomeView.brs', `
sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroBg = m.top.findNode("heroBg")
    m.rowList.observeField("rowItemFocused", "onFocus")
    m.rowList.observeField("rowItemSelected", "onSelect")
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
        m.rowList.setFocus(true)
    end if
end sub
sub onFocus()
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    
    ' Inform MainScene if we are at the top
    if row = 0 
        m.top.isAtTop = true
    else
        m.top.isAtTop = false
    end if

    content = m.rowList.content
    if content <> invalid
        item = content.getChild(row).getChild(col)
        if item <> invalid
            m.heroBg.uri = item.hdPosterUrl ' Background updates to current selection
        end if
    end if
end sub
sub onSelect()
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    item = m.rowList.content.getChild(row).getChild(col)
    
    ' Signal MainScene to open details
    m.top.viewState = { action: "openDetails", item: item }
end sub
`);

// 7. CINEMATIC POSTER ITEM (16:9)
writeFile('components/CinematicPosterItem.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="CinematicPosterItem" extends="Group">
    <interface>
        <field id="itemContent" type="node" onChange="onContent" />
        <field id="width" type="float" />
        <field id="height" type="float" />
        <field id="rowFocusPercent" type="float" onChange="onFocus" />
    </interface>
    <script type="text/brightscript" uri="pkg:/components/CinematicPosterItem.brs" />
    <children>
        <Poster id="poster" width="320" height="180" loadDisplayMode="scaleToZoom" loadWidth="320" loadHeight="180" />
        <!-- White Glow Border -->
        <Rectangle id="focusRing" width="330" height="190" translation="[-5, -5]" color="#FFFFFF" fill="false" opacity="0" stroke="4" />
    </children>
</component>
`);

writeFile('components/CinematicPosterItem.brs', `
sub init()
    m.poster = m.top.findNode("poster")
    m.focusRing = m.top.findNode("focusRing")
end sub
sub onContent()
    item = m.top.itemContent
    if item <> invalid
        m.poster.uri = item.hdPosterUrl
    end if
end sub
sub onFocus()
    scale = 1 + (m.top.rowFocusPercent * 0.1) ' 10% Scale Up
    m.focusRing.opacity = m.top.rowFocusPercent
    m.poster.scale = [scale, scale]
    m.focusRing.scale = [scale, scale]
end sub
`);

// 8. DETAILS VIEW (The "Pre-Play" Screen)
writeFile('components/DetailsView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="DetailsView" extends="Group">
    <interface><field id="content" type="node" onChange="onContentSet" /></interface>
    <script type="text/brightscript" uri="pkg:/components/DetailsView.brs" />
    <children>
        <!-- Fullscreen BG -->
        <Poster id="bg" width="1920" height="1080" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.85" />
        
        <!-- Content Layout -->
        <Group translation="[100, 150]">
            <!-- Large Poster -->
            <Poster id="poster" width="400" height="600" />
            
            <!-- Text Info -->
            <Group translation="[450, 0]">
                <Label id="title" width="1200" color="#FFFFFF" font="font:BoldSystemFont" size="80" wrap="true" />
                <Label id="meta" translation="[0, 100]" color="#AAAAAA" font="font:SystemFont" size="30" />
                <Label id="desc" translation="[0, 160]" width="1000" color="#DDDDDD" font="font:SystemFont" size="30" wrap="true" maxLines="8" />
                
                <!-- Play Button -->
                <Button id="playBtn" text="PLAY NOW" translation="[0, 500]" minWidth="300" />
            </Group>
        </Group>
        
        <!-- Hidden Player -->
        <Video id="video" visible="false" width="1920" height="1080" />
    </children>
</component>
`);

writeFile('components/DetailsView.brs', `
sub init()
    m.bg = m.top.findNode("bg")
    m.poster = m.top.findNode("poster")
    m.title = m.top.findNode("title")
    m.meta = m.top.findNode("meta")
    m.desc = m.top.findNode("desc")
    m.playBtn = m.top.findNode("playBtn")
    m.video = m.top.findNode("video")
    
    m.playBtn.observeField("buttonSelected", "onPlay")
    m.video.observeField("state", "onVideoState")
end sub

sub onContentSet()
    item = m.top.content
    m.bg.uri = item.hdPosterUrl
    m.poster.uri = item.hdPosterUrl
    m.title.text = item.title
    m.desc.text = item.description
    
    meta = ""
    if item.rating <> invalid then meta = item.rating
    if item.duration <> invalid then meta = meta + " | " + item.duration
    m.meta.text = meta
    
    m.playBtn.setFocus(true)
end sub

sub onPlay()
    item = m.top.content
    content = CreateObject("roSGNode", "ContentNode")
    content.url = item.url
    content.streamFormat = "mp4"
    m.video.content = content
    m.video.visible = true
    m.video.setFocus(true)
    m.video.control = "play"
end sub

sub onVideoState()
    if m.video.state = "finished" or m.video.state = "error"
        m.video.control = "stop"
        m.video.visible = false
        m.playBtn.setFocus(true)
    end if
end sub

function onKeyEvent(key, press)
    if press and key = "back" and m.video.visible
        m.video.control = "stop"
        m.video.visible = false
        m.playBtn.setFocus(true)
        return true
    end if
    return false
end function
`);

// 9. ACCOUNT LINK SCENE (Keep existing logic)
writeFile('components/AccountLinkScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="AccountLinkScene" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/AccountLinkScene.brs" />
    <interface><field id="loginSuccess" type="boolean" /></interface>
    <children>
        <Poster uri="pkg:/images/splash_hd.jpg" width="1920" height="1080" opacity="0.3" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.9" />
        <Group id="linkGroup">
            <Label text="Sign In to Crate TV" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 200]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="60" /></Label>
            <Label text="WEB: cratetv.net/link" width="1920" horizAlign="center" color="#AAAAAA" translation="[0, 300]"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="30" /></Label>
            <Label id="codeLabel" text="..." width="1920" horizAlign="center" color="#E50914" translation="[0, 400]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="120" /></Label>
            <Button id="emailBtn" text="Sign In with Password" translation="[810, 600]" minWidth="300" />
        </Group>
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
        root = CreateObject("roSGNode", "ContentNode")
        
        if json.categories <> invalid
            for each cat in json.categories
                if cat.children <> invalid and cat.children.Count() > 0
                    row = root.CreateChild("ContentNode")
                    row.title = cat.title
                    for each vid in cat.children
                        addNode(row, vid)
                    end for
                end if
            end for
        end if
        result.rows = root
        m.top.feedData = result
    end if
end sub
sub addNode(parent, data)
    node = createNode(data)
    if node <> invalid
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
    return n
end function
`);

// Ensure dirs
if (!fs.existsSync(path.join(rokuDir, 'images'))) fs.mkdirSync(path.join(rokuDir, 'images'));
if (!fs.existsSync(path.join(rokuDir, 'fonts'))) fs.mkdirSync(path.join(rokuDir, 'fonts'));

console.log("\n---------------------------------------------------");
console.log("✅ V4 ROKU APP GENERATED (NETFLIX LAYOUT)");
console.log("👉 STEP 1: Drag 'logo_hd.png' & 'splash_hd.jpg' into 'roku/images'");
console.log("👉 STEP 2: Drag 'Bold.ttf' & 'Regular.ttf' into 'roku/fonts'");
console.log("👉 STEP 3: Zip the 'roku' contents (manifest, source, etc) and Upload.");
console.log("---------------------------------------------------");