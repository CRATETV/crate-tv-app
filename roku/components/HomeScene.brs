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
        ' Update hero with the very first item
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
        if item.duration <> invalid
            if meta <> "" then meta = meta + " | "
            meta = meta + item.duration
        end if
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