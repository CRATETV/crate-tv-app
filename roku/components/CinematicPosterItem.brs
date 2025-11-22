sub init()
    m.poster = m.top.findNode("poster")
    m.fallbackTitle = m.top.findNode("fallbackTitle")
    m.focusAnim = m.top.findNode("focusAnim")
    m.poster.scaleRotateCenter = [160, 90] 
end sub

sub onContentChange()
    item = m.top.itemContent
    if item <> invalid
        m.fallbackTitle.text = item.title
        if item.hdposterurl <> invalid and item.hdposterurl <> ""
            m.poster.uri = item.hdposterurl
        end if
    end if
end sub

sub focusPercentChanged(event)
    percent = event.getData()
    if percent > 0.9 
        m.focusAnim.control = "start"
    else 
        m.focusAnim.control = "stop"
        m.poster.scale = [1.0, 1.0]
    end if
end sub
