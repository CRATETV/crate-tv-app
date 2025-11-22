sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroPoster = m.top.findNode("heroPoster")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroDesc = m.top.findNode("heroDesc")
    
    m.rowList.observeField("rowItemFocused", "onRowItemFocused")
end sub

sub onContentSet()
    if m.top.content <> invalid
        ' Send data to RowList
        m.rowList.content = m.top.content.mainContent
        m.rowList.setFocus(true)
        
        ' Set initial Hero
        hero = m.top.content.heroItems.getChild(0)
        if hero <> invalid
            updateHero(hero)
        end if
    end if
end sub

sub onRowItemFocused(event)
    focusedIndex = event.getData()
    row = m.rowList.content.getChild(focusedIndex[0])
    if row <> invalid
        item = row.getChild(focusedIndex[1])
        if item <> invalid
            updateHero(item)
        end if
    end if
end sub

sub updateHero(item)
    m.heroTitle.text = item.title
    m.heroDesc.text = item.description
    m.heroPoster.uri = item.hdposterurl
end sub
