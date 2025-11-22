sub init()
    m.statusLabel = m.top.findNode("statusLabel")
    m.rowList = m.top.findNode("rowList")
    
    m.apiTask = m.top.findNode("apiTask")
    m.apiTask.observeField("content", "onContentReady")
    m.apiTask.control = "RUN"
end sub

sub onContentReady(event)
    content = event.getData()
    
    ' Count the rows to show the user
    rowCount = content.mainContent.getChildCount()
    
    if rowCount > 0
        m.statusLabel.text = "SUCCESS: Loaded " + rowCount.toStr() + " categories from CrateTV.net"
        m.statusLabel.color = "#00FF00" ' Green
    else
        m.statusLabel.text = "WARNING: Connected, but found 0 Categories. Check API."
        m.statusLabel.color = "#FF0000" ' Red
    end if
    
    m.rowList.content = content.mainContent
    m.rowList.setFocus(true)
end sub
