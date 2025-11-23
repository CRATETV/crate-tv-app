sub init()
    ' Grab references to UI nodes
    m.heroPoster = m.top.findNode("heroPoster")
    m.heroTitle  = m.top.findNode("heroTitle")
    m.heroDesc   = m.top.findNode("heroDesc")
    m.rowList    = m.top.findNode("rowList")
end sub

sub onContentSet()
    content = m.top.content
    if content = invalid then
        print "DEBUG HomeView: content is invalid"
        return
    end if

    print "DEBUG HomeView content children:"; content.GetChildCount()

    ' Expect:
    ' child 0 = hero node
    ' child 1 = first row node
    heroNode = content.GetChild(0)
    firstRow = content.GetChild(1)

    if heroNode <> invalid then
        print "DEBUG hero title:"; heroNode.title
    else
        print "DEBUG heroNode is invalid"
    end if

    if firstRow <> invalid then
        print "DEBUG firstRow title:"; firstRow.title
        print "DEBUG firstRow child count:"; firstRow.GetChildCount()
    else
        print "DEBUG firstRow is invalid"
    end if

    ' ---------- HERO ----------
    if heroNode <> invalid and m.heroPoster <> invalid then
        if heroNode.posterUrl <> invalid then
            m.heroPoster.uri = heroNode.posterUrl
        else
            print "DEBUG heroNode.posterUrl is invalid"
        end if

        if m.heroTitle <> invalid then
            m.heroTitle.text = heroNode.title
        end if

        if m.heroDesc <> invalid then
            m.heroDesc.text  = heroNode.description
        end if
    else
        print "DEBUG: heroNode or heroPoster is invalid"
    end if

    ' ---------- ROW: Top 10 on Crate TV Today ----------
    if firstRow <> invalid and m.rowList <> invalid then
        rowContent = CreateObject("roSGNode", "ContentNode")

        ' Row node (RowList expects rows as children, items as grandchildren)
        rowNode = rowContent.CreateChild("ContentNode")
        rowNode.title = firstRow.title

        childCount = firstRow.GetChildCount()
        for i = 0 to childCount - 1
            item = firstRow.GetChild(i)
            if item <> invalid then
                print "DEBUG HomeView adding item:"; item.title

                itemNode = rowNode.CreateChild("ContentNode")
                itemNode.title                 = item.title
                itemNode.HDPosterUrl           = item.posterUrl  ' <-- IMPORTANT: HDPosterUrl
                itemNode.shortDescriptionLine1 = item.description
            end if
        end for

        m.rowList.content = rowContent
    else
        print "DEBUG: firstRow or rowList is invalid"
    end if
end sub
