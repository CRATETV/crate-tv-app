' ErrorScene.brs
' Basic stub implementation so the app compiles and can show an error message

function init()
    ' Match these IDs to what you have in ErrorScene.xml
    m.messageLabel = m.top.findNode("messageLabel")
    m.retryButton  = m.top.findNode("retryButton")

    ' Optional: expose a field so someone can set the error message
    m.top.observeField("errorMessage", "onErrorMessageChanged")
end function


' Called when m.top.errorMessage changes (if that field exists in XML)
sub onErrorMessageChanged()
    if m.messageLabel <> invalid and m.top.errorMessage <> invalid then
        m.messageLabel.text = m.top.errorMessage
    end if
end sub


' Simple key handler – let OK or back be handled by the parent
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "OK" then
        ' You could set a field to signal "retry" here if needed:
        ' m.top.retry = true
        return true
    else if key = "back" then
        ' Let parent scene/router decide what to do
        return false
    end if

    return false
end function
