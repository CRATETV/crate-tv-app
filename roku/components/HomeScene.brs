sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroBg = m.top.findNode("heroBg")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroDesc = m.top.findNode("heroDesc")
    
    m.rowList.observeField("rowItemFocused", "onItemFocused")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
    
    loadContent()
end sub

sub loadContent()
    ' Fetch content (reusing APITask logic from before, but now authenticated)
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
        ' Initialize hero with first item
        updateHero(content.getChild(0).getChild(0))
    end if
end sub

sub onItemFocused()
    ' Get current focused item
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
        m.heroBg.uri = item.hdPosterUrl ' Use a high-res hero image if available
        m.heroTitle.text = item.title
        m.heroDesc.text = item.description
    end if
end sub

sub onItemSelected()
    ' Handle playback logic here (launch Video node)
end sub
