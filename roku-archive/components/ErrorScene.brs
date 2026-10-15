sub init()
    m.top.setFocus(true)
    m.msgLabel = m.top.findNode("msgLabel")
end sub

sub onMessageChange()
    if m.msgLabel <> invalid
        m.msgLabel.text = m.top.message
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and key = "back"
        m.top.command = { action: "close" }
        return true
    end if
    return false
end function
