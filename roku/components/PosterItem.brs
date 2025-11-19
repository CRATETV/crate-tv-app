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
        m.poster.uri = item.hdPosterUrl
        
        ' Handle Top 10 Styling
        if item.rank > 0
            m.rankGroup.visible = true
            m.rankOutline.text = item.rank.ToStr()
            m.rankFill.text = item.rank.ToStr()
            ' Move poster to make room for number
            m.poster.translation = [110, 0] 
            m.focusRing.translation = [105, -5]
        else
            m.rankGroup.visible = false
            m.poster.translation = [0, 0]
            m.focusRing.translation = [-5, -5]
        end if
    end if
end sub

sub onFocusPercentChanged()
    scale = 1 + (m.top.rowFocusPercent * 0.08)
    m.focusRing.opacity = m.top.rowFocusPercent
    m.poster.scale = [scale, scale]
    if m.rankGroup.visible then m.rankGroup.scale = [scale, scale]
end sub