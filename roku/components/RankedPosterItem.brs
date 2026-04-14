sub init()
    m.poster = m.top.findNode("poster")
    m.rankLabel = m.top.findNode("rankLabel")
    m.titleLabel = m.top.findNode("titleLabel")
    m.focusRing = m.top.findNode("focusRing")
end sub

sub onContentChange()
    content = m.top.itemContent
    if content = invalid then return
    m.poster.uri = content.hdPosterUrl
    if m.rankLabel <> invalid
        idx = m.top.index
        if idx <> invalid
            m.rankLabel.text = (idx + 1).toStr()
        end if
    end if
end sub

sub onFocusChange()
    fp = m.top.focusPercent
    if m.focusRing <> invalid
        m.focusRing.visible = (fp > 0.5)
    end if
end sub
