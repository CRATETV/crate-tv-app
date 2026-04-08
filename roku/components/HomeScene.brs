sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroImage = m.top.findNode("heroImage")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroSynopsis = m.top.findNode("heroSynopsis")
    m.heroTrailer = m.top.findNode("heroTrailer")
    m.trailerTimer = m.top.findNode("trailerTimer")
    m.trailerStopTimer = m.top.findNode("trailerStopTimer")
    m.currentItem = invalid

    m.rowList.observeField("rowItemFocused", "onItemFocused")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
    m.trailerTimer.observeField("fire", "onTrailerTimerFire")
    m.trailerStopTimer.observeField("fire", "onTrailerStopTimerFire")
    m.heroTrailer.observeField("state", "onTrailerStateChange")
end sub

sub onContentChange()
    if m.top.content <> invalid
        m.rowList.content = m.top.content
        ' Set initial hero content
        if m.top.content.getChildCount() > 0 and m.top.content.getChild(0).getChildCount() > 0
            UpdateHero(m.top.content.getChild(0).getChild(0))
        end if
    end if
end sub

sub onItemFocused()
    focusedIndex = m.rowList.rowItemFocused
    row = m.rowList.content.getChild(focusedIndex[0])
    item = row.getChild(focusedIndex[1])
    m.currentItem = item

    ' Stop any playing trailer and reset hero to poster
    m.trailerTimer.control = "stop"
    m.trailerStopTimer.control = "stop"
    m.heroTrailer.control = "stop"
    m.heroTrailer.visible = false
    m.heroImage.visible = true

    UpdateHero(item)

    ' Start 1s dwell timer before playing trailer
    if item.trailerUrl <> invalid and item.trailerUrl <> ""
        m.trailerTimer.control = "start"
    end if
end sub

sub onTrailerTimerFire()
    if m.currentItem = invalid then return
    trailerUrl = m.currentItem.trailerUrl
    if trailerUrl = invalid or trailerUrl = "" then return

    content = CreateObject("roSGNode", "ContentNode")
    content.url = trailerUrl
    content.streamFormat = "mp4"

    ' Jump to trailerStart if set, otherwise start at 0
    trailerStart = m.currentItem.trailerStart
    if trailerStart <> invalid and trailerStart > 0
        content.bookmarkPosition = trailerStart
    end if

    m.heroTrailer.content = content
    m.heroTrailer.visible = true
    m.heroTrailer.control = "play"
    m.heroImage.visible = false

    ' Start 30 second stop timer
    m.trailerStopTimer.control = "start"
end sub

sub onTrailerStopTimerFire()
    ' Hard stop at 30 seconds — fade back to poster
    m.heroTrailer.control = "stop"
    m.heroTrailer.visible = false
    m.heroImage.visible = true
end sub

sub onTrailerStateChange()
    state = m.heroTrailer.state
    if state = "finished" or state = "error"
        m.trailerStopTimer.control = "stop"
        m.heroTrailer.visible = false
        m.heroTrailer.control = "stop"
        m.heroImage.visible = true
    end if
end sub

sub UpdateHero(item)
    if item <> invalid
        m.heroImage.uri = item.hdPosterUrl
        m.heroTitle.text = item.title
        m.heroSynopsis.text = item.description
    end if
end sub

sub onItemSelected()
    selectedIndex = m.rowList.rowItemSelected
    row = m.rowList.content.getChild(selectedIndex[0])
    item = row.getChild(selectedIndex[1])

    ' Stop trailer before navigating
    m.trailerTimer.control = "stop"
    m.trailerStopTimer.control = "stop"
    m.heroTrailer.control = "stop"
    m.heroTrailer.visible = false

    m.top.command = { action: "play", content: item }
end sub
