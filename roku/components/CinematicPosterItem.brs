sub init()
    m.poster = m.top.findNode("poster")
    m.focusAnim = m.top.findNode("focusAnim")
    m.poster.scaleRotateCenter = [160, 90] 
end sub

sub onContentChange()
    item = m.top.itemContent
    if item <> invalid
        m.poster.uri = item.hdposterurl
    end if
end sub

sub focusPercentChanged(event)
    if event.getData() > 0.9 
        m.focusAnim.control = "start"
    else 
        m.focusAnim.control = "stop"
        m.poster.scale = [1.0, 1.0]
    end if
end sub
