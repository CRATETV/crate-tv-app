sub init()
    m.posterContainer = m.top.findNode("posterContainer")
    m.posterImage = m.top.findNode("posterImage")
    m.focusBorder = m.top.findNode("focusBorder")
    m.lockOverlay = m.top.findNode("lockOverlay")
    m.progressGroup = m.top.findNode("progressGroup")
    m.progressFill = m.top.findNode("progressFill")
    m.rankBadge = m.top.findNode("rankBadge")
    m.rankBadgeLabel = m.top.findNode("rankBadgeLabel")
    m.shimmerBar = m.top.findNode("shimmerBar")
    
    ' Set initial scale
    m.posterContainer.scale = [1.0, 1.0]
    m.posterContainer.scaleRotateCenter = [135, 202] ' Center of 270x405
    
    m.top.observeField("width", "OnSizeChange")
    m.top.observeField("height", "OnSizeChange")
end sub

sub OnSizeChange()
    w = m.top.width
    h = m.top.height
    
    ' Update container center for scaling
    m.posterContainer.scaleRotateCenter = [w / 2, h / 2]
    
    ' Update all child nodes that depend on width/height
    m.top.findNode("shadow").width = w + 4
    m.top.findNode("shadow").height = h + 4
    
    m.top.findNode("posterBg").width = w
    m.top.findNode("posterBg").height = h
    
    m.top.findNode("shimmerBase").width = w
    m.top.findNode("shimmerBase").height = h
    
    m.top.findNode("shimmerBar").width = w
    m.top.findNode("shimmerBar").height = h
    
    m.posterImage.width = w
    m.posterImage.height = h
    m.posterImage.loadWidth = w
    m.posterImage.loadHeight = h
    
    m.top.findNode("lockOverlayRect").width = w
    m.top.findNode("lockOverlayRect").height = h
    
    m.top.findNode("lockBadge").translation = [w - 60, 10]
    m.top.findNode("premiumLabel").translation = [0, h - 50]
    m.top.findNode("premiumLabel").getChild(0).width = w
    m.top.findNode("premiumLabel").getChild(1).width = w
    
    m.progressGroup.translation = [0, h - 8]
    m.top.findNode("progressBg").width = w
    ' progressFill width is updated in OnContentChange
    
    m.top.findNode("cornerMask").width = w
    m.top.findNode("cornerMask").height = h
    
    m.rankBadge.getChild(0).translation = [0, h - 56]
    m.rankBadge.getChild(1).translation = [0, h - 56]
    
    m.focusBorder.width = w + 8
    m.focusBorder.height = h + 8
end sub

sub OnContentChange()
    item = m.top.itemContent
    if item <> invalid
        m.posterImage.uri = item.hdPosterUrl
        
        ' Handle lock overlay for paid content
        if item.isUnlocked = false and item.isFree = false
            m.lockOverlay.visible = true
        else
            m.lockOverlay.visible = false
        end if
        
        ' Handle watch progress (mock logic for now)
        if item.playStart <> invalid and item.playStart > 0 and item.length <> invalid and item.length > 0
            m.progressGroup.visible = true
            percent = (item.playStart / item.length)
            if percent > 1.0 then percent = 1.0
            m.progressFill.width = m.top.width * percent
        else
            m.progressGroup.visible = false
        end if
        
        ' Handle rank badge (Top Ten)
        if item.rank <> invalid and item.rank > 0
            m.rankBadge.visible = true
            m.rankBadgeLabel.text = item.rank.toStr()
        else
            m.rankBadge.visible = false
        end if
    end if
end sub

sub OnFocusChange()
    ' focusPercent is 0.0 to 1.0
    percent = m.top.focusPercent
    
    ' Scale from 1.0 to 1.1
    scale = 1.0 + (percent * 0.1)
    m.posterContainer.scale = [scale, scale]
    
    ' Show/hide focus border
    if percent > 0.5
        m.focusBorder.visible = true
        m.focusBorder.opacity = percent
    else
        m.focusBorder.visible = false
    end if
end sub
