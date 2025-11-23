sub init()
    m.heroPoster  = m.top.findNode("heroPoster")
    m.heroTitle   = m.top.findNode("heroTitle")
    m.heroDesc    = m.top.findNode("heroDesc")
    m.heroPlay    = m.top.findNode("heroPlay")
    m.heroMore    = m.top.findNode("heroMoreInfo")
    m.rowList     = m.top.findNode("rowList")

    m.rowList.observeField("itemFocused", "onItemFocused")
end sub

sub onContentSet()
    content = m.top.content
    if content = invalid then return

    ' Find hero and first row
    heroNode = invalid
    rowNodes = []

    child = content.GetChild(0)
    while child <> invalid
        if child.contentType = "hero"
            heroNode = child
        else if child.contentType = "row"
            rowNodes.push(child)
        end if
        child = child.GetNext()
    end while

    if heroNode <> invalid then
        m.heroPoster.uri = heroNode.posterUrl
        m.heroTitle.text = heroNode.title
        m.heroDesc.text  = heroNode.description
    end if

    if rowNodes.count() > 0 then
        ' For now, just use the first row (e.g. Top 10 on Crate TV Today)
        firstRow = rowNodes[0]
        m.rowList.rowLabel = firstRow.title

        rowContent = CreateObject("roSGNode", "ContentNode")
        item = firstRow.GetChild(0)

        while item <> invalid
            itemNode = rowContent.CreateChild("ContentNode")
            itemNode.title     = item.title
            itemNode.hdPosterUrl = item.posterUrl
            itemNode.description = item.description
            ' You can add rank, badge, etc. later
            item = item.GetNext()
        end while

        m.rowList.content = rowContent
    end if
end sub

sub onItemFocused()
    ' Here you can later trigger trailers when a row item gets focus
    ' For now, we just leave it empty.
end sub
