sub init()
    m.rowList       = m.top.findNode("rowList")
    m.heroImage     = m.top.findNode("heroImage")
    m.heroTitle     = m.top.findNode("heroTitle")
    m.heroDirector  = m.top.findNode("heroDirector")
    m.heroSynopsis  = m.top.findNode("heroSynopsis")
    m.heroBadge     = m.top.findNode("heroBadge")
    m.playBtn       = m.top.findNode("playBtn")
    m.infoBtn       = m.top.findNode("infoBtn")
    m.heroTrailer   = m.top.findNode("heroTrailer")
    m.trailerTimer  = m.top.findNode("trailerTimer")
    m.trailerStopTimer = m.top.findNode("trailerStopTimer")
    m.heroRotateTimer  = m.top.findNode("heroRotateTimer")

    m.currentItem   = invalid
    m.heroIndex     = 0
    m.heroItems     = []
    m.focusedBtn    = "play"

    m.rowList.observeField("rowItemFocused",  "onItemFocused")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
    m.trailerTimer.observeField("fire",     "onTrailerTimerFire")
    m.trailerStopTimer.observeField("fire", "onTrailerStopTimerFire")
    m.heroTrailer.observeField("state",     "onTrailerStateChange")
    m.heroRotateTimer.observeField("fire",  "onHeroRotate")
end sub

' ── HERO ITEMS (wide format for hero) ─────────────────────────────────────
sub onHeroItemsChange()
    heroNode = m.top.heroItems
    if heroNode = invalid then return
    count = heroNode.getChildCount()
    if count = 0 then return

    m.heroItems = []
    for i = 0 to count - 1
        m.heroItems.push(heroNode.getChild(i))
    end for

    m.heroIndex = 0
    UpdateHero(m.heroItems[0])
    if count > 1 then m.heroRotateTimer.control = "start"
end sub

sub onHeroRotate()
    if m.heroItems.count() < 2 then return
    ' Don't rotate while user is browsing rows
    m.heroIndex = (m.heroIndex + 1) mod m.heroItems.count()
    UpdateHero(m.heroItems[m.heroIndex])
end sub

' ── CONTENT ROWS ─────────────────────────────────────────────────────────
sub onContentChange()
    if m.top.content <> invalid
        m.rowList.content = m.top.content
        ' If no separate heroItems were set, use first row item as hero
        if m.heroItems.count() = 0
            if m.top.content.getChildCount() > 0 and m.top.content.getChild(0).getChildCount() > 0
                UpdateHero(m.top.content.getChild(0).getChild(0))
            end if
        end if
    end if
end sub

sub onItemFocused()
    focusedIndex = m.rowList.rowItemFocused
    row = m.rowList.content.getChild(focusedIndex[0])
    item = row.getChild(focusedIndex[1])
    m.currentItem = item

    ' Stop trailer, reset to poster
    StopTrailer()
    UpdateHeroFromItem(item)

    ' Start dwell timer for trailer
    if item.trailerUrl <> invalid and item.trailerUrl <> ""
        m.trailerTimer.control = "start"
    end if
end sub

' ── HERO UPDATE ──────────────────────────────────────────────────────────
' Called for auto-rotating hero items (uses wide heroImage)
sub UpdateHero(item as Object)
    if item = invalid then return
    ' Prefer wide hero image, fall back to portrait poster
    heroUrl = item.heroImage
    if heroUrl = invalid or heroUrl = "" then heroUrl = item.hdPosterUrl
    m.heroImage.uri = heroUrl
    m.heroTitle.text     = item.title
    m.heroSynopsis.text  = item.description

    director = item.director
    if director <> invalid and director <> ""
        m.heroDirector.text = "Directed by " + director
    else
        m.heroDirector.text = ""
    end if

    ' Badge
    if item.live = true
        m.heroBadge.text = "  LIVE NOW  "
    else if item.isFestival = true
        m.heroBadge.text = "  FESTIVAL  "
    else
        m.heroBadge.text = "  SPOTLIGHT  "
    end if
end sub

' Called when user focuses a row item (uses portrait poster for hero)
sub UpdateHeroFromItem(item as Object)
    if item = invalid then return
    ' Row items use portrait poster on hero (same as web app on mobile)
    m.heroImage.uri      = item.hdPosterUrl
    m.heroTitle.text     = item.title
    m.heroSynopsis.text  = item.description
    director = item.director
    if director <> invalid and director <> ""
        m.heroDirector.text = "Directed by " + director
    else
        m.heroDirector.text = ""
    end if
end sub

' ── TRAILER ──────────────────────────────────────────────────────────────
sub onTrailerTimerFire()
    if m.currentItem = invalid then return
    trailerUrl = m.currentItem.trailerUrl
    if trailerUrl = invalid or trailerUrl = "" then return

    content = CreateObject("roSGNode", "ContentNode")
    content.url = trailerUrl
    content.streamFormat = "mp4"

    trailerStart = m.currentItem.trailerStart
    if trailerStart <> invalid and trailerStart > 0
        content.bookmarkPosition = trailerStart
    end if

    m.heroTrailer.content = content
    m.heroTrailer.visible = true
    m.heroTrailer.control = "play"
    m.heroImage.visible   = false
    m.trailerStopTimer.control = "start"
end sub

sub onTrailerStopTimerFire()
    StopTrailer()
end sub

sub onTrailerStateChange()
    state = m.heroTrailer.state
    if state = "finished" or state = "error"
        m.trailerStopTimer.control = "stop"
        StopTrailer()
    end if
end sub

sub StopTrailer()
    m.trailerTimer.control     = "stop"
    m.trailerStopTimer.control = "stop"
    m.heroTrailer.control      = "stop"
    m.heroTrailer.visible      = false
    m.heroImage.visible        = true
end sub

' ── SELECTION ────────────────────────────────────────────────────────────
sub onItemSelected()
    selectedIndex = m.rowList.rowItemSelected
    row  = m.rowList.content.getChild(selectedIndex[0])
    item = row.getChild(selectedIndex[1])
    StopTrailer()
    m.top.command = { action: "details", content: item }
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "up"
            ' Move focus from rows to hero buttons
            return false
        else if key = "OK"
            if m.focusedBtn = "play" and m.currentItem <> invalid
                StopTrailer()
                m.top.command = { action: "play", content: m.currentItem }
                return true
            else if m.focusedBtn = "info" and m.currentItem <> invalid
                m.top.command = { action: "details", content: m.currentItem }
                return true
            end if
        end if
    end if
    return false
end function
