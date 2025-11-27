' AccountLinkScene.brs
' Basic stub implementation so the app compiles

function init()
    ' Find nodes defined in AccountLinkScene.xml (adjust ids to match your XML)
    m.codeLabel         = m.top.findNode("codeLabel")
    m.instructionsLabel = m.top.findNode("instructionsLabel")
    m.statusLabel       = m.top.findNode("statusLabel")
end function


' Optional: expose a function to show the link code
sub showLinkCode(code as String)
    if m.codeLabel <> invalid then
        m.codeLabel.text = code
    end if
end sub


' Optional: expose a function to update status text
sub updateStatus(message as String)
    if m.statusLabel <> invalid then
        m.statusLabel.text = message
    end if
end sub


' Handle remote key presses if needed
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back" then
        ' Allow parent Scene/Router to decide what to do
        return false
    end if

    return false
end function
