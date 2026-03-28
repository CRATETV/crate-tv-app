sub init()
    m.rowList = m.top.findNode("rowList")
    m.heroImage = m.top.findNode("heroImage")
    m.heroTitle = m.top.findNode("heroTitle")
    m.heroSynopsis = m.top.findNode("heroSynopsis")
    
    m.rowList.observeField("rowItemFocused", "onItemFocused")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
end sub

sub onContentChange()
    if m.top.content <> invalid
        m.rowList.content = m.top.content
        ' Set initial hero content
        if m.top.content.getChildCount() > 0 and m.top.content.getChild(0).getChildCount() > 0
            UpdateHero(m.top.content.getChild(0).getChild(0))
        end if
    end if
end sub

sub onItemFocused()
    focusedIndex = m.rowList.rowItemFocused
    row = m.rowList.content.getChild(focusedIndex[0])
    item = row.getChild(focusedIndex[1])
    UpdateHero(item)
end sub

sub UpdateHero(item)
    if item <> invalid
        m.heroImage.uri = item.hdPosterUrl
        m.heroTitle.text = item.title
        m.heroSynopsis.text = item.description
    end if
end sub

sub onItemSelected()
    selectedIndex = m.rowList.rowItemSelected
    row = m.rowList.content.getChild(selectedIndex[0])
    item = row.getChild(selectedIndex[1])
    
    m.top.command = { action: "details", content: item }
end sub
