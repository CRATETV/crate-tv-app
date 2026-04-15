' ##############################################################################
' CRATE TV - The Public Square Scene
' Filters feed for publicAccess / publicDomainIndie categories
' ##############################################################################

Sub Init()
    m.squareRowList = m.top.FindNode("squareRowList")
    m.emptyLabel    = m.top.FindNode("emptyLabel")
    m.currentRow    = 0

    m.squareRowList.itemComponentName = "StandardPoster"
    m.squareRowList.ObserveField("rowItemSelected", "OnRowItemSelected")
    m.squareRowList.ObserveField("rowItemFocused",  "OnRowItemFocused")

    ' Re-focus RowList when scene regains focus (after video player closes)
    m.top.ObserveField("focusedChild", "OnSquareFocusChange")
End Sub

Sub OnRowItemFocused()
    focused = m.squareRowList.rowItemFocused
    If focused = Invalid Or focused.Count() < 2 Then Return
    m.currentRow = focused[0]
End Sub

Sub OnSquareFocusChange()
    If m.top.IsInFocusChain() And m.squareRowList <> Invalid And m.squareRowList.content <> Invalid
        m.squareRowList.SetFocus(true)
        Print "CrateTV [Square]: Focus restored to RowList"
    End If
End Sub

Sub OnFeedSet()
    feedData = m.top.feedData
    If feedData = Invalid Then 
        Print "CrateTV [Square]: ❌ ERROR - feedData is Invalid"
        m.squareRowList.visible = false
        m.emptyLabel.visible = true
        Return
    End If
    
    Print "CrateTV [Square]: ========================================="
    Print "CrateTV [Square]: Feed has " + Str(feedData.GetChildCount()) + " total rows"
    Print "CrateTV [Square]: ========================================="
    
    ' DEBUG: Show ALL rows and their properties
    For debugi = 0 To feedData.GetChildCount() - 1
        debugRow = feedData.GetChild(debugi)
        If debugRow <> Invalid
            debugTitle = "Unknown"
            If debugRow.HasField("title") Then debugTitle = debugRow.title
            debugCat = "NONE"
            If debugRow.HasField("categoryType") Then debugCat = debugRow.categoryType
            debugRowType = "NONE"
            If debugRow.HasField("rowType") Then debugRowType = debugRow.rowType
            debugCount = debugRow.GetChildCount()
            Print "CrateTV [Square]: Row " + Str(debugi) + ": '" + debugTitle + "'"
            Print "CrateTV [Square]:   categoryType='" + debugCat + "'"
            Print "CrateTV [Square]:   rowType='" + debugRowType + "'"
            Print "CrateTV [Square]:   children=" + Str(debugCount) + " movies"
        End If
    End For
    Print "CrateTV [Square]: ========================================="
    
    ' =========================================================================
    ' FILTER STRATEGY - Multiple approaches to catch public domain content
    ' =========================================================================
    ' PRIMARY ROWS:
    ' 1. "The Square" - Square movies (moved from Home page)
    ' 2. "Public Domain Classics" - Public domain content
    ' 
    ' ALSO INCLUDES:
    ' 3. Vintage Visions, Community Records, Retro content
    ' 4. Any row with categoryType matching public domain
    ' =========================================================================
    filteredContent = CreateObject("roSGNode", "ContentNode")
    
    totalRowCount = feedData.GetChildCount()
    Print "CrateTV [Square]: Starting loop - total rows to process: " + Str(totalRowCount)
    
    ' Iterate forward. IMPORTANT: do NOT use AppendChild(row) -- that MOVES
    ' the node out of feedData, mutating the shared cachedFeedData in MainScene
    ' and breaking Home/other scenes. Instead collect matching indices and clone.
    matchedIndices = []
    For i = 0 To totalRowCount - 1
        row = feedData.GetChild(i)
        If row = Invalid Then Continue For

        catType = ""
        If row.HasField("categoryType") Then catType = LCase(row.categoryType)
        rowTitle = ""
        If row.HasField("title") Then rowTitle = row.title
        rowTitleLower = LCase(rowTitle)

        isPublicDomain = false
        If catType = "publicdomainindie"   Then isPublicDomain = true
        If catType = "publicaccess"        Then isPublicDomain = true
        If catType = "publicdomain"        Then isPublicDomain = true
        If catType = "public_domain_indie" Then isPublicDomain = true
        If catType = "vintagevisions"      Then isPublicDomain = true
        If catType = "vintage_visions"     Then isPublicDomain = true
        If Instr(1, rowTitleLower, "public domain")    > 0 Then isPublicDomain = true
        If Instr(1, rowTitleLower, "vintage")          > 0 Then isPublicDomain = true
        If Instr(1, rowTitleLower, "square")           > 0 Then isPublicDomain = true
        If rowTitle = "Public Domain Classics"             Then isPublicDomain = true
        If Instr(1, rowTitleLower, "community records") > 0 Then isPublicDomain = true
        If Instr(1, rowTitleLower, "retro")            > 0 Then isPublicDomain = true

        If isPublicDomain
            matchedIndices.Push(i)
            Print "CrateTV [Square]: INCLUDING '" + rowTitle + "' (catType='" + catType + "')"
        End If
    End For

    ' Build filteredContent by cloning matched rows so feedData is NOT mutated
    For each idx in matchedIndices
        sourceRow = feedData.GetChild(idx)
        If sourceRow = Invalid Then Continue For
        clonedRow = CreateObject("roSGNode", "ContentNode")
        ' Copy row-level fields
        If sourceRow.HasField("title")        Then clonedRow.title        = sourceRow.title
        If sourceRow.HasField("categoryType") Then clonedRow.categoryType = sourceRow.categoryType
        If sourceRow.HasField("rowType")      Then clonedRow.rowType      = sourceRow.rowType
        ' Clone child movie nodes - DO NOT use AppendChild as it MOVES the node!
        For ci = 0 To sourceRow.GetChildCount() - 1
            movie = sourceRow.GetChild(ci)
            If movie <> Invalid
                ' Create a new ContentNode and copy all fields
                clonedMovie = CreateObject("roSGNode", "ContentNode")
                If movie.HasField("title") Then clonedMovie.title = movie.title
                If movie.HasField("description") Then clonedMovie.description = movie.description
                If movie.HasField("HDPosterUrl") Then clonedMovie.HDPosterUrl = movie.HDPosterUrl
                If movie.HasField("hdPosterUrl") Then clonedMovie.hdPosterUrl = movie.hdPosterUrl
                If movie.HasField("SDPosterUrl") Then clonedMovie.SDPosterUrl = movie.SDPosterUrl
                If movie.HasField("sdPosterUrl") Then clonedMovie.sdPosterUrl = movie.sdPosterUrl
                If movie.HasField("url") Then clonedMovie.url = movie.url
                If movie.HasField("streamUrl") Then clonedMovie.streamUrl = movie.streamUrl
                If movie.HasField("id") Then clonedMovie.id = movie.id
                If movie.HasField("contentId") Then clonedMovie.contentId = movie.contentId
                If movie.HasField("director") Then clonedMovie.director = movie.director
                If movie.HasField("cast") Then clonedMovie.cast = movie.cast
                If movie.HasField("releaseDate") Then clonedMovie.releaseDate = movie.releaseDate
                If movie.HasField("runtime") Then clonedMovie.runtime = movie.runtime
                If movie.HasField("genre") Then clonedMovie.genre = movie.genre
                If movie.HasField("rating") Then clonedMovie.rating = movie.rating
                If movie.HasField("shortDescription") Then clonedMovie.shortDescription = movie.shortDescription
                If movie.HasField("actors") Then clonedMovie.actors = movie.actors
                If movie.HasField("categories") Then clonedMovie.categories = movie.categories
                If movie.HasField("streamFormat") Then clonedMovie.streamFormat = movie.streamFormat
                If movie.HasField("length") Then clonedMovie.length = movie.length
                If movie.HasField("bookmarkPosition") Then clonedMovie.bookmarkPosition = movie.bookmarkPosition
                If movie.HasField("playStart") Then clonedMovie.playStart = movie.playStart
                clonedRow.AppendChild(clonedMovie)
            End If
        End For
        filteredContent.AppendChild(clonedRow)
    End For
    
    Print "CrateTV [Square]: ========================================="
    Print "CrateTV [Square]: Filtered to " + Str(filteredContent.GetChildCount()) + " rows for Public Square"
    Print "CrateTV [Square]: (Includes 'The Square' and 'Public Domain Classics' as separate rows)"
    Print "CrateTV [Square]: ========================================="
    
    If filteredContent.GetChildCount() > 0
        m.squareRowList.content = filteredContent
        m.squareRowList.visible = true
        m.squareRowList.SetFocus(true)
        m.emptyLabel.visible = false
        Print "CrateTV [Square]: ✅ SUCCESS - Displaying " + Str(filteredContent.GetChildCount()) + " rows"
    Else
        Print "CrateTV [Square]: ❌ WARNING - No public domain or vintage visions content found"
        Print "CrateTV [Square]: ❌ Check if your API is setting categoryType='publicDomainIndie' or 'vintageVisions'"
        m.squareRowList.visible = false
        m.emptyLabel.visible = true
    End If
End Sub

Sub OnRowItemSelected()
    selected = m.squareRowList.rowItemSelected
    If selected = Invalid Or selected.Count() < 2 Then Return
    
    content = m.squareRowList.content
    If content = Invalid Then Return
    
    rowIndex = selected[0]
    itemIndex = selected[1]
    
    If rowIndex < content.GetChildCount()
        row = content.GetChild(rowIndex)
        If row <> Invalid And itemIndex < row.GetChildCount()
            movie = row.GetChild(itemIndex)
            If movie <> Invalid Then m.top.playContent = movie
        End If
    End If
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    If key = "back"
        m.top.exitRequested = true
        Return true
    End If
    ' UP from first poster row -> move focus to top nav bar
    If key = "up"
        If m.currentRow = 0
            m.top.exitRequested = true
            Return true
        End If
        Return false
    End If
    Return false
End Function
