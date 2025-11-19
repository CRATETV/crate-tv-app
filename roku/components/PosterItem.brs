sub init()
    m.poster = m.top.findNode("poster")
    m.rankGroup = m.top.findNode("rankGroup")
    m.rankOutline = m.top.findNode("rankOutline")
    m.rankFill = m.top.findNode("rankFill")
    m.focusRing = m.top.findNode("focusRing")
end sub

sub onContentChanged()
    item = m.top.itemContent
    if item <> invalid
        ' 1. Load Poster
        m.poster.uri = item.hdPosterUrl

        ' 2. Handle Top 10 Layout
        if item.rank > 0
            ' Enable Rank Number
            m.rankGroup.visible = true
            m.rankOutline.text = item.rank.ToStr()
            m.rankFill.text = item.rank.ToStr()
            
            ' Shift poster to the right to make room for number
            m.poster.translation = [110, 0] 
            m.focusRing.translation = [105, -5]
        else
            ' Standard Layout
            m.rankGroup.visible = false
            m.poster.translation = [0, 0]
            m.focusRing.translation = [-5, -5]
        end if
    end if
end sub

sub onFocusPercentChanged()
    ' Subtle zoom effect
    percent = m.top.rowFocusPercent
    scale = 1 + (percent * 0.08)
    
    ' Fade in white border when focused
    m.focusRing.opacity = percent
    m.poster.scale = [scale, scale]
    
    ' If Top 10, scale the number too
    if m.rankGroup.visible
        m.rankGroup.scale = [scale, scale]
    end if
end sub