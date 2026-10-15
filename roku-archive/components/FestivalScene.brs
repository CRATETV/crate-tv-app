sub init()
    m.top.setFocus(true)
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and key = "back"
        m.top.command = { action: "close" }
        return true
    end if
    return false
end function
