' ActionItem.brs
' Basic stub implementation so the app compiles

function init()
    ' Match these ids to what you have in ActionItem.xml (or leave as-is; it's safe)
    m.iconNode  = m.top.findNode("icon")
    m.labelNode = m.top.findNode("label")

    ' Watch for content changes (if ActionItem has a "content" field)
    m.top.observeField("content", "onContentChanged")
end function


' Called when m.top.content changes, if that field exists
sub onContentChanged()
    content = m.top.content
    if content = invalid then return

    ' Try to update label from common fields
    if m.labelNode <> invalid then
        labelText = invalid

        if content.title <> invalid then
            labelText = content.title
        else if content.name <> invalid then
            labelText = content.name
        else if content.label <> invalid then
            labelText = content.label
        end if

        if labelText <> invalid then
            m.labelNode.text = labelText
        end if
    end if
end sub


' Handle focus for simple visual feedback (optional)
sub onFocusChanged()
    if m.top.hasFocus()
        m.top.scale = [1.05, 1.05]
    else
        m.top.scale = [1.0, 1.0]
    end if
end sub


' Handle key events for this item (optional)
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "OK" then
        ' Parent scene can observe a field or use m.top.id to know which item fired
        ' Example: m.top.selected = true
        return true
    end if

    return false
end function
