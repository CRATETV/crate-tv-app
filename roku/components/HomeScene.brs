' ##############################################################################
' CRATE TV - Home screen logic (layout is in HomeScene.xml)
' ##############################################################################
'
' THE FLOW
'   1. Init() -> LoadFeed(): gets the catalogue from https://cratetv.net/api/roku-feed
'      (through ContentTask), or re-uses the copy MainScene cached last time.
'   2. OnFeedLoaded(): turns the feed into rows:
'        - "Top Ten" row first (built from the first 10 films if the feed has none)
'        - the "__hero__" row is NOT shown as a row; it feeds the billboard
'        - "Featured", "Now Streaming", "Square" and "Public Domain Classics"
'          rows are skipped here (they live on their own tabs)
'        - every other non-empty row, in feed order
'   3. Moving around: OnRowItemFocused() -> ShowOnBillboard(film)
'   4. OK on a poster: OnRowItemSelected() sets `selectedContent`;
'      MainScene opens the Title page (TitleScene).
'   5. Deep links from Roku search / voice: ProcessDeepLink() plays the film
'      straight away (Roku certification 5.1 requires direct-to-play for movies).
'
' ROKU CERTIFICATION NOTES (keep these behaviours)
'   - Focus must never get stuck: the RowList always gets focus back
'     (OnHomeFocusChange) and arrow keys are never swallowed (OnKeyEvent).
'   - Deep links must work whether the app was closed or already running.
' ##############################################################################

Sub Init()
    ' --- Sizes (keep in sync with MoviePosterItem and Theme.brs) ---
    m.TILE_W = 214              ' normal poster tile width
    m.TILE_H = 321              ' poster height
    m.TILE_GAP = 18             ' space between posters
    m.TOP_TEN_TILE_W = 400      ' Top 10 tiles are wider: rank number + poster (room for "10")
    m.TOP_TEN_GAP = 6
    m.IDLE_SECONDS_BEFORE_CYCLING = 20   ' billboard starts cycling featured films after this
    m.STOP_PREVIEWS_AFTER_IDLE_SECONDS = 120  ' no trailer previews after 2 min without a button press (lets the screensaver start)

    m.loadingGroup    = m.top.FindNode("loadingGroup")
    m.loadingProgress = m.top.FindNode("loadingProgress")
    m.loadingText     = m.top.FindNode("loadingText")
    m.errorGroup      = m.top.FindNode("errorGroup")
    m.errorMessage    = m.top.FindNode("errorMessage")

    m.billboard     = m.top.FindNode("billboard")
    m.billboardArt  = m.top.FindNode("billboardArt")
    m.fadeLeft      = m.top.FindNode("fadeLeft")
    m.billboardInfo = m.top.FindNode("billboardInfo")
    m.heroEyebrow   = m.top.FindNode("heroEyebrow")
    m.heroTitle     = m.top.FindNode("heroTitle")
    m.heroMeta      = m.top.FindNode("heroMeta")
    m.heroAward     = m.top.FindNode("heroAward")
    m.heroDesc      = m.top.FindNode("heroDesc")
    m.heroCredits   = m.top.FindNode("heroCredits")
    m.rowList       = m.top.FindNode("rowList")

    m.contentLoaded   = false
    m.feedData        = Invalid
    m.rowListContent  = Invalid
    m.heroItems       = Invalid
    m.heroIndex       = 0
    m.currentRow      = 0
    m.pendingArtFilm  = Invalid
    m.idleClock       = CreateObject("roTimespan")   ' time since the viewer last moved
    m.remoteClock     = CreateObject("roTimespan")   ' time since a real button press (only reset by the viewer)

    m.rowList.itemComponentName = "MoviePosterItem"
    m.rowList.ObserveField("rowItemFocused", "OnRowItemFocused")
    m.rowList.ObserveField("rowItemSelected", "OnRowItemSelected")

    ' Artwork fade-in once the image has downloaded
    m.billboardArt.ObserveField("loadStatus", "OnArtLoadStatus")
    m.artFade = m.top.CreateChild("Animation")
    m.artFade.duration = 0.45
    m.artFade.easeFunction = "outQuad"
    artInterp = m.artFade.CreateChild("FloatFieldInterpolator")
    artInterp.fieldToInterp = "billboardArt.opacity"
    artInterp.key = [0.0, 1.0]
    artInterp.keyValue = [0.0, 1.0]

    ' Artwork is swapped after a short pause so scrolling quickly along a row
    ' doesn't start a download for every poster passed over.
    m.artDelayTimer = m.top.FindNode("artDelayTimer")
    m.artDelayTimer.ObserveField("fire", "OnArtDelayFire")

    ' Trailer preview (Netflix-style): starts after the viewer rests on a film
    ' for previewTimer's duration (HomeScene.xml), stops as soon as they move.
    m.trailer = m.top.FindNode("billboardTrailer")
    m.trailer.ObserveField("isPlaying", "OnTrailerPlayingChange")
    m.trailer.ObserveField("finished", "OnTrailerFinished")
    m.previewTimer = m.top.FindNode("previewTimer")
    m.previewTimer.ObserveField("fire", "OnPreviewTimerFire")
    m.previewFilm = Invalid
    m.artWide = false

    m.heroTimer = m.top.FindNode("heroTimer")
    m.heroTimer.ObserveField("fire", "OnHeroTimerFire")

    ' Focus safety + deep links (certification)
    m.top.ObserveField("focusedChild", "OnHomeFocusChange")
    m.top.ObserveField("deepLinkContentId", "OnDeepLinkRequested")

    ' Loading bar animation
    m.loadingAnim = CreateObject("roSGNode", "Animation")
    m.loadingAnim.duration = 1.5
    m.loadingAnim.repeat = true
    loadInterp = m.loadingAnim.CreateChild("FloatFieldInterpolator")
    loadInterp.fieldToInterp = "loadingProgress.width"
    loadInterp.key = [0.0, 0.5, 1.0]
    loadInterp.keyValue = [0, 400, 0]
    m.loadingAnim.control = "start"

    LoadFeed()
End Sub

' =============================================================================
' LOADING THE FEED
' =============================================================================
Sub LoadFeed()
    ShowLoading("Loading your experience...")

    ' Coming back to Home from another tab: MainScene hands us the feed it cached.
    If m.top.feedData <> Invalid
        m.cachedFeedTimer = m.top.CreateChild("Timer")
        m.cachedFeedTimer.duration = 0.2
        m.cachedFeedTimer.repeat = false
        m.cachedFeedTimer.ObserveField("fire", "OnCachedFeedTimerFire")
        m.cachedFeedTimer.control = "start"
        Return
    End If

    m.contentTask = CreateObject("roSGNode", "ContentTask")
    m.contentTask.taskType = "fetchFeed"
    If m.global <> Invalid And m.global.HasField("deviceId") And m.global.deviceId <> Invalid
        m.contentTask.deviceId = m.global.deviceId
    End If
    m.contentTask.ObserveField("taskStatus", "OnTaskStatusChange")
    m.contentTask.control = "run"
End Sub

Sub OnCachedFeedTimerFire()
    m.feedData = m.top.feedData
    OnFeedLoaded()
End Sub

Sub OnTaskStatusChange()
    If m.contentTask = Invalid Then Return
    status = m.contentTask.taskStatus
    If status = "running" Then Return
    If status = "success"
        m.feedData = m.contentTask.feedData
        OnFeedLoaded()
    Else If status = "error"
        ShowError("Check your internet connection and try again.")
        Print "CrateTV [Home]: feed error - " + Box(m.contentTask.errorMessage).ToStr()
    End If
End Sub

' =============================================================================
' BUILDING THE ROWS
' =============================================================================
Sub OnFeedLoaded()
    If m.feedData = Invalid Or m.feedData.GetChildCount() = 0
        ShowError("There's nothing to show right now. Please try again in a moment.")
        Return
    End If

    ' Let MainScene cache the untouched feed (used by other tabs).
    m.top.feedDataReady = m.feedData

    allRows = []
    For i = 0 To m.feedData.GetChildCount() - 1
        row = m.feedData.GetChild(i)
        If row <> Invalid Then allRows.Push(row)
    End For

    ' --- Find the Top 10 row (by categoryType, then rowType, then title) ---
    topTenRow = Invalid
    topTenIndex = -1
    For ri = 0 To allRows.Count() - 1
        If IsTopTenRow(allRows[ri])
            topTenRow = allRows[ri]
            topTenIndex = ri
            Exit For
        End If
    End For
    If topTenRow = Invalid
        topTenRow = BuildTopTenFromFeed(allRows)
    End If

    ' --- Watch Parties row goes FIRST, above Top 10 (Oct 2026), like the
    '     cards at the top of the website: no scrolling to find a party. ---
    partyRow = Invalid
    partyIndex = -1
    For ri = 0 To allRows.Count() - 1
        r = allRows[ri]
        If r <> Invalid And r.HasField("categoryType") And LCase(r.categoryType) = "watchparty" And r.GetChildCount() > 0
            partyRow = r
            partyIndex = ri
            Exit For
        End If
    End For

    ' --- Assemble the rows shown on Home ---
    m.rowListContent = CreateObject("roSGNode", "ContentNode")
    m.heroItems = Invalid
    If partyRow <> Invalid Then m.rowListContent.AppendChild(partyRow)
    If topTenRow <> Invalid And topTenRow.GetChildCount() > 0
        m.rowListContent.AppendChild(topTenRow)
    End If

    For ri = 0 To allRows.Count() - 1
        If ri = topTenIndex Or ri = partyIndex Then Continue For
        row = allRows[ri]
        rowTitle = RowTitleOf(row)
        titleLower = LCase(rowTitle)
        rowType = ""
        If row.HasField("rowType") Then rowType = LCase(row.rowType)

        If rowTitle = "__hero__" Or rowType = "hero"
            m.heroItems = row                                   ' billboard only
        Else If titleLower = "featured" Or titleLower = "featured movies"
            ' Removed from Home by request
        Else If Instr(1, titleLower, "now streaming") > 0 Or Instr(1, titleLower, "streaming now") > 0
            ' Has its own "Now Streaming" tab
        Else If Instr(1, titleLower, "square") > 0 Or rowTitle = "Public Domain Classics"
            ' Lives on the Public Square tab
        Else If row.GetChildCount() > 0
            m.rowListContent.AppendChild(row)
        End If
    End For

    If m.rowListContent.GetChildCount() = 0
        ShowError("There's nothing to show right now. Please try again in a moment.")
        Return
    End If

    ' --- Tile sizes per row; number the Top 10 ---
    itemSizes = []
    itemSpacings = []
    For ri = 0 To m.rowListContent.GetChildCount() - 1
        row = m.rowListContent.GetChild(ri)
        If IsTopTenRow(row)
            itemSizes.Push([m.TOP_TEN_TILE_W, m.TILE_H])
            itemSpacings.Push([m.TOP_TEN_GAP, 0])
            For i = 0 To row.GetChildCount() - 1
                film = row.GetChild(i)
                If film <> Invalid
                    If Not film.HasField("rankNumber") Then film.AddField("rankNumber", "integer", false)
                    film.rankNumber = i + 1
                End If
            End For
        Else
            itemSizes.Push([m.TILE_W, m.TILE_H])
            itemSpacings.Push([m.TILE_GAP, 0])
        End If
    End For
    m.rowList.rowItemSize = itemSizes
    m.rowList.rowItemSpacing = itemSpacings
    m.rowList.content = m.rowListContent

    ' --- Show it ---
    m.contentLoaded = true
    HideLoading()
    m.billboard.visible = true
    m.rowList.visible = true
    m.rowList.SetFocus(true)

    ' Billboard starts on the watch party when there is one, else the first
    ' featured film (or the first film on Home).
    If partyRow <> Invalid
        ShowOnBillboard(partyRow.GetChild(0), "WATCH PARTY", true)
    Else If m.heroItems <> Invalid And m.heroItems.GetChildCount() > 0
        ShowOnBillboard(m.heroItems.GetChild(0), "FEATURED", true)
    Else
        firstRow = m.rowListContent.GetChild(0)
        If firstRow <> Invalid And firstRow.GetChildCount() > 0
            ShowOnBillboard(firstRow.GetChild(0), UCase(RowTitleOf(firstRow)), true)
        End If
    End If
    m.idleClock.Mark()
    m.heroTimer.control = "start"

    ProcessDeepLink()
End Sub

Function IsTopTenRow(row as Object) as Boolean
    If row = Invalid Then Return false
    catType = "" : rowType = ""
    If row.HasField("categoryType") Then catType = LCase(row.categoryType)
    If row.HasField("rowType") Then rowType = LCase(row.rowType)
    If catType = "topten" Or rowType = "ranked" Then Return true
    t = LCase(RowTitleOf(row))
    Return (Instr(1, t, "top ten") > 0 Or Instr(1, t, "top 10") > 0)
End Function

' If the feed has no Top 10 row, make one from the first 10 films with posters.
Function BuildTopTenFromFeed(allRows as Object) as Object
    topTen = CreateObject("roSGNode", "ContentNode")
    topTen.title = "Top 10 on Crate TV Today"
    topTen.AddField("rowType", "string", false)
    topTen.rowType = "ranked"
    topTen.AddField("categoryType", "string", false)
    topTen.categoryType = "topten"
    seen = {}
    For Each row in allRows
        rowTitle = RowTitleOf(row)
        If rowTitle = "__hero__" Or LCase(rowTitle) = "featured" Or LCase(rowTitle) = "featured movies" Then Continue For
        If row.HasField("rowType") And row.rowType = "hero" Then Continue For
        For ci = 0 To row.GetChildCount() - 1
            If topTen.GetChildCount() >= 10 Then Exit For
            film = row.GetChild(ci)
            If film = Invalid Then Continue For
            key = LCase(FieldText(film, "title").Trim())
            If key = "" Or seen.DoesExist(key) Or FieldText(film, "posterUrl") = "" Then Continue For
            seen[key] = true
            ' Clone so numbering this copy doesn't put rank numbers on the film's other rows.
            topTen.AppendChild(film.Clone(false))
        End For
        If topTen.GetChildCount() >= 10 Then Exit For
    End For
    If topTen.GetChildCount() = 0 Then Return Invalid
    Return topTen
End Function

Function RowTitleOf(row as Object) as String
    If row <> Invalid And row.HasField("title") And row.title <> Invalid Then Return row.title
    Return ""
End Function

' =============================================================================
' BILLBOARD
' =============================================================================
' eyebrow: the small red line above the title (row name, "TOP 10 · #3", ...)
' immediateArt: true = swap the artwork now (first load / idle cycling)
Sub ShowOnBillboard(film as Object, eyebrow as String, immediateArt as Boolean)
    If film = Invalid Then Return
    m.top.focusedContent = film

    ' --- Text (updates instantly) ---
    rank = 0
    If film.HasField("rankNumber") Then rank = film.rankNumber
    If rank > 0 Then eyebrow = "TOP 10  ·  #" + Str(rank).Trim()
    If film.HasField("isWatchPartyEnabled") And film.isWatchPartyEnabled Then eyebrow = "●  WATCH PARTY"
    m.heroEyebrow.text = eyebrow
    m.heroTitle.text = FieldText(film, "title")
    m.heroMeta.text = MetaLine(film)
    m.heroAward.text = AwardLine(film)
    m.heroDesc.text = FieldText(film, "description")
    m.heroCredits.text = CreditsLine(film)
    LayoutBillboardInfo()

    ' --- Trailer: stop the current one, start this film's after a pause ---
    StopTrailer()
    m.previewFilm = film
    m.previewTimer.control = "start"

    ' --- Artwork (after a short pause, unless immediate) ---
    m.pendingArtFilm = film
    If immediateArt
        OnArtDelayFire()
    Else
        m.artDelayTimer.control = "stop"
        m.artDelayTimer.control = "start"
    End If
End Sub

' Stacks the billboard lines top-to-bottom, skipping empty ones.
Sub LayoutBillboardInfo()
    gaps = { heroEyebrow: 10, heroTitle: 14, heroMeta: 10, heroAward: 16, heroDesc: 14, heroCredits: 0 }
    y = 0
    For Each name in ["heroEyebrow", "heroTitle", "heroMeta", "heroAward", "heroDesc", "heroCredits"]
        label = m[name]
        hasText = (label.text <> "")
        label.visible = hasText
        If hasText
            label.translation = [0, y]
            y = y + label.boundingRect().height + gaps[name]
        End If
    End For
End Sub

Sub OnArtDelayFire()
    film = m.pendingArtFilm
    If film = Invalid Then Return
    wide = (film.HasField("hasWideArt") And film.hasWideArt)
    url = ""
    If wide Then url = FieldText(film, "backdropUrl")
    If url = "" Then url = FieldText(film, "posterUrl")
    If url = "" Or url = m.billboardArt.uri Then Return

    ' Wide art: full screen. Portrait poster: right side, so it isn't stretched.
    m.artWide = wide
    If wide
        m.billboardArt.translation = [0, 0]
        m.billboardArt.width = 1920 : m.billboardArt.loadWidth = 1920
    Else
        m.billboardArt.translation = [880, 0]
        m.billboardArt.width = 1040 : m.billboardArt.loadWidth = 1040
    End If
    SetFadeForWide(wide)
    m.artFade.control = "stop"
    m.billboardArt.opacity = 0.0
    m.billboardArt.uri = url
End Sub

Sub OnArtLoadStatus()
    If m.billboardArt.loadStatus = "ready" Then m.artFade.control = "start"
End Sub

' The left fade: shorter for full-screen art/trailers, longer for a portrait
' poster on the right (it hides the poster's left edge).
Sub SetFadeForWide(wide as Boolean)
    If wide
        m.fadeLeft.translation = [0, 0] : m.fadeLeft.width = 1400
    Else
        m.fadeLeft.translation = [508, 0] : m.fadeLeft.width = 840
    End If
End Sub

' ---- Trailer preview --------------------------------------------------------
Sub OnPreviewTimerFire()
    film = m.previewFilm
    If film = Invalid Or Not m.top.IsInFocusChain() Then Return
    ' Nobody has touched the remote for a while: no more previews, so the TV
    ' can go quiet and the Roku's screensaver can start. (Roku never starts a
    ' screensaver while any video is playing.)
    If m.remoteClock.TotalSeconds() >= m.STOP_PREVIEWS_AFTER_IDLE_SECONDS Then Return
    ' Trailer, or a minute from the middle of the film (source/Preview.brs)
    src = PreviewSourceFor(film)
    If src.url = "" Then Return
    m.trailer.url = src.url
    m.trailer.startPercent = src.startPercent
    m.trailer.maxSeconds = src.maxSeconds
    m.trailer.control = "play"
End Sub

Sub StopTrailer()
    m.previewTimer.control = "stop"
    m.trailer.control = "stop"     ' also cancels one that is still loading
End Sub

' Trailers are 16:9 and fill the screen, so use the full-screen fade while one plays.
Sub OnTrailerPlayingChange()
    If m.trailer.isPlaying
        SetFadeForWide(true)
    Else
        SetFadeForWide(m.artWide)
    End If
End Sub

Sub OnTrailerFinished()
    SetFadeForWide(m.artWide)
    m.idleClock.Mark()     ' let the viewer enjoy the artwork before cycling resumes
End Sub

' Idle cycling through featured films (only when the viewer isn't browsing).
Sub OnHeroTimerFire()
    If m.trailer.isPlaying Then Return      ' never cut off a trailer
    If m.heroItems = Invalid Or m.heroItems.GetChildCount() < 2 Then Return
    If m.idleClock.TotalSeconds() < m.IDLE_SECONDS_BEFORE_CYCLING Then Return
    m.heroIndex = (m.heroIndex + 1) Mod m.heroItems.GetChildCount()
    ShowOnBillboard(m.heroItems.GetChild(m.heroIndex), "FEATURED", true)
End Sub

' "12 min  ·  Drama, Thriller  ·  $4.99 to unlock"
Function MetaLine(film as Object) as String
    parts = []
    runtime = FieldText(film, "runtime")
    If runtime <> "" Then parts.Push(runtime)
    genres = FieldText(film, "genres")
    If genres <> ""
        ' At most two genres, so the line stays short.
        g = genres.Split(",")
        If g.Count() > 2 Then genres = g[0].Trim() + ", " + g[1].Trim()
        parts.Push(genres)
    End If
    If film.HasField("isUnlocked") And Not film.isUnlocked
        If film.HasField("salePrice") And film.salePrice > 0
            parts.Push("$" + PriceText(film.salePrice) + " to unlock")
        Else
            parts.Push("Unlock at cratetv.net")
        End If
    End If
    Return JoinArr(parts, "  ·  ")
End Function

Function AwardLine(film as Object) as String
    award = FieldText(film, "awardName")
    If award = "" Then Return ""
    year = FieldText(film, "awardYear")
    If year <> "" Then award = award + " " + year
    Return "★  " + award
End Function

Function CreditsLine(film as Object) as String
    parts = []
    director = FieldText(film, "director")
    If director <> "" Then parts.Push("Directed by " + director)
    cast = FieldText(film, "cast")
    If cast <> ""
        names = cast.Split(",")
        If names.Count() > 3 Then cast = names[0].Trim() + ", " + names[1].Trim() + ", " + names[2].Trim()
        parts.Push("Starring " + cast)
    End If
    Return JoinArr(parts, "   ·   ")
End Function

' =============================================================================
' FOCUS AND SELECTION
' =============================================================================
' When Home gets focus back (after the Title page, video, or the header),
' hand it to the RowList so the viewer is never stuck. (Certification)
Sub OnHomeFocusChange()
    If m.top.IsInFocusChain()
        If m.contentLoaded And Not m.rowList.HasFocus()
            m.remoteClock.Mark()        ' they just came back to Home
            m.rowList.SetFocus(true)
            ' Back on Home (from the menu or a film page): trailer again after the pause
            If m.previewFilm <> Invalid And Not m.trailer.isPlaying Then m.previewTimer.control = "start"
        End If
    Else
        ' Focus left Home (menu, film page, player): silence the trailer.
        StopTrailer()
    End If
End Sub

Sub OnRowItemFocused()
    focused = m.rowList.rowItemFocused
    If focused = Invalid Or focused.Count() < 2 Then Return
    m.currentRow = focused[0]
    m.idleClock.Mark()
    m.remoteClock.Mark()
    film = FilmAt(focused[0], focused[1])
    If film <> Invalid
        row = m.rowListContent.GetChild(focused[0])
        ShowOnBillboard(film, UCase(RowTitleOf(row)), false)
    End If
End Sub

Sub OnRowItemSelected()
    selected = m.rowList.rowItemSelected
    If selected = Invalid Or selected.Count() < 2 Then Return
    film = FilmAt(selected[0], selected[1])
    StopTrailer()      ' only one video can play at a time
    If film <> Invalid Then m.top.selectedContent = film     ' MainScene opens the Title page
End Sub

Function FilmAt(rowIndex as Integer, itemIndex as Integer) as Object
    If m.rowListContent = Invalid Or rowIndex >= m.rowListContent.GetChildCount() Then Return Invalid
    row = m.rowListContent.GetChild(rowIndex)
    If row = Invalid Then Return Invalid
    Return row.GetChild(itemIndex)
End Function

' =============================================================================
' DEEP LINKS (Roku certification 5.1)
' =============================================================================
Sub OnDeepLinkRequested()
    If m.contentLoaded Then ProcessDeepLink()
End Sub

Sub ProcessDeepLink()
    If Not m.contentLoaded Then Return
    StopTrailer()
    contentId = m.top.deepLinkContentId
    If contentId = Invalid Or contentId = "" Then Return

    mediaType = "movie"
    If m.global <> Invalid And m.global.HasField("deepLinkMediaType")
        If m.global.deepLinkMediaType <> Invalid And m.global.deepLinkMediaType <> "" Then mediaType = LCase(m.global.deepLinkMediaType)
    End If

    film = FindContentById(contentId)
    m.top.deepLinkContentId = ""      ' handle each deep link once
    If film = Invalid
        Print "CrateTV [Home]: deep link - no film found for '" + contentId + "'"
        Return
    End If
    Print "CrateTV [Home]: deep link -> '" + FieldText(film, "title") + "' (" + mediaType + ")"

    If mediaType = "series" Or mediaType = "season"
        m.top.selectedContent = film          ' show the Title page
    Else
        ' movie / episode / unknown: Roku requires playback to start directly
        m.top.directPlay = true
        m.top.playContent = film
    End If
End Sub

' Finds a film by id/key; falls back to title matching (see aliasMap for known
' spelling differences between Roku search and the feed).
Function FindContentById(contentId as String) as Object
    If m.rowListContent = Invalid Then Return Invalid
    searchId = LCase(contentId.Trim())

    aliasMap = { "neighbours": "neighbors", "theneighbours": "neighbors", "theneighbors": "neighbors" }
    searchAlias = searchId
    If aliasMap[searchId] <> Invalid Then searchAlias = aliasMap[searchId]

    ' Pass 1: exact id / key match
    For i = 0 To m.rowListContent.GetChildCount() - 1
        row = m.rowListContent.GetChild(i)
        For j = 0 To row.GetChildCount() - 1
            item = row.GetChild(j)
            If item <> Invalid
                If LCase(FieldText(item, "id").Trim()) = searchId Or LCase(FieldText(item, "movieKey").Trim()) = searchId Or LCase(FieldText(item, "contentId").Trim()) = searchId Then Return item
            End If
        End For
    End For
    ' Pass 2: alias / title match
    For i = 0 To m.rowListContent.GetChildCount() - 1
        row = m.rowListContent.GetChild(i)
        For j = 0 To row.GetChildCount() - 1
            item = row.GetChild(j)
            If item <> Invalid
                titleNorm = LCase(FieldText(item, "title").Trim())
                If LCase(FieldText(item, "id").Trim()) = searchAlias Or titleNorm = searchAlias Then Return item
                If Instr(1, titleNorm, searchAlias) > 0 Or Instr(1, titleNorm, searchId) > 0 Then Return item
            End If
        End For
    End For
    Return Invalid
End Function

' =============================================================================
' LOADING / ERROR STATES
' =============================================================================
Sub ShowLoading(message as String)
    m.loadingText.text = message
    m.loadingGroup.visible = true
    m.errorGroup.visible = false
    m.billboard.visible = false
    m.rowList.visible = false
End Sub

Sub HideLoading()
    m.loadingAnim.control = "stop"
    m.loadingGroup.visible = false
End Sub

Sub ShowError(message as String)
    m.loadingGroup.visible = false
    m.errorGroup.visible = true
    m.errorMessage.text = message
    m.billboard.visible = false
    m.rowList.visible = false
End Sub

' =============================================================================
' REMOTE KEYS (only keys the RowList doesn't use itself arrive here)
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false

    If m.errorGroup.visible
        If key = "OK" Then LoadFeed() : Return true
        If key = "back" Then m.top.exitRequested = true : Return true
        Return true
    End If
    If m.loadingGroup.visible Then Return true

    ' Back, or Up from the first row -> header menu (MainScene handles it)
    If key = "back" Or (key = "up" And m.currentRow = 0)
        m.top.exitRequested = true
        Return true
    End If
    Return false     ' never swallow arrows (certification)
End Function

' =============================================================================
' SMALL HELPERS
' =============================================================================
' Reads a text field from a node safely ("" if missing).
Function FieldText(node as Object, fieldName as String) as String
    If node = Invalid Or Not node.HasField(fieldName) Then Return ""
    value = node[fieldName]
    If value = Invalid Then Return ""
    If Type(value) = "roString" Or Type(value) = "String" Then Return value
    Return ""
End Function

Function JoinArr(arr as Object, delimiter as String) as String
    result = ""
    For i = 0 To arr.Count() - 1
        If i > 0 Then result = result + delimiter
        result = result + arr[i]
    End For
    Return result
End Function

' 4.5 -> "4.50", 5 -> "5"
Function PriceText(amount as Float) as String
    cents = Int(amount * 100 + 0.5)
    dollars = Int(cents / 100)
    rest = cents - dollars * 100
    If rest = 0 Then Return Str(dollars).Trim()
    restStr = Str(rest).Trim()
    If rest < 10 Then restStr = "0" + restStr
    Return Str(dollars).Trim() + "." + restStr
End Function
