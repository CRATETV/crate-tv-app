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
}

// 1. WIPE OLD FOLDER
if (fs.existsSync(rokuDir)) {
    fs.rmSync(rokuDir, { recursive: true, force: true });
}
fs.mkdirSync(rokuDir);

// 2. MANIFEST (v12.0)
writeFile('manifest', `
title=Crate TV
subtitle=Stream Independent Film
major_version=12
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

// 5. SIDEBAR (Collapsible "Netflix Style")
writeFile('components/SideBar.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="SideBar" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/SideBar.brs" />
    <interface>
        <field id="itemSelected" type="string" />
        <field id="isExpanded" type="boolean" value="false" onChange="onStateChange" />
    </interface>
    <children>
        <!-- Background -->
        <Rectangle id="bg" width="80" height="1080" color="#000000" opacity="0.95" />
        
        <!-- Divider Line -->
        <Rectangle id="divider" width="2" height="1080" translation="[80, 0]" color="#333333" />

        <!-- Menu Items Container -->
        <Group id="menuGroup" translation="[10, 200]">
            <!-- Using LayoutGroup for auto-spacing -->
            <LayoutGroup itemSpacings="[30]">
                <Button id="navSearch" text=" Search" minWidth="50" height="60" showFocusFootprint="true" />
                <Button id="navHome" text=" Home" minWidth="50" height="60" showFocusFootprint="true" />
                <Button id="navClassics" text=" Classics" minWidth="50" height="60" showFocusFootprint="true" />
                <Button id="navAccount" text=" Account" minWidth="50" height="60" showFocusFootprint="true" />
            </LayoutGroup>
        </Group>

        <!-- Animation Nodes -->
        <Animation id="expandAnim" duration="0.2" easeFunction="outCubic">
            <FloatInterpolator key="[0.0, 1.0]" keyValue="[ 80.0, 350.0 ]" fieldToInterp="bg.width" />
            <Vector2DFieldInterpolator key="[0.0, 1.0]" keyValue="[ [80.0, 0.0], [350.0, 0.0] ]" fieldToInterp="divider.translation" />
        </Animation>
        
        <Animation id="collapseAnim" duration="0.2" easeFunction="outCubic">
            <FloatInterpolator key="[0.0, 1.0]" keyValue="[ 350.0, 80.0 ]" fieldToInterp="bg.width" />
            <Vector2DFieldInterpolator key="[0.0, 1.0]" keyValue="[ [350.0, 0.0], [80.0, 0.0] ]" fieldToInterp="divider.translation" />
        </Animation>
    </children>
</component>
`);

writeFile('components/SideBar.brs', `
sub init()
    m.bg = m.top.findNode("bg")
    m.expandAnim = m.top.findNode("expandAnim")
    m.collapseAnim = m.top.findNode("collapseAnim")
    
    m.navSearch = m.top.findNode("navSearch")
    m.navHome = m.top.findNode("navHome")
    m.navClassics = m.top.findNode("navClassics")
    m.navAccount = m.top.findNode("navAccount")
    
    ' Listen for button clicks
    m.navSearch.observeField("buttonSelected", "onBtnSelect")
    m.navHome.observeField("buttonSelected", "onBtnSelect")
    m.navClassics.observeField("buttonSelected", "onBtnSelect")
    m.navAccount.observeField("buttonSelected", "onBtnSelect")
    
    ' Observe focus to trigger expand/collapse
    m.top.observeField("focusedChild", "onFocusChange")
end sub

sub onFocusChange()
    if m.top.hasFocus()
        ' Sidebar got focus -> Expand
        m.expandAnim.control = "start"
        setButtonsExpanded(true)
        
        ' Ensure a button is focused if container gets focus
        if not m.navSearch.hasFocus() and not m.navHome.hasFocus() and not m.navClassics.hasFocus() and not m.navAccount.hasFocus()
            m.navHome.setFocus(true)
        end if
    else
        ' Focus lost -> Collapse
        m.collapseAnim.control = "start"
        setButtonsExpanded(false)
    end if
end sub

sub setButtonsExpanded(isExpanded)
    w = 50
    if isExpanded then w = 300
    m.navSearch.minWidth = w
    m.navHome.minWidth = w
    m.navClassics.minWidth = w
    m.navAccount.minWidth = w
end sub

sub onBtnSelect(evt)
    btn = evt.getRoSGNode()
    m.top.itemSelected = btn.id
end sub

function onKeyEvent(key, press)
    if press
        if key = "right"
            ' Block internal movement, allow MainScene to shift focus to content
            return false 
        end if
    end if
    return false
end function
`);

// 6. MAIN SCENE (Orchestrator)
writeFile('components/MainScene.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="MainScene" extends="Scene">
    <script type="text/brightscript" uri="pkg:/components/MainScene.brs" />
    <children>
        <Rectangle width="1920" height="1080" color="#141414" />
        
        <!-- View Container (Pushed slightly right to clear collapsed sidebar) -->
        <Group id="viewContainer" translation="[100, 0]" />
        
        <!-- Sidebar (On Top) -->
        <SideBar id="sideBar" />

        <BusySpinner id="globalSpinner" visible="true" translation="[960, 540]" />
    </children>
</component>
`);

writeFile('components/MainScene.brs', `
sub init()
    m.viewContainer = m.top.findNode("viewContainer")
    m.sideBar = m.top.findNode("sideBar")
    m.globalSpinner = m.top.findNode("globalSpinner")
    m.sideBar.observeField("itemSelected", "onNavSelect")
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

sub navigateTo(componentName, args = invalid)
    if m.viewStack.Count() > 0
        current = m.viewStack.Peek()
        current.visible = false
    end if
    newView = CreateObject("roSGNode", componentName)
    if args <> invalid and componentName = "DetailsView" then newView.content = args

    if componentName = "HomeView" or componentName = "SearchView" or componentName = "ClassicsView"
        newView.observeField("rowItemSelected", "onContentSelect")
    else if componentName = "AccountLinkScene"
        newView.observeField("loginSuccess", "onLoginSuccess")
    end if

    m.viewContainer.appendChild(newView)
    m.viewStack.Push(newView)
    
    ' Handle Focus
    if componentName = "DetailsView" or componentName = "AccountLinkScene"
        m.sideBar.visible = false
        newView.setFocus(true)
    else
        m.sideBar.visible = true
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
    id = evt.getData()
    m.viewStack.Clear()
    m.viewContainer.removeChildren(m.viewContainer.getChildren(-1, 0))
    
    if id = "navHome" then navigateTo("HomeView")
    if id = "navSearch" then navigateTo("SearchView")
    if id = "navClassics" then navigateTo("ClassicsView")
    if id = "navAccount" then navigateTo("AccountLinkScene")
    
    ' After selection, collapse sidebar by moving focus to content
    if m.viewContainer.getChildCount() > 0
        m.viewContainer.getChild(0).setFocus(true)
    end if
end sub

' --- GLOBAL NAVIGATION HANDLER ---
function onKeyEvent(key, press)
    if press
        if key = "left"
            ' If focus is on content, try to move to sidebar
            if not m.sideBar.hasFocus() and m.sideBar.visible
                m.sideBar.setFocus(true)
                return true
            end if
        else if key = "right"
            ' If focus is on sidebar, move back to content
            if m.sideBar.hasFocus()
                if m.viewContainer.getChildCount() > 0
                    m.viewContainer.getChild(0).setFocus(true)
                    return true
                end if
            end if
        else if key = "back"
            ' Handle back button history
            if m.viewStack.Count() > 1
                current = m.viewStack.Pop()
                m.viewContainer.removeChild(current)
                prev = m.viewStack.Peek()
                prev.visible = true
                prev.setFocus(true)
                if prev.subtype() <> "DetailsView" and prev.subtype() <> "AccountLinkScene"
                    m.sideBar.visible = true
                end if
                return true
            end if
        end if
    end if
    return false
end function
`);

// 7. HOME VIEW (White Text, Fixed)
writeFile('components/HomeView.xml', `
<?xml version="1.0" encoding="utf-8" ?>
<component name="HomeView" extends="Group">
    <script type="text/brightscript" uri="pkg:/components/HomeView.brs" />
    <interface><field id="rowItemSelected" type="node" /></interface>
    <children>
        <!-- Hero Background -->
        <Poster id="heroBg" width="1920" height="1080" loadDisplayMode="scaleToZoom" failedBitmapUri="pkg:/images/placeholder.png" />
        
        <!-- Dark Overlay to ensure text pops -->
        <Rectangle width="1920" height="1080" color="#000000" opacity="0.5" />
        
        <!-- Hero Info -->
        <Group id="heroGroup" translation="[100, 250]">
            <Label id="heroTitle" width="1000" color="#FFFFFF" font="font:BoldSystemFont" size="90" wrap="true" />
            <LayoutGroup layoutDirection="horiz" itemSpacings="[20]" translation="[0, 130]">
                <Label id="heroMeta" color="#CCCCCC"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="28" /></Label>
                <Rectangle width="50" height="32" color="#333" cornerRadius="4"><Label text="HD" width="50" height="32" horizAlign="center" color="#DDD"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="20" /></Label></Rectangle>
            </LayoutGroup>
            <Label id="heroDesc" width="800" color="#FFFFFF" font="font:SystemFont" size="28" maxLines="3" wrap="true" translation="[0, 180]" lineSpacing="6" />
        </Group>

        <!-- Rows -->
        <RowList 
            id="rowList" 
            translation="[0, 500]" 
            itemComponentName="CinematicPosterItem" 
            numRows="3" 
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
        <Timer id="heroTimer" repeat="true" duration="8" />
    </children>
</component>
`);

writeFile('components/HomeView.brs', `
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
        ' Auto start rotation
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
        if item <> invalid
            updateHero(item)
        end if
    end if
end sub
sub updateHero(item)
    if item = invalid return
    m.heroBg.uri = item.hdPosterUrl
    m.heroTitle.text = item.title
    if item.description <> invalid then m.heroDesc.text = item.description
    meta = ""
    if item.rating <> invalid then meta = item.rating
    if item.duration <> invalid then meta = meta + " | " + item.duration
    m.heroMeta.text = meta
end sub
sub onSelect()
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    item = m.rowList.content.getChild(row).getChild(col)
    m.top.rowItemSelected = item
end sub
function onKeyEvent(key, press)
    if press
        if key = "left"
            ' Only allow left to Sidebar if on the first column
            if m.rowList.rowItemFocused[1] = 0
                return false ' Pass to MainScene to open Sidebar
            end if
            ' Otherwise let RowList handle left nav between movies
        end if
    end if
    return false
end function
`);

// 8. CINEMATIC POSTER ITEM (Red Box Fix)
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
        <!-- FIXED: Explicitly transparent background fill="false" -->
        <Rectangle id="focusRing" width="330" height="190" translation="[-5, -5]" color="#E50914" fill="false" opacity="0" stroke="6" />
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
    scale = 1 + (m.top.rowFocusPercent * 0.15)
    m.focusRing.opacity = m.top.rowFocusPercent
    m.poster.scale = [scale, scale]
    m.focusRing.scale = [scale, scale]
end sub
`);

// 9. DETAILS VIEW (Reused from V11, Solid)
writeFile('components/DetailsView.xml', `<?xml version="1.0" encoding="utf-8" ?><component name="DetailsView" extends="Group"><interface><field id="content" type="node" onChange="onContentSet" /></interface><script type="text/brightscript" uri="pkg:/components/DetailsView.brs" /><children><Poster id="bg" width="1920" height="1080" loadDisplayMode="scaleToZoom" failedBitmapUri="pkg:/images/placeholder.png" /><Rectangle width="1920" height="1080" color="#000000" opacity="0.9" /><Group translation="[100, 150]"><Poster id="poster" width="300" height="450" loadDisplayMode="scaleToZoom" failedBitmapUri="pkg:/images/placeholder.png" /><Group translation="[350, 0]"><Label id="title" width="1200" color="#FFFFFF" wrap="true"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="70" /></Label><Label id="meta" translation="[0, 90]" color="#E50914"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="28" /></Label><Label id="desc" translation="[0, 140]" width="1000" color="#CCCCCC" wrap="true" maxLines="6"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="26" /></Label><Rectangle id="playBtn" translation="[0, 400]" width="300" height="80" color="#E50914" cornerRadius="5"><Label text="PLAY NOW" width="300" height="80" horizAlign="center" vertAlign="center" color="#FFFFFF"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="28" /></Label></Rectangle></Group></Group><Video id="video" visible="false" width="1920" height="1080" /></children></component>`);
writeFile('components/DetailsView.brs', `sub init()
    m.bg = m.top.findNode("bg")
    m.poster = m.top.findNode("poster")
    m.title = m.top.findNode("title")
    m.meta = m.top.findNode("meta")
    m.desc = m.top.findNode("desc")
    m.playBtn = m.top.findNode("playBtn")
    m.video = m.top.findNode("video")
    m.video.observeField("state", "onVideoState")
    m.playBtnFocus = m.top.findNode("playBtn")
    m.playBtn.opacity = 1
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
                m.top.getScene().removeChild(m.top)
                m.top.getScene().viewContainer.getChild(0).setFocus(true)
                m.top.getScene().sideBar.visible = true
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
sub onVideoState()
    if m.video.state = "finished" or m.video.state = "error" then stopVideo()
end sub`);

// 10. CLASSICS, SEARCH, ACCOUNT (Reused)
writeFile('components/ClassicsView.xml', `<?xml version="1.0" encoding="utf-8" ?><component name="ClassicsView" extends="Group"><script type="text/brightscript" uri="pkg:/components/ClassicsView.brs" /><interface><field id="rowItemSelected" type="node" /></interface><children><Rectangle width="1920" height="1080" color="#141414" /><Label text="Classic Movies" color="#FFFFFF" font="font:BoldSystemFont" size="50" translation="[100, 100]" /><PosterGrid id="grid" translation="[100, 200]" basePosterSize="[360, 203]" itemSpacing="[30, 30]" caption1NumLines="1" numColumns="4" numRows="3" /></children></component>`);
writeFile('components/ClassicsView.brs', `sub init()
    m.grid = m.top.findNode("grid")
    m.grid.observeField("itemSelected", "onSelect")
    loadContent()
end sub
sub loadContent()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "feed"
    task.observeField("feedData", "onFeedLoaded")
    task.control = "RUN"
end sub
sub onFeedLoaded(evt)
    data = evt.getData()
    if data <> invalid and data.classics <> invalid
        m.grid.content = data.classics
        m.grid.setFocus(true)
    end if
end sub
sub onSelect()
    item = m.grid.content.getChild(m.grid.itemSelected)
    m.top.rowItemSelected = item
end sub`);
writeFile('components/SearchView.xml', `<?xml version="1.0" encoding="utf-8" ?><component name="SearchView" extends="Group"><script type="text/brightscript" uri="pkg:/components/SearchView.brs" /><interface><field id="rowItemSelected" type="node" /></interface><children><Rectangle width="1920" height="1080" color="#141414" /><Group translation="[100, 150]"><Label text="Search" color="#FFFFFF" font="font:BoldSystemFont" size="40" /><Keyboard id="keyboard" translation="[0, 60]" /></Group><RowList id="resultsList" translation="[600, 210]" itemComponentName="CinematicPosterItem" numRows="3" rowItemSize="[[360, 203]]" rowItemSpacing="[[20, 20]]" itemSize="[1300, 280]" focusXOffset="[0]" rowFocusAnimationStyle="floatingFocus" /></children></component>`);
writeFile('components/SearchView.brs', `sub init()
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
                    item.clone(true).reparent(row, true)
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
end function`);
writeFile('components/AccountLinkScene.xml', `<?xml version="1.0" encoding="utf-8" ?><component name="AccountLinkScene" extends="Group"><script type="text/brightscript" uri="pkg:/components/AccountLinkScene.brs" /><interface><field id="loginSuccess" type="boolean" /></interface><children><Poster uri="pkg:/images/splash_hd.jpg" width="1920" height="1080" opacity="0.3" loadDisplayMode="scaleToZoom" /><Rectangle width="1920" height="1080" color="#000000" opacity="0.9" /><Group id="linkGroup"><Label text="Sign In to Crate TV" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 200]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="60" /></Label><Label text="WEB: cratetv.net/link" width="1920" horizAlign="center" color="#AAAAAA" translation="[0, 300]"><Font role="font" uri="pkg:/fonts/Regular.ttf" size="30" /></Label><Label id="codeLabel" text="..." width="1920" horizAlign="center" color="#E50914" translation="[0, 400]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="120" /></Label><Button id="emailBtn" text="Sign In with Password" translation="[810, 600]" minWidth="300" /></Group><Group id="loginGroup" visible="false"><Rectangle width="1920" height="1080" color="#141414" /><Label id="inputLabel" text="Enter Email" width="1920" horizAlign="center" color="#FFFFFF" translation="[0, 150]"><Font role="font" uri="pkg:/fonts/Bold.ttf" size="40" /></Label><Rectangle width="800" height="60" color="#333333" translation="[560, 220]"><Label id="inputText" text="" color="#FFFFFF" translation="[10, 10]" /></Rectangle><Keyboard id="keyboard" translation="[560, 300]" /><Label id="statusLabel" width="1920" horizAlign="center" color="#E50914" translation="[0, 800]" /><Button id="backBtn" text="Back" translation="[100, 100]" /></Group><Timer id="pollTimer" repeat="true" duration="5" /></children></component>`);
writeFile('components/AccountLinkScene.brs', `sub init()
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
end sub`);

// 11. API TASK (Reused from V11)
writeFile('components/APITask.xml', `<?xml version="1.0" encoding="utf-8" ?><component name="APITask" extends="Task"><interface><field id="requestType" type="string" /><field id="email" type="string" /><field id="password" type="string" /><field id="linkCode" type="string" /><field id="authResult" type="assocarray" /><field id="feedData" type="assocarray" /></interface><script type="text/brightscript" uri="pkg:/source/Config.brs" /><script type="text/brightscript" uri="pkg:/components/APITask.brs" /></component>`);
writeFile('components/APITask.brs', `sub init()
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
        rootHome = CreateObject("roSGNode", "ContentNode")
        rootClassics = CreateObject("roSGNode", "ContentNode")
        if json.categories <> invalid
            for each cat in json.categories
                isClassic = (cat.title.Instr("Classics") >= 0 or cat.title.Instr("Public Domain") >= 0)
                if isClassic
                    for each vid in cat.children
                        addNode(rootClassics, vid)
                    end for
                else
                    if cat.children <> invalid and cat.children.Count() > 0
                        row = rootHome.CreateChild("ContentNode")
                        row.title = cat.title
                        for each vid in cat.children
                            addNode(row, vid)
                        end for
                    end if
                end if
            end for
        end if
        result.rows = rootHome
        result.classics = rootClassics
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
    n.ShortDescriptionLine1 = d.title 
    n.ShortDescriptionLine2 = d.description
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

// Placeholder
const placeholderBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
writeBinary('images/placeholder.png', placeholderBuffer);

if (!fs.existsSync(path.join(rokuDir, 'images'))) fs.mkdirSync(path.join(rokuDir, 'images'));
if (!fs.existsSync(path.join(rokuDir, 'fonts'))) fs.mkdirSync(path.join(rokuDir, 'fonts'));

console.log("---------------------------------------------------");
console.log("✅ ROKU V12 (SIDEBAR, RED BOX FIX, BLUE TEXT FIX) GENERATED");
console.log("👉 STEP 1: Drag 'logo_hd.png' & 'splash_hd.jpg' into 'roku/images'");
console.log("👉 STEP 2: Drag 'Bold.ttf' & 'Regular.ttf' into 'roku/fonts'");
console.log("👉 STEP 3: Zip 'roku' contents and Upload.");
console.log("---------------------------------------------------");