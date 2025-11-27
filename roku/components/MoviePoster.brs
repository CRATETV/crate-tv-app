' MoviePoster.brs
' Script for the MoviePoster component

function init()
    ' Grab child nodes defined in MoviePoster.xml
    m.poster = m.top.findNode("poster")      ' should match Poster node id in XML
    m.title  = m.top.findNode("titleLabel")  ' optional: label for the title

    ' Watch for content changes from parent row/scene
    m.top.observeField("content", "onContentChanged")
end function


' Called whenever m.top.content changes
sub onContentChanged()
    content = m.top.content
    if content = invalid then return

    ' --- Poster image binding ---
    if m.poster <> invalid then
        posterUrl = invalid

        ' Try common field names
        if content.hdposterurl <> invalid then
            posterUrl = content.hdposterurl
        else if content.posterurl <> invalid then
            posterUrl = content.posterurl
        else if content.url <> invalid then
            posterUrl = content.url
        end if

        if posterUrl <> invalid then
            m.poster.uri = posterUrl
        end if
    end if

    ' --- Title label binding ---
    if m.title <> invalid then
        movieTitle = invalid

        if content.title <> invalid then
            movieTitle = content.title
        else if content.name <> invalid then
            movieTitle = content.name
        end if

        if movieTitle <> invalid then
            m.title.text = movieTitle
        end if
    end if
end sub


' Optional: simple focus animation (make sure your XML marks this component focusable)
sub onFocusChanged()
    if m.top.hasFocus()
        ' Slight zoom-in when focused
        m.top.scale = [1.1, 1.1]
    else
        ' Reset scale when not focused
        m.top.scale = [1.0, 1.0]
    end if
end sub


' Optional: handle remote key events if you want click behavior here
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    ' Example: on OK, bubble up an event or set a field
    if key = "OK" then
        ' Parent row/scene can observe this if you expose a field in MoviePoster.xml
        ' e.g., m.top.selected = true
        return true
    end if

    return false
end function
