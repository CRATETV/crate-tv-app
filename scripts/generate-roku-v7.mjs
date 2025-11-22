import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';

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

function writeBinary(relativePath, buffer) {
    const filePath = path.join(rokuDir, relativePath);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Created Binary: ${relativePath}`);
}

// 1. WIPE OLD FOLDER
if (fs.existsSync(rokuDir)) {
    fs.rmSync(rokuDir, { recursive: true, force: true });
}
fs.mkdirSync(rokuDir);

// 2. MANIFEST (v7.0)
writeFile('manifest', `
title=Crate TV
subtitle=Stream Independent Film
major_version=7
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

// 5. MAIN SCENE (Router + Global Nav)
writeFile('components/MainScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/MainScene.brs" />
    <children>
        <!-- Global Background -->
        <Rectangle width="1920" height="1080" color="#141414" />

        <!-- View Container -->
        <Group id="viewContainer" />

        <!-- GLOBAL TOP NAVIGATION -->
        <!-- Moved higher to avoid overlapping content -->
        <Group id="topNav" translation="[0, 0]" visible="false">
            <!-- Gradient bg for nav -->
            <Rectangle width="1920" height="100" color="#000000" opacity="0.95" />
            
            <Poster uri="pkg:/images/logo_hd.png" width="120" height="60" translation="[50, 20]" />
            
            <LayoutGroup id="navMenu" layoutDirection="horiz" translation="[250, 30]" itemSpacings="[30]">
                <Button id="navHome" text="Home" minWidth="150" height="40" iconUri="" focusedIconUri="" />
                <Button id="navSearch" text="Search" minWidth="150" height="40" iconUri="" focusedIconUri="" />
                <Button id="navClassics" text="Classics" minWidth="150" height="40" iconUri="" focusedIconUri="" />
                <Button id="navPortals" text="Portals" minWidth="150" height="40" iconUri="" focusedIconUri="" />
                <Button id="navAccount" text="Account" minWidth="150" height="40" iconUri="" focusedIconUri="" />
            </LayoutGroup>
        </Group>

        <!-- Global Spinner -->
        <BusySpinner id="globalSpinner" visible="true" translation="[960, 540]" />
    </children>
</component>
`);

writeFile('components/MainScene.brs', `
sub init()
    m.viewContainer = m.top.findNode("viewContainer")
    m.topNav = m.top.findNode("topNav")
    m.navMenu = m.top.findNode("navMenu")
    m.globalSpinner = m.top.findNode("globalSpinner")
    
    ' Nav Buttons
    m.navHome = m.top.findNode("navHome")
    m.navSearch = m.top.findNode("navSearch")
    m.navClassics = m.top.findNode("navClassics")
    m.navPortals = m.top.findNode("navPortals")
    m.navAccount = m.top.findNode("navAccount")
    
    ' Helper array for navigation logic
    m.navButtons = [m.navHome, m.navSearch, m.navClassics, m.navPortals, m.navAccount]
    m.navIndex = 0 
    m.focusState = "loading"

    m.navHome.observeField("buttonSelected", "onNavSelect")
    m.navSearch.observeField("buttonSelected", "onNavSelect")
    m.navClassics.observeField("buttonSelected", "onNavSelect")
    m.navPortals.observeField("buttonSelected", "onNavSelect")
    m.navAccount.observeField("buttonSelected", "onNavSelect")

    ' Navigation Stack
    m.viewStack = []
    
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
        navigateTo("HomeView")
    else
        navigateTo("AccountLinkScene")
    end if
end sub

sub navigateTo(componentName as String, args = invalid as Object)
    if m.viewStack.Count() > 0
        current = m.viewStack.Peek()
        current.visible = false
    end if

    newView = CreateObject("roSGNode", componentName)
    
    if args <> invalid
        if componentName = "DetailsView" then newView.content = args
    end if

    if componentName = "HomeView" or componentName = "SearchView"
        newView.observeField("rowItemSelected", "onContentSelect")
    else if componentName = "AccountLinkScene"
        newView.observeField("loginSuccess", "onLoginSuccess")
    end if

    m.viewContainer.appendChild(newView)
    m.viewStack.Push(newView)
    
    updateNavVisibility(componentName)
    
    ' Reset focus state
    if m.topNav.visible
        m.focusState = "content"
        newView.setFocus(true)
    else
        m.focusState = "fullscreen"
        newView.setFocus(true)
    end if
end sub

sub onLoginSuccess()
    m.viewStack.Clear()
    m.viewContainer.removeChildren(m.viewContainer.getChildren(-1, 0))
    navigateTo("HomeView")
end sub

sub onContentSelect(evt)
    item = evt.getData()
    navigateTo("DetailsView", item)
end sub

sub onNavSelect(evt)
    btn = evt.getRoSGNode()
    id = btn.id
    
    ' Clear stack for main nav items to avoid infinite back history
    m.viewStack.Clear()
    m.viewContainer.removeChildren(m.viewContainer.getChildren(-1, 0))

    if id = "navHome"
        navigateTo("HomeView")
    else if id = "navSearch"
        navigateTo("SearchView")
    else if id = "navAccount"
        navigateTo("AccountLinkScene")
    else
        ' Placeholder
        navigateTo("HomeView") 
    end if
end sub

sub updateNavVisibility(screenName)
    if screenName = "DetailsView" or screenName = "AccountLinkScene"
        m.topNav.visible = false
        m.focusState = "fullscreen"
    else
        m.topNav.visible = true
        m.focusState = "content"
    end if
end sub

' --- NAVIGATION LOGIC FIX ---
function onKeyEvent(key, press)
    if press
        if m.focusState = "nav"
            if key = "right"
                if m.navIndex < m.navButtons.Count() - 1
                    m.navIndex = m.navIndex + 1
                    m.navButtons[m.navIndex].setFocus(true)
                end if
                return true
            else if key = "left"
                if m.navIndex > 0
                    m.navIndex = m.navIndex - 1
                    m.navButtons[m.navIndex].setFocus(true)
                end if
                return true
            else if key = "down"
                m.focusState = "content"
                if m.viewStack.Peek() <> invalid
                    m.viewStack.Peek().setFocus(true)
                end if
                return true
            end if
        else if m.focusState = "content"
            if key = "up"
                m.focusState = "nav"
                m.navButtons[m.navIndex].setFocus(true)
                return true
            else if key = "back"
                 ' Only go back if we have history
                 if m.viewStack.Count() > 1
                    current = m.viewStack.Pop()
                    m.viewContainer.removeChild(current)
                    prev = m.viewStack.Peek()
                    prev.visible = true
                    prev.setFocus(true)
                    updateNavVisibility(prev.subtype())
                    return true
                 end if
            end if
        else if m.focusState = "fullscreen"
            if key = "back"
                if m.viewStack.Count() > 1
                    current = m.viewStack.Pop()
                    m.viewContainer.removeChild(current)
                    prev = m.viewStack.Peek()
                    prev.visible = true
                    prev.setFocus(true)
                    updateNavVisibility(prev.subtype())
                    return true
                 end if
            end if
        end if
    end if
    return false
end function
`);

// 6. HOME VIEW (Fixed Colors & Removed White Block)
writeFile('components/HomeView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeView" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/HomeView.brs" />
    <interface>
        <field id="rowItemSelected" type="node" />
    </interface>
    <children>
        <!-- Hero Background -->
        <Poster id="heroBg" width="1920" height="1080" loadDisplayMode="scaleToZoom" failedBitmapUri="pkg:/images/placeholder.png" />
        
        <!-- Dark Overlay to ensure text pops -->
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.5" />
        
        <!-- Hero Info -->
        <Group id="heroGroup" translation="[100, 250]">
            <Label id="heroTitle" width="1000" color="#FFFFFF" font="font:BoldSystemFont" size="90" wrap="true" />
            <Label id="heroDesc" width="800" color="#FFFFFF" font="font:SystemFont" size="28" maxLines="3" wrap="true" translation="[0, 150]" lineSpacing="6" />
        </Group>

        <!-- Rows -->
        <!-- Removed the 'white block' rectangle from here -->
        <RowList 
            id="rowList" 
            translation="[0, 500]" 
            itemComponentName="CinematicPosterItem" 
            numRows="2" 
            rowItemSize="[[320, 180]]" 
            rowItemSpacing="[[20, 40]]" 
            itemSize="[1920, 300]" 
            rowLabelOffset="[[80, -30]]" 
            rowLabelColor="#FFFFFF"
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
        item = content.getChild(row).getChild(col)
        if item <> invalid
            m.heroBg.uri = item.hdPosterUrl
            m.heroTitle.text = item.title
            if item.description <> invalid then m.heroDesc.text = item.description
        end if
    end if
end sub
sub onSelect()
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    item = m.rowList.content.getChild(row).getChild(col)
    m.top.rowItemSelected = item
end sub
`);

// 7. SEARCH VIEW
writeFile('components/SearchView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="SearchView" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/SearchView.brs" />
    <interface>
        <field id="rowItemSelected" type="node" />
    </interface>
    <children>
        <Rectangle width="1920" height="1080" color="#141414" />
        <Group translation="[100, 150]">
            <Label text="Search Crate TV" color="#FFFFFF" font="font:BoldSystemFont" size="40" />
            <Keyboard id="keyboard" translation="[0, 60]" />
        </Group>
        <RowList 
            id="resultsList" 
            translation="[600, 210]" 
            itemComponentName="CinematicPosterItem" 
            numRows="3" 
            rowItemSize="[[320, 180]]" 
            rowItemSpacing="[[20, 20]]" 
            itemSize="[1300, 250]" 
            focusXOffset="[0]" 
            rowFocusAnimationStyle="floatingFocus" 
        />
    </children>
</component>
`);

writeFile('components/SearchView.brs', `
sub init()
    m.keyboard = m.top.findNode("keyboard")
    m.resultsList = m.top.findNode("resultsList")
    m.keyboard.observeField("text", "onSearch")
    m.resultsList.observeField("rowItemSelected", "onSelect")
    loadContent()
end sub
sub loadContent()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "feed"
    task.observeField("feedData", "onFeedLoaded")
    task.control = "RUN"
end sub
sub onFeedLoaded(evt)
    m.fullData = evt.getData()
    m.keyboard.setFocus(true)
end sub
sub onSearch()
    query = LCase(m.keyboard.text)
    if m.fullData = invalid return
    root = CreateObject("roSGNode", "ContentNode")
    row = root.CreateChild("ContentNode")
    allRows = m.fullData.rows
    if allRows <> invalid
        count = allRows.getChildCount()
        for i = 0 to count - 1
            category = allRows.getChild(i)
            items = category.getChildCount()
            for j = 0 to items - 1
                item = category.getChild(j)
                if LCase(item.title).Instr(query) >= 0
                    resItem = row.CreateChild("ContentNode")
                    resItem.title = item.title
                    resItem.hdPosterUrl = item.hdPosterUrl
                    resItem.url = item.url
                    resItem.description = item.description
                    resItem.rating = item.rating
                    resItem.duration = item.duration
                end if
            end for
        end for
    end if
    m.resultsList.content = root
end sub
sub onSelect()
    row = m.resultsList.rowItemFocused[0]
    col = m.resultsList.rowItemFocused[1]
    item = m.resultsList.content.getChild(row).getChild(col)
    m.top.rowItemSelected = item
end sub
function onKeyEvent(key, press)
    if press
        if key = "right" and m.keyboard.hasFocus()
            if m.resultsList.content <> invalid and m.resultsList.content.getChildCount() > 0
                m.resultsList.setFocus(true)
                return true
            end if
        else if key = "left" and m.resultsList.hasFocus()
            m.keyboard.setFocus(true)
            return true
        end if
    end if
    return false
end function
`);

// 8. DETAILS VIEW
writeFile('components/DetailsView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="DetailsView" extends="Group">
    <interface><field id="content" type="node" onChange="onContentSet" /></interface>
    <script type="text/brightscript" uri="pkg:/components/DetailsView.brs" />
    <children>
        <Poster id="bg" width="1920" height="1080" loadDisplayMode="scaleToZoom" failedBitmapUri="pkg:/images/placeholder.png" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.9" />
        <Group translation="[100, 150]">
            <Poster id="poster" width="300" height="450" loadDisplayMode="scaleToZoom" failedBitmapUri="pkg:/images/placeholder.png" />
            <Group translation="[350, 0]">
                <Label id="title" width="1200" color="#FFFFFF" wrap="true" font="font:BoldSystemFont" size="70" />
                <Label id="meta" translation="[0, 90]" color="#E50914" font="font:BoldSystemFont" size="28" />
                <Label id="desc" translation="[0, 140]" width="1000" color="#CCCCCC" wrap="true" maxLines="6" font="font:RegularSystemFont" size="26" />
                <Rectangle id="playBtn" translation="[0, 400]" width="300" height="70" color="#E50914" cornerRadius="5">
                    <Label text="PLAY NOW" width="300" height="70" horizAlign="center" vertAlign="center" color="#FFFFFF" font="font:BoldSystemFont" size="28" />
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
                return false 
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
    m.playBtn.setFocus(true)
end sub
`);

// 9. CINEMATIC POSTER ITEM (16:9)
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
        <Poster id="poster" width="320" height="180" loadDisplayMode="scaleToZoom" loadWidth="320" loadHeight="180" failedBitmapUri="pkg:/images/placeholder.png" />
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

// 10. AccountLinkScene (Reused with White Fonts)
writeFile('components/AccountLinkScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="AccountLinkScene" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/AccountLinkScene.brs" />
    <interface><field id="loginSuccess" type="boolean" /></interface>
    <children>
        <Poster uri="pkg:/images/splash_hd.jpg" width="1920" height="1080" opacity="0.3" loadDisplayMode="scaleToZoom" />
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.9" />
        <Group id="linkGroup">
            <Label text="Sign In to Crate TV" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 200]" font="font:BoldSystemFont" size="60" />
            <Label text="WEB: cratetv.net/link" width="1920" horizAlign="center" color="#AAAAAA" translation="[0, 300]" font="font:SystemFont" size="30" />
            <Label id="codeLabel" text="..." width="1920" horizAlign="center" color="#E50914" translation="[0, 400]" font="font:BoldSystemFont" size="120" />
            <Button id="emailBtn" text="Sign In with Password" translation="[810, 600]" minWidth="300" />
        </Group>
        <Group id="loginGroup" visible="false">
            <Rectangle width="1920" height="1080" color="#141414" />
            <Label id="inputLabel" text="Enter Email" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 150]" font="font:BoldSystemFont" size="40" />
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

// 11. API TASK (Robust)
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

// Placeholder image
const placeholderBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
writeBinary('images/placeholder.png', placeholderBuffer);

if (!fs.existsSync(path.join(rokuDir, 'images'))) fs.mkdirSync(path.join(rokuDir, 'images'));

console.log("\n---------------------------------------------------");
console.log("✅ ROKU V7 (NAVIGATION FIX) GENERATED");
console.log("👉 STEP 1: Drag 'logo_hd.png' & 'splash_hd.jpg' into 'roku/images'");
console.log("👉 STEP 2: Zip 'roku' contents and Upload.");
console.log("---------------------------------------------------");