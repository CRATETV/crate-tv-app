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

// 2. MANIFEST
writeFile('manifest', `
title=Crate TV
subtitle=Stream Independent Film
major_version=5
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

        <!-- Page Container (Holds Home, Details, Login) -->
        <Group id="pageContainer" />

        <!-- Global Spinner -->
        <BusySpinner id="globalSpinner" visible="true" translation="[960, 540]" />
    </children>
</component>
`);

writeFile('components/MainScene.brs', `
sub init()
    m.pageContainer = m.top.findNode("pageContainer")
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
        loadView("HomeView")
    else
        loadView("AccountLinkScene")
    end if
end sub

sub loadView(componentName)
    m.pageContainer.removeChildren(m.pageContainer.getChildren(-1, 0))
    m.currentView = CreateObject("roSGNode", componentName)
    
    if componentName = "HomeView"
        m.currentView.observeField("itemSelected", "onMovieSelected")
    else if componentName = "AccountLinkScene"
        m.currentView.observeField("loginSuccess", "onLoginSuccess")
    end if
    
    m.pageContainer.appendChild(m.currentView)
    m.currentView.setFocus(true)
end sub

sub onLoginSuccess()
    loadView("HomeView")
end sub

sub onMovieSelected()
    item = m.currentView.itemSelected
    if item <> invalid
        showDetails(item)
    end if
end sub

sub showDetails(item)
    details = CreateObject("roSGNode", "DetailsView")
    details.content = item
    m.pageContainer.appendChild(details)
    details.setFocus(true)
end sub
`);

// 6. HOME VIEW (Cinematic 16:9 Grid + Top Nav)
writeFile('components/HomeView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeView" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/HomeView.brs" />
    <interface>
        <field id="itemSelected" type="node" />
    </interface>
    <children>
        <!-- Dynamic Hero Background -->
        <Poster id="heroBg" width="1920" height="1080" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.7" />
        <Rectangle width="1920" height="1080" color="#141414" opacity="1" translation="[0, 800]" />

        <!-- Top Navigation Bar -->
        <Group id="topBar" translation="[0, 0]">
            <Rectangle width="1920" height="100" color="#000000" opacity="0.8" />
            <Poster uri="pkg:/images/logo_hd.png" width="120" height="60" translation="[50, 20]" />
            <LayoutGroup id="navMenu" layoutDirection="horiz" translation="[250, 30]" itemSpacings="[40]">
                <Label text="HOME" color="#E50914" font="font:BoldSystemFont" size="28" />
                <Label text="MOVIES" color="#AAAAAA" font="font:BoldSystemFont" size="28" />
                <Label text="SEARCH" color="#AAAAAA" font="font:BoldSystemFont" size="28" />
                <Label text="MY LIST" color="#AAAAAA" font="font:BoldSystemFont" size="28" />
            </LayoutGroup>
        </Group>

        <!-- Hero Info -->
        <Group id="heroGroup" translation="[100, 250]">
            <Label id="heroTitle" width="1000" color="#FFFFFF" wrap="true"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="80" /></Label>
            <Label id="heroDesc" width="800" color="#CCCCCC" maxLines="3" wrap="true" translation="[0, 120]" lineSpacing="6"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="24" /></Label>
        </Group>

        <!-- Main Content Grid -->
        <!-- Fixed: Cinematic 16:9 Dimensions -->
        <RowList 
            id="rowList" 
            translation="[0, 550]" 
            itemComponentName="CinematicPosterItem" 
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
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroDesc = m.top.findNode("heroDesc")

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
    content = m.rowList.content
    if content <> invalid
        rowNode = content.getChild(row)
        if rowNode <> invalid
            item = rowNode.getChild(col)
            if item <> invalid
                m.heroBg.uri = item.hdPosterUrl
                m.heroTitle.text = item.title
                if item.description <> invalid then m.heroDesc.text = item.description else m.heroDesc.text = ""
            end if
        end if
    end if
end sub

sub onSelect()
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    item = m.rowList.content.getChild(row).getChild(col)
    m.top.itemSelected = item
end sub
`);

// 7. CINEMATIC POSTER (16:9 Fix)
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
        <!-- Fixed Dimensions 320x180 (16:9) -->
        <!-- loadWidth/Height guarantees performance -->
        <Poster id="poster" width="320" height="180" loadDisplayMode="scaleToZoom" loadWidth="320" loadHeight="180" />
        
        <!-- Glow Border -->
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
    scale = 1 + (m.top.rowFocusPercent * 0.1)
    m.focusRing.opacity = m.top.rowFocusPercent
    m.poster.scale = [scale, scale]
    m.focusRing.scale = [scale, scale]
end sub
`);

// 8. DETAILS VIEW (The Pre-Play Screen)
writeFile('components/DetailsView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="DetailsView" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/DetailsView.brs" />
    <interface><field id="content" type="node" onChange="onContentSet" /></interface>
    <children>
        <!-- Full BG -->
        <Poster id="bg" width="1920" height="1080" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.9" />
        
        <Group translation="[100, 150]">
            <!-- Big Poster -->
            <Poster id="poster" width="300" height="450" loadDisplayMode="scaleToZoom" />
            
            <!-- Info -->
            <Group translation="[350, 0]">
                <Label id="title" width="1200" color="#FFFFFF" wrap="true"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="70" /></Label>
                <Label id="meta" translation="[0, 90]" color="#E50914"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="28" /></Label>
                <Label id="desc" translation="[0, 140]" width="1000" color="#CCCCCC" wrap="true" maxLines="6"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="26" /></Label>
                
                <!-- PLAY BUTTON -->
                <Rectangle id="playBtn" translation="[0, 400]" width="300" height="70" color="#E50914" cornerRadius="5">
                    <Label text="PLAY NOW" width="300" height="70" horizAlign="center" vertAlign="center" color="#FFFFFF"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="28" /></Label>
                </Rectangle>
            </Group>
        </Group>
        
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
    m.video = m.top.findNode("video")
end sub
sub onContentSet()
    item = m.top.content
    m.bg.uri = item.hdPosterUrl
    m.poster.uri = item.hdPosterUrl
    m.title.text = item.title
    m.desc.text = item.description
    if item.duration <> invalid then m.meta.text = item.duration
end sub
function onKeyEvent(key, press)
    if press
        if key = "OK" or key = "play"
            if not m.video.visible
                playVideo()
                return true
            end if
        else if key = "back"
            if m.video.visible
                stopVideo()
                return true
            else
                ' Close Details, go back to Home
                m.top.getScene().pageContainer.removeChild(m.top)
                m.top.getScene().currentView.setFocus(true)
                return true
            end if
        end if
    end if
    return false
end function
sub playVideo()
    item = m.top.content
    content = CreateObject("roSGNode", "ContentNode")
    content.url = item.url
    content.streamFormat = "mp4"
    m.video.content = content
    m.video.visible = true
    m.video.setFocus(true)
    m.video.control = "play"
end sub
sub stopVideo()
    m.video.control = "stop"
    m.video.visible = false
    m.top.setFocus(true)
end sub
`);

// 9. LOGIN SCENE (Kept intact)
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

// Make font/image dirs
if (!fs.existsSync(path.join(rokuDir, 'images'))) fs.mkdirSync(path.join(rokuDir, 'images'));
if (!fs.existsSync(path.join(rokuDir, 'fonts'))) fs.mkdirSync(path.join(rokuDir, 'fonts'));

console.log("---------------------------------------------------");
console.log("✅ ROKU APP V5 (FIXED POSTERS & CLICK) GENERATED");
console.log("👉 STEP 1: Drag 'logo_hd.png' & 'splash_hd.jpg' into 'roku/images'");
console.log("👉 STEP 2: Drag 'Bold.ttf' & 'Regular.ttf' into 'roku/fonts'");
console.log("👉 STEP 3: Zip the 'roku' contents and Upload.");
console.log("---------------------------------------------------");