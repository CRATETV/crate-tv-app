' ##############################################################################
' CRATE TV - Public Square logic (layout notes are in SquareScene.xml)
' ##############################################################################
'
' HOW IT WORKS
'   1. MainScene gives this page the whole catalogue (feedData).
'   2. OnFeedSet keeps only the free rows (IsSquareRow) and COPIES them.
'      Copying matters: a Roku node can only live in one place, so moving the
'      originals here would make them vanish from Home.
'   3. OK on a poster sets playContent; MainScene opens the film page.
'
' TO SHOW ANOTHER ROW HERE: add its name to IsSquareRow below.
' ##############################################################################

Sub Init()
    m.TILE_W = 214      ' same poster size as Home (MoviePosterItem)
    m.TILE_H = 321
    m.TILE_GAP = 18

    m.rowList    = m.top.FindNode("squareRowList")
    m.emptyLabel = m.top.FindNode("emptyLabel")
    m.currentRow = 0

    m.rowList.itemComponentName = "MoviePosterItem"
    m.rowList.ObserveField("rowItemSelected", "OnRowItemSelected")
    m.rowList.ObserveField("rowItemFocused",  "OnRowItemFocused")

    ' Put focus back on the posters when returning from a film page
    m.top.ObserveField("focusedChild", "OnFocusChange")
End Sub

Sub OnFeedSet()
    feedData = m.top.feedData
    If feedData = Invalid
        ShowEmpty()
        Return
    End If

    content = CreateObject("roSGNode", "ContentNode")
    For i = 0 To feedData.GetChildCount() - 1
        row = feedData.GetChild(i)
        If row <> Invalid And IsSquareRow(row) And row.GetChildCount() > 0
            copyRow = CreateObject("roSGNode", "ContentNode")
            copyRow.title = row.title
            For j = 0 To row.GetChildCount() - 1
                film = row.GetChild(j)
                If film <> Invalid
                    ' Clone(false) copies every field (trailer, price, unlocked,
                    ' artwork...) so the film page has everything it needs.
                    copy = film.Clone(false)
                    If copy.HasField("rankNumber") Then copy.rankNumber = 0   ' no Top 10 numbers here
                    copyRow.AppendChild(copy)
                End If
            End For
            content.AppendChild(copyRow)
        End If
    End For

    If content.GetChildCount() = 0
        ShowEmpty()
        Return
    End If

    sizes = []
    gaps = []
    For i = 0 To content.GetChildCount() - 1
        sizes.Push([m.TILE_W, m.TILE_H])
        gaps.Push([m.TILE_GAP, 0])
    End For
    m.rowList.rowItemSize = sizes
    m.rowList.rowItemSpacing = gaps
    m.rowList.content = content
    m.rowList.visible = true
    m.emptyLabel.visible = false
    m.rowList.SetFocus(true)
End Sub

' Which catalogue rows belong in the Public Square.
Function IsSquareRow(row as Object) as Boolean
    catType = ""
    If row.HasField("categoryType") And row.categoryType <> Invalid Then catType = LCase(row.categoryType)
    title = ""
    If row.HasField("title") And row.title <> Invalid Then title = LCase(row.title)

    For Each t in ["publicdomainindie", "public_domain_indie", "publicaccess", "publicdomain", "vintagevisions", "vintage_visions"]
        If catType = t Then Return true
    End For
    For Each word in ["public domain", "vintage", "square", "community records", "retro"]
        If Instr(1, title, word) > 0 Then Return true
    End For
    Return false
End Function

Sub ShowEmpty()
    m.rowList.visible = false
    m.emptyLabel.visible = true
End Sub

Sub OnRowItemFocused()
    focused = m.rowList.rowItemFocused
    If focused <> Invalid And focused.Count() >= 2 Then m.currentRow = focused[0]
End Sub

Sub OnRowItemSelected()
    selected = m.rowList.rowItemSelected
    content = m.rowList.content
    If selected = Invalid Or selected.Count() < 2 Or content = Invalid Then Return
    row = content.GetChild(selected[0])
    If row = Invalid Then Return
    film = row.GetChild(selected[1])
    If film <> Invalid Then m.top.playContent = film
End Sub

Sub OnFocusChange()
    If m.top.IsInFocusChain() And m.rowList.visible And Not m.rowList.HasFocus()
        m.rowList.SetFocus(true)
    End If
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    If key = "back" Or (key = "up" And m.currentRow = 0)
        m.top.exitRequested = true      ' MainScene moves focus to the top menu
        Return true
    End If
    Return false
End Function
