sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroBg = m.top.findNode("heroBg")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroDesc = m.top.findNode("heroDesc")
    m.heroMeta = m.top.findNode("heroMeta")
    m.likeLabel = m.top.findNode("likeLabel")
    m.heroTimer = m.top.findNode("heroTimer")

    m.rowList.observeField("rowItemFocused", "onFocus")
    m.rowList.observeField("rowItemSelected", "onSelect")
    m.heroTimer.observeField("fire", "rotateHero")

    m.heroItems = []
    m.heroIndex = 0
    m.isRowFocused = false

    loadContent()
end sub

sub loadContent()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "feed"
    task.observeField("content", "onContent")
    task.control = "RUN"
end sub

sub onContent(evt)
    data = evt.getData()
    if data <> invalid
        m.rowList.content = data.rows
        m.heroItems = data.heroItems
        m.rowList.setFocus(true)
        
        ' Start Auto Rotate
        if m.heroItems.Count() > 0
            updateHero(m.heroItems[0])
            m.heroTimer.control = "start"
        end if
    end if
end sub

sub rotateHero()
    if m.isRowFocused return ' Don't rotate if user is browsing rows
    if m.heroItems.Count() == 0 return
    
    m.heroIndex = m.heroIndex + 1
    if m.heroIndex >= m.heroItems.Count() then m.heroIndex = 0
    updateHero(m.heroItems[m.heroIndex])
end sub

sub onFocus()
    ' User is moving in grid, stop auto-rotate and show focused item
    m.isRowFocused = true 
    m.heroTimer.control = "stop"
    
    row = m.rowList.rowItemFocused[0]
    col = m.rowList.rowItemFocused[1]
    content = m.rowList.content
    if content <> invalid
        item = content.getChild(row).getChild(col)
        updateHero(item)
    end if
end sub

sub updateHero(item)
    if item = invalid return
    m.currentHeroItem = item
    m.heroBg.uri = item.hdPosterUrl
    m.heroTitle.text = item.title
    m.heroDesc.text = item.description
    m.heroMeta.text = item.rating + " | " + item.duration
    
    if item.isLiked = true
        m.likeLabel.text = "♥ Liked"
        m.likeLabel.color = "#E50914"
    else
        m.likeLabel.text = "♡ Like"
        m.likeLabel.color = "#FFFFFF"
    end if
end sub

sub onSelect()
    ' Handle Play vs Like button logic would go here (requires custom button focus logic)
    ' For simplicity, clicking a poster plays it. 
    ' To handle buttons, we'd need to manage focus between RowList and Buttons manually.
    ' Playing directly for now:
    playVideo(m.currentHeroItem)
end sub

sub playVideo(item)
    player = CreateObject("roSGNode", "PlayerOverlay")
    player.content = item
    m.top.getScene().appendChild(player)
    player.setFocus(true)
end sub