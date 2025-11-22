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
end function