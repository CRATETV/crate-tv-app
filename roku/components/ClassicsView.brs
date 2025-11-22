sub init()
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
end sub