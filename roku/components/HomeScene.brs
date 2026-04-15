' ##############################################################################
' CRATE TV - Home Scene Controller (CERTIFICATION READY 2025)
'
' CERTIFICATION REQUIREMENTS ADDRESSED:
' - Deep linking with proper contentId resolution
' - Focus management that never traps or loses focus
' - Robust key event handling for RTA automation
' - Signal beacon integration for performance tracking
' ##############################################################################

Sub Init()
    Print "CrateTV [Home]: Initializing..."
    
    m.loadingGroup = m.top.FindNode("loadingGroup")
    m.loadingProgress = m.top.FindNode("loadingProgress")
    m.loadingText = m.top.FindNode("loadingText")
    m.errorGroup = m.top.FindNode("errorGroup")
    m.errorMessage = m.top.FindNode("errorMessage")
    
    m.heroSpotlight = m.top.FindNode("heroSpotlight")
    m.heroPosterImage = m.top.FindNode("heroPosterImage")
    m.heroTitle = m.top.FindNode("heroTitle")
    m.heroMeta = m.top.FindNode("heroMeta")
    m.heroGenre = m.top.FindNode("heroGenre")
    m.heroDesc = m.top.FindNode("heroDesc")
    m.heroCastSection = m.top.FindNode("heroCastSection")
    m.heroCastLabel = m.top.FindNode("heroCastLabel")
    m.heroDirectorSection = m.top.FindNode("heroDirectorSection")
    m.heroDirectorLabel = m.top.FindNode("heroDirectorLabel")
    m.dynamicBackdrop = m.top.FindNode("dynamicBackdrop")
    
    m.rowList = m.top.FindNode("rowList")
    m.heroTrailer       = m.top.FindNode("heroTrailer")
    m.trailerDwellTimer = m.top.FindNode("trailerDwellTimer")
    m.trailerStopTimer  = m.top.FindNode("trailerStopTimer")
    m.dynamicBackdrop   = m.top.FindNode("dynamicBackdrop")

    m.contentLoaded = false
    m.feedData = Invalid
    m.rowListContent = Invalid
    m.currentFocusedMovie = Invalid
    m.currentRow = 0   ' Tracks focused row index for up-to-nav detection
    
    ' itemComponentName and rowItemSize are set per-row after content loads
    ' so we know which row is ranked vs standard.
    ' Default to MoviePosterItem until content is ready.
    m.rowList.itemComponentName = "MoviePosterItem"
    m.rowList.ObserveField("rowItemFocused", "OnRowItemFocused")
    m.rowList.ObserveField("rowItemSelected", "OnRowItemSelected")
    m.trailerDwellTimer.ObserveField("fire", "OnTrailerDwellFire")
    m.trailerStopTimer.ObserveField("fire",  "OnTrailerStopFire")
    if m.heroTrailer <> Invalid
        m.heroTrailer.ObserveField("state", "OnTrailerStateChange")
    end if
    
    ' =========================================================================
    ' CRITICAL FOR CERTIFICATION: Focus restoration
    ' =========================================================================
    ' When the scene regains focus (e.g., after video playback or deep link),
    ' we must restore focus to the RowList to prevent focus trapping
    m.top.ObserveField("focusedChild", "OnHomeFocusChange")
    
    ' =========================================================================
    ' DEEP LINK HANDLING
    ' =========================================================================
    ' When MainScene sets deepLinkContentId, process the deep link
    m.top.ObserveField("deepLinkContentId", "OnDeepLinkRequested")
    
    ' Loading animation
    m.loadingAnim = CreateObject("roSGNode", "Animation")
    m.loadingAnim.duration = 1.5
    m.loadingAnim.repeat = true
    m.loadingInterp = m.loadingAnim.CreateChild("FloatFieldInterpolator")
    m.loadingInterp.fieldToInterp = "loadingProgress.width"
    m.loadingInterp.key = [0.0, 0.5, 1.0]
    m.loadingInterp.keyValue = [0, 400, 0]
    m.loadingAnim.control = "start"
    
    LoadFeed()
End Sub

Sub LoadFeed()
    ' =======================================================================
    ' OPTIMIZATION: Skip loading if feed data already provided
    ' =======================================================================
    ' If MainScene already passed cached feedData, process it immediately
    ' instead of showing a loading spinner and making a new API call.
    ' We still show loading briefly so the screen isn't jarring.
    If m.top.feedData <> Invalid
        Print "CrateTV [Home]: Feed data already provided, processing after brief loading display"
        ShowLoading("Loading content...")
        ' Use a short timer so the loading screen appears before content renders
        m.cachedFeedTimer = m.top.CreateChild("Timer")
        m.cachedFeedTimer.duration = 0.5
        m.cachedFeedTimer.repeat = false
        m.cachedFeedTimer.ObserveField("fire", "OnCachedFeedTimerFire")
        m.cachedFeedTimer.control = "start"
        Return
    End If
    
    ShowLoading("Loading content...")
    
    m.contentTask = CreateObject("roSGNode", "ContentTask")
    m.contentTask.taskType = "fetchFeed"
    If m.global <> Invalid And m.global.HasField("deviceId") And m.global.deviceId <> Invalid
        m.contentTask.deviceId = m.global.deviceId
    End If
    m.contentTask.ObserveField("taskStatus", "OnTaskStatusChange")
    m.contentTask.control = "run"
End Sub

Sub OnCachedFeedTimerFire()
    ' Timer fired -- now process the pre-cached feed data
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
        ShowError(m.contentTask.errorMessage)
    End If
End Sub

Sub OnFeedLoaded()
    If m.feedData = Invalid
        ShowError("No content available")
        Return
    End If
    
    childCount = m.feedData.GetChildCount()
    If childCount = 0
        ShowError("No content available")
        Return
    End If
    
    ' Notify parent with ORIGINAL feedData BEFORE filtering
    m.top.feedDataReady = m.feedData
    
    ' =========================================================================
    ' MAP CATEGORIES from JSON feed into RowList
    ' PRIORITY: 
    ' 1. Skip "Featured" row (user doesn't want it)
    ' 2. Make "Top Ten Today" the FIRST row in RowList
    ' 3. Keep hero spotlight at top (different from RowList)
    ' =========================================================================
    m.rowListContent = CreateObject("roSGNode", "ContentNode")
    m.heroItems = Invalid
    
    ' Step 1: Snapshot all children into array
    allRows = []
    For i = 0 To childCount - 1
        row = m.feedData.GetChild(i)
        If row <> Invalid Then allRows.Push(row)
    End For
    
    ' Step 2: Find "Top Ten Today" and "Now Streaming" rows
    topTenRow = Invalid
    topTenIndex = -1
    nowStreamingRow = Invalid
    nowStreamingIndex = -1
    
    For ri = 0 To allRows.Count() - 1
        row = allRows[ri]
        rowTitle = ""
        If row.HasField("title") Then rowTitle = row.title
        
        ' Look for Top Ten variations — match by categoryType first (most reliable),
        ' then type="ranked", then title keywords as fallback
        titleLower = LCase(rowTitle)
        rowCatType = ""
        If row.HasField("categoryType") Then rowCatType = LCase(row.categoryType)
        rowTypeVal = ""
        If row.HasField("rowType") Then rowTypeVal = LCase(row.rowType)
        
        isTopTen = false
        If rowCatType = "topten" Then isTopTen = true
        If Not isTopTen And rowTypeVal = "ranked" Then isTopTen = true
        If Not isTopTen And (titleLower = "top ten today" Or titleLower = "top 10 today" Or titleLower = "top ten movies" Or titleLower = "top 10 movies" Or Instr(1, titleLower, "top ten") > 0 Or Instr(1, titleLower, "top 10") > 0) Then isTopTen = true
        
        If isTopTen
            topTenRow = row
            topTenIndex = ri
            Print "CrateTV [Home]: ★★★ Found TOP TEN: '" + rowTitle + "' (categoryType=" + rowCatType + ") at index " + Str(ri) + " ★★★"
        End If
        
        ' Look for Now Streaming
        If Instr(1, titleLower, "now streaming") > 0 Or Instr(1, titleLower, "streaming now") > 0
            nowStreamingRow = row
            nowStreamingIndex = ri
            Print "CrateTV [Home]: ★★★ Found NOW STREAMING: '" + rowTitle + "' at index " + Str(ri) + " ★★★"
        End If
    End For
    
    ' Step 3: If no Top Ten row from API, build one from first 10 movies in feed
    If topTenRow = Invalid
        Print "CrateTV [Home]: No ranked row from API — building Top Ten from feed"
        syntheticTopTen = CreateObject("roSGNode", "ContentNode")
        syntheticTopTen.title = "Top Ten Today"
        syntheticTopTen.AddField("rowType", "string", false)
        syntheticTopTen.rowType = "ranked"
        syntheticTopTen.AddField("categoryType", "string", false)
        syntheticTopTen.categoryType = "topten"
        seen = {}
        For ri = 0 To allRows.Count() - 1
            If syntheticTopTen.GetChildCount() >= 10 Then Exit For
            row = allRows[ri]
            rowTitle = ""
            If row.HasField("title") Then rowTitle = row.title
            ' Skip hero, featured, square rows
            isHero = (rowTitle = "__hero__")
            If row.HasField("rowType") And row.rowType = "hero" Then isHero = true
            If isHero Then Continue For
            If LCase(rowTitle) = "featured" Or LCase(rowTitle) = "featured movies" Then Continue For
            For ci = 0 To row.GetChildCount() - 1
                If syntheticTopTen.GetChildCount() >= 10 Then Exit For
                movie = row.GetChild(ci)
                If movie = Invalid Then Continue For
                movieTitle = ""
                If movie.HasField("title") Then movieTitle = movie.title
                key = LCase(movieTitle.Trim())
                If key = "" Or seen.DoesExist(key) Then Continue For
                ' Only include if it has a poster
                hasPoster = false
                If movie.HasField("posterUrl")   And movie.posterUrl   <> "" Then hasPoster = true
                If movie.HasField("HDPosterUrl")  And movie.HDPosterUrl  <> "" Then hasPoster = true
                If movie.HasField("hdPosterUrl")  And movie.hdPosterUrl  <> "" Then hasPoster = true
                If movie.HasField("tvPoster")     And movie.tvPoster     <> "" Then hasPoster = true
                If movie.HasField("poster")       And movie.poster       <> "" Then hasPoster = true
                If Not hasPoster Then Continue For
                seen[key] = true
                syntheticTopTen.AppendChild(movie)
            End For
        End For
        If syntheticTopTen.GetChildCount() > 0
            topTenRow = syntheticTopTen
            Print "CrateTV [Home]: Built synthetic Top Ten with " + Str(topTenRow.GetChildCount()) + " movies"
        End If
    End If

    ' Step 4: Build RowList - Top Ten first, Now Streaming second, skip Featured/Square, then others
    addedTopTen = false
    addedNowStreaming = false
    
    For ri = 0 To allRows.Count() - 1
        row = allRows[ri]
        
        ' Add Top Ten as FIRST RowList row
        If Not addedTopTen And topTenRow <> Invalid
            rowTitle = ""
            If topTenRow.HasField("title") Then rowTitle = topTenRow.title
            rowType = "ranked"
            If topTenRow.HasField("rowType") Then rowType = topTenRow.rowType
            rowChildCount = topTenRow.GetChildCount()
            
            If rowChildCount > 0
                m.rowListContent.AppendChild(topTenRow)
                Print "CrateTV [Home]: ✓✓✓ [#1 FIRST ROW] '" + rowTitle + "' (" + rowType + ") -- " + Str(rowChildCount) + " items ✓✓✓"
            End If
            addedTopTen = true
        End If
        
        ' NOW STREAMING row is no longer shown on the Home screen.
        ' It lives in the top navigation as its own dedicated scene
        ' with the zine QR code. Mark as added so it gets skipped below.
        If Not addedNowStreaming And nowStreamingRow <> Invalid And addedTopTen
            addedNowStreaming = true
            Print "CrateTV [Home]: Now Streaming row moved to nav -- skipped from home rows"
        End If
        
        ' Skip if this is the Top Ten or Now Streaming row (already added)
        If ri = topTenIndex Or ri = nowStreamingIndex Then Continue For
        
        ' Process other rows
        rowTitle = ""
        If row.HasField("title") Then rowTitle = row.title
        rowType = "standard"
        If row.HasField("rowType") Then rowType = row.rowType
        rowChildCount = row.GetChildCount()
        
        ' Check for rows to skip or route to Public Square
        isHero = (rowTitle = "__hero__" Or rowType = "hero")
        isPublicOnly = (rowTitle = "Public Domain Classics")
        isFeatured = (LCase(rowTitle) = "featured" Or LCase(rowTitle) = "featured movies")
        isSquare = (LCase(rowTitle) = "square" Or LCase(rowTitle) = "square movies" Or Instr(1, LCase(rowTitle), "square") > 0)
        
        If isHero
            ' Keep for hero spotlight
            m.heroItems = row
            Print "CrateTV [Home]: Hero spotlight -- " + Str(rowChildCount) + " items"
        Else If isFeatured
            ' SKIP Featured row - user doesn't want it
            Print "CrateTV [Home]: ✗ SKIPPED 'Featured' row (removed per user request)"
        Else If isPublicOnly Or isSquare
            ' Route to Public Square tab
            If isSquare
                Print "CrateTV [Home]: '" + rowTitle + "' -- routed to Public Square tab"
            Else
                Print "CrateTV [Home]: '" + rowTitle + "' -- routed to Public Square only"
            End If
        Else If rowChildCount > 0
            m.rowListContent.AppendChild(row)
            Print "CrateTV [Home]: ✓ Row '" + rowTitle + "' (" + rowType + ") -- " + Str(rowChildCount) + " items"
        Else
            Print "CrateTV [Home]: ✗ SKIPPED empty row '" + rowTitle + "'"
        End If
    End For
    
    Print "CrateTV [Home]: ========================================="
    Print "CrateTV [Home]: Total RowList rows: " + Str(m.rowListContent.GetChildCount())
    If topTenRow <> Invalid
        Print "CrateTV [Home]: ★★★ 'Top Ten Today' is FIRST RowList row ★★★"
    End If
    Print "CrateTV [Home]: 'Featured' row has been removed"
    Print "CrateTV [Home]: ========================================="
    
    ' =========================================================================
    ' PER-ROW SIZING + RANK BADGE DATA
    ' RowList uses a SINGLE itemComponentName ("MoviePosterItem") for all rows.
    ' Top Ten items get a "rankNumber" field (1-10) to show rank badge overlay.
    ' =========================================================================
    If m.rowListContent.GetChildCount() > 0
        numRows = m.rowListContent.GetChildCount()
        itemSizes = []
        itemSpacings = []
        
        For ri = 0 To numRows - 1
            row = m.rowListContent.GetChild(ri)
            rowCatType = ""
            rowTypeVal = ""
            If row.HasField("categoryType") Then rowCatType = LCase(row.categoryType)
            If row.HasField("rowType") Then rowTypeVal = LCase(row.rowType)
            
            isRanked = (rowCatType = "topten" Or rowTypeVal = "ranked")
            
            If isRanked
                itemSizes.Push([260, 380])
                itemSpacings.Push([10, 0])
                ' Assign rankNumber to each movie so MoviePosterItem shows badge
                For i = 0 To row.GetChildCount() - 1
                    movie = row.GetChild(i)
                    If movie <> Invalid
                        If Not movie.HasField("rankNumber") Then movie.AddField("rankNumber", "integer", false)
                        movie.rankNumber = i + 1
                    End If
                End For
            Else
                itemSizes.Push([240, 360])
                itemSpacings.Push([20, 0])
            End If
        End For
        
        ' Single component for all rows — rank badge controlled by rankNumber field
        m.rowList.itemComponentName = "MoviePosterItem"
        m.rowList.rowItemSize = itemSizes
        m.rowList.rowItemSpacing = itemSpacings
        
        m.rowList.content = m.rowListContent
        m.rowList.visible = true
    End If
    
    m.contentLoaded = true
    HideLoading()
    m.heroSpotlight.visible = true
    
    ' =========================================================================
    ' CRITICAL FOR CERTIFICATION: Ensure focus is set
    ' =========================================================================
    ' Always give focus to the RowList after content loads
    ' This prevents focus from being lost or trapped
    m.rowList.SetFocus(true)
    Print "CrateTV [Home]: Focus set to RowList"
    
    ' Process deep link if present
    ProcessDeepLink()
    
    ' Setup hero spotlight with auto-cycling every 8 seconds
    If m.heroItems <> Invalid And m.heroItems.GetChildCount() > 0
        UpdateHeroSpotlight(m.heroItems.GetChild(0))
        m.heroIndex = 0
        If m.heroItems.GetChildCount() > 1
            m.heroTimer = m.top.FindNode("heroTimer")
            if m.heroTimer <> Invalid
                m.heroTimer.ObserveField("fire", "OnHeroTimerFire")
                m.heroTimer.control = "start"
            End If
        End If
    Else If m.rowListContent.GetChildCount() > 0
        firstRow = m.rowListContent.GetChild(0)
        If firstRow <> Invalid And firstRow.GetChildCount() > 0
            UpdateHeroSpotlight(firstRow.GetChild(0))
        End If
    End If
End Sub

Sub OnHeroTimerFire()
    If m.heroItems = Invalid Or m.heroItems.GetChildCount() <= 1 Then Return
    m.heroIndex = (m.heroIndex + 1) Mod m.heroItems.GetChildCount()
    UpdateHeroSpotlight(m.heroItems.GetChild(m.heroIndex))
End Sub

' =============================================================================
' HERO SPOTLIGHT
' =============================================================================
Sub UpdateHeroSpotlight(movie as Object)
    If movie = Invalid Then Return
    m.currentFocusedMovie = movie
    
    ' Poster
    posterUrl = GF(movie, "posterUrl", GF(movie, "HDPosterUrl", ""))
    If posterUrl <> "" Then m.heroPosterImage.uri = posterUrl Else m.heroPosterImage.uri = "pkg:/images/poster_placeholder.png"
    
    ' Backdrop
    backdropUrl = GF(movie, "backdropUrl", GF(movie, "heroImageUrl", posterUrl))
    If backdropUrl <> "" Then m.dynamicBackdrop.uri = backdropUrl
    
    ' Title
    m.heroTitle.text = GF(movie, "title", "Untitled")
    
    ' Meta line
    metaParts = []
    runtime = GF(movie, "runtime", "")
    If runtime <> "" Then metaParts.Push(runtime)
    m.heroMeta.text = JoinArr(metaParts, " • ")
    
    ' Genre
    m.heroGenre.text = GF(movie, "genres", "")
    
    ' Synopsis
    m.heroDesc.text = GF(movie, "description", "")
    
    ' Cast
    cast = GF(movie, "cast", "")
    m.heroCastLabel.text = cast
    m.heroCastSection.visible = (cast <> "")
    
    ' Director
    director = GF(movie, "director", "")
    m.heroDirectorLabel.text = director
    m.heroDirectorSection.visible = (director <> "")
End Sub

' =============================================================================
' FOCUS MANAGEMENT (CRITICAL FOR CERTIFICATION)
' =============================================================================
Sub OnHomeFocusChange()
    ' When HomeScene regains focus, restore focus to RowList
    ' This is critical for:
    ' 1. Returning from video playback
    ' 2. Deep link navigation
    ' 3. Preventing focus trapping (automation test failure)
    If m.top.IsInFocusChain() And m.rowList <> Invalid And m.contentLoaded
        m.rowList.SetFocus(true)
        Print "CrateTV [Home]: Focus restored to RowList"
    End If
End Sub

Sub OnRowItemFocused()
    focused = m.rowList.rowItemFocused
    If focused = Invalid Or focused.Count() < 2 Then Return

    rowIndex = focused[0]
    itemIndex = focused[1]

    ' Cache so OnKeyEvent can check row position without race condition
    m.currentRow = rowIndex

    ' Stop any playing trailer immediately on focus change
    StopTrailer()

    If m.rowListContent <> Invalid And rowIndex < m.rowListContent.GetChildCount()
        row = m.rowListContent.GetChild(rowIndex)
        If row <> Invalid
            realIdx = itemIndex
            movie = row.GetChild(realIdx)
            If movie <> Invalid
                m.top.focusedContent = movie
                UpdateHeroSpotlight(movie)
                ' Start dwell timer — plays fullMovie from trailerStart after 1.5s (same as web app)
                streamUrl = ""
                if movie.HasField("streamUrl") And movie.streamUrl <> Invalid then streamUrl = movie.streamUrl
                if streamUrl = "" And movie.HasField("url") And movie.url <> Invalid then streamUrl = movie.url
                hasDirectStream = streamUrl <> "" And Instr(1, LCase(streamUrl), "youtube") = 0 And Instr(1, LCase(streamUrl), "vimeo") = 0
                if hasDirectStream
                    Print "CrateTV [Trailer]: Dwell started for '" + movie.title + "'"
                    m.currentFocusedForTrailer = movie
                    m.trailerDwellTimer.control = "start"
                else
                    Print "CrateTV [Trailer]: No playable stream for '" + movie.title + "'"
                    m.currentFocusedForTrailer = Invalid
                end if
            End If
        End If
    End If
End Sub

Sub OnRowItemSelected()
    selected = m.rowList.rowItemSelected
    If selected = Invalid Or selected.Count() < 2 Then Return

    rowIndex = selected[0]
    itemIndex = selected[1]

    StopTrailer()

    If m.rowListContent <> Invalid And rowIndex < m.rowListContent.GetChildCount()
        row = m.rowListContent.GetChild(rowIndex)
        If row <> Invalid
            realIdx = itemIndex
            movie = row.GetChild(realIdx)
            If movie <> Invalid Then m.top.playContent = movie
        End If
    End If
End Sub

' =============================================================================
' DEEP LINK HANDLING (CRITICAL FOR CERTIFICATION 5.1)
' =============================================================================
Sub OnDeepLinkRequested()
    ' Called when deepLinkContentId field changes
    If m.contentLoaded Then ProcessDeepLink()
End Sub

Sub ProcessDeepLink()
    Print "CrateTV [Home]: ========== ProcessDeepLink START =========="
    Print "CrateTV [Home]: contentLoaded = " + Box(m.contentLoaded).ToStr()
    Print "CrateTV [Home]: deepLinkContentId = '" + Box(m.top.deepLinkContentId).ToStr() + "'"
    
    ' Only process if we have both content loaded and a deep link ID
    If Not m.contentLoaded
        Print "CrateTV [Home]: Skipping - content not loaded yet"
        Return
    End If
    
    If m.top.deepLinkContentId = Invalid Or m.top.deepLinkContentId = ""
        Print "CrateTV [Home]: Skipping - no deep link ID"
        Return
    End If
    
    contentId = m.top.deepLinkContentId

    ' Get mediaType from global (set by Main.brs)
    mediaType = "movie"
    if m.global <> Invalid and m.global.HasField("deepLinkMediaType") then
        if m.global.deepLinkMediaType <> Invalid and m.global.deepLinkMediaType <> "" then
            mediaType = LCase(m.global.deepLinkMediaType)
        end if
    end if

    Print "CrateTV [Home]: Processing deep link id='" + contentId + "' mediaType='" + mediaType + "'"
    
    ' Search through all content to find matching ID
    movie = FindContentById(contentId)
    
    If movie <> Invalid
        Print "CrateTV [Home]: ✅ Deep link match found - '" + GF(movie, "title", "Unknown") + "'"
        
        ' Clear the deep link so it doesn't fire again
        m.top.deepLinkContentId = ""

        ' =====================================================================
        ' CERTIFICATION REQUIREMENT: Handle mediaType appropriately
        ' =====================================================================
        ' - "movie" or "episode" → Direct-to-Play (immediate playback)
        ' - "series" or "season" → Navigate to selection screen
        ' - Unknown types → Fallback to playback
        if mediaType = "movie" or mediaType = "episode" then
            ' Direct to Play (required by Roku for movie/episode types)
            m.top.playContent = movie
            Print "CrateTV [Home]: → Direct playback triggered"
        else if mediaType = "series" or mediaType = "season"
            ' For series/season, show selection screen
            ' In this app, we trigger selectedContent which can show a details view
            m.top.selectedContent = movie
            Print "CrateTV [Home]: → Selection screen triggered"
        else
            ' Unknown media type - default to playback
            m.top.playContent = movie
            Print "CrateTV [Home]: → Playback (unknown type: " + mediaType + ")"
        end if
    Else
        Print "CrateTV [Home]: ❌ No match found for contentId = '" + contentId + "'"
        ' Clear the deep link even if not found
        m.top.deepLinkContentId = ""
    End If
    
    Print "CrateTV [Home]: ========== ProcessDeepLink END =========="
End Sub

Function FindContentById(contentId as String) as Object
    ' Search through RowList content to find matching movie
    If m.rowListContent = Invalid Then Return Invalid
    
    ' Normalize: lowercase and trim whitespace
    searchId = LCase(contentId.Trim())
    
    ' Also build a "stripped" version with no spaces/punctuation for fuzzy matching
    ' e.g. "Neighbours" matches "THENEIGHBOURS", " Neighbours" etc.
    searchStripped = ""
    For ci = 0 To Len(searchId) - 1
        c = Mid(searchId, ci + 1, 1)
        If c <> " " And c <> "-" And c <> ":" And c <> "'" Then searchStripped = searchStripped + c
    End For
    
    ' Pass 1: exact ID match
    For i = 0 To m.rowListContent.GetChildCount() - 1
        row = m.rowListContent.GetChild(i)
        If row <> Invalid
            For j = 0 To row.GetChildCount() - 1
                item = row.GetChild(j)
                If item <> Invalid
                    itemId = LCase(GF(item, "id", "").Trim())
                    movieKey = LCase(GF(item, "movieKey", "").Trim())
                    contentKey = LCase(GF(item, "contentId", "").Trim())
                    If itemId = searchId Or movieKey = searchId Or contentKey = searchId
                        Print "CrateTV [Home]: Deep link match (ID) - '" + GF(item, "title", "") + "'"
                        Return item
                    End If
                End If
            End For
        End If
    End For
    
    ' Pass 2: alias mapping for known ID mismatches
    ' Roku sends "Neighbours" but the feed has " Neighbors" (different spelling + space)
    aliasMap = CreateObject("roAssociativeArray")
    aliasMap["neighbours"] = "neighbors"
    aliasMap["theneighbours"] = "neighbors"
    aliasMap["theneighbors"] = "neighbors"
    
    searchAlias = searchId
    If aliasMap[searchId] <> Invalid Then searchAlias = aliasMap[searchId]
    
    For i = 0 To m.rowListContent.GetChildCount() - 1
        row = m.rowListContent.GetChild(i)
        If row <> Invalid
            For j = 0 To row.GetChildCount() - 1
                item = row.GetChild(j)
                If item <> Invalid
                    itemId = LCase(GF(item, "id", "").Trim())
                    movieKey = LCase(GF(item, "movieKey", "").Trim())
                    titleNorm = LCase(GF(item, "title", "").Trim())
                    
                    If itemId = searchAlias Or movieKey = searchAlias Or titleNorm = searchAlias
                        Print "CrateTV [Home]: Deep link match (alias) - '" + GF(item, "title", "") + "'"
                        Return item
                    End If
                    
                    ' Also check if title contains the search term
                    If Instr(1, titleNorm, searchAlias) > 0 Or Instr(1, titleNorm, searchId) > 0
                        Print "CrateTV [Home]: Deep link match (contains) - '" + GF(item, "title", "") + "'"
                        Return item
                    End If
                End If
            End For
        End If
    End For
    
    Print "CrateTV [Home]: No content found for ID '" + contentId + "'"
    Return Invalid
End Function

' =============================================================================
' UI STATES
' =============================================================================
Sub ShowLoading(message as String)
    m.loadingText.text = message
    m.loadingGroup.visible = true
    m.errorGroup.visible = false
    m.heroSpotlight.visible = false
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
    m.heroSpotlight.visible = false
    m.rowList.visible = false
End Sub

' =============================================================================
' KEY EVENT HANDLER (CRITICAL FOR CERTIFICATION)
' =============================================================================
' This function must ALWAYS allow directional keys to work
' Never trap focus - always allow users to navigate out
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    
    ' Error state - allow retry or exit
    If m.errorGroup.visible
        If key = "OK" Then LoadFeed() : Return true
        If key = "back" Then m.top.exitRequested = true : Return true
        Return true
    End If
    
    ' Loading state - consume all keys
    If m.loadingGroup.visible Then Return true
    
    ' Back button handling
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
    
    ' =========================================================================
    ' CRITICAL: Never consume directional keys
    ' =========================================================================
    ' Let directional keys (up/down/left/right) pass through to RowList
    ' This ensures focus never gets trapped (certification requirement)
    
    Return false
End Function


' =============================================================================
' TRAILER AUTOPLAY — plays muted in hero after 1.5s dwell, 30s max
' =============================================================================
Sub OnTrailerDwellFire()
    movie = m.currentFocusedForTrailer
    if movie = Invalid then return

    ' === EXACTLY LIKE THE WEB APP ===
    ' Web app uses fullMovie + trailerStart offset, NOT a separate trailer file.
    ' We do the same: play the full movie stream from trailerStart, stop after 30s.
    streamUrl = ""
    if movie.HasField("streamUrl") And movie.streamUrl <> Invalid And movie.streamUrl <> "" then streamUrl = movie.streamUrl
    if streamUrl = "" And movie.HasField("url") And movie.url <> Invalid then streamUrl = movie.url

    if streamUrl = ""
        Print "CrateTV [Trailer]: No stream URL for '" + movie.title + "' - skipping"
        return
    end if

    ' Check it is a direct video file (not YouTube/Vimeo)
    sLower = LCase(streamUrl)
    if Instr(1, sLower, "youtube") > 0 Or Instr(1, sLower, "youtu.be") > 0 Or Instr(1, sLower, "vimeo") > 0
        Print "CrateTV [Trailer]: Skipping non-direct URL for '" + movie.title + "'"
        return
    end if

    trailerContent = CreateObject("roSGNode", "ContentNode")
    trailerContent.url = streamUrl

    ' Detect format
    if Instr(1, sLower, ".m3u8") > 0
        trailerContent.streamFormat = "hls"
    else if Instr(1, sLower, ".mpd") > 0
        trailerContent.streamFormat = "dash"
    else
        trailerContent.streamFormat = "mp4"
    end if

    ' Seek to trailerStart — same as web app
    startSecs = 0
    if movie.HasField("trailerStart") And movie.trailerStart <> Invalid And movie.trailerStart > 0
        startSecs = movie.trailerStart
    end if
    if startSecs > 0
        trailerContent.bookmarkPosition = startSecs
    end if

    m.heroTrailer.content = trailerContent
    m.heroTrailer.visible = true
    m.heroTrailer.control = "play"
    if m.dynamicBackdrop <> Invalid then m.dynamicBackdrop.opacity = 0.0
    m.trailerStopTimer.control = "start"
    Print "CrateTV [Trailer]: Playing '" + movie.title + "' from " + Str(startSecs) + "s -> " + streamUrl
End Sub

Sub OnTrailerStopFire()
    StopTrailer()
End Sub

Sub OnTrailerStateChange()
    state = m.heroTrailer.state
    if state = "finished" Or state = "error"
        m.trailerStopTimer.control = "stop"
        StopTrailer()
    end if
End Sub

Sub StopTrailer()
    if m.trailerDwellTimer <> Invalid then m.trailerDwellTimer.control = "stop"
    if m.trailerStopTimer  <> Invalid then m.trailerStopTimer.control  = "stop"
    if m.heroTrailer <> Invalid
        m.heroTrailer.control  = "stop"
        m.heroTrailer.visible  = false
        m.heroTrailer.content  = Invalid
    end if
    if m.dynamicBackdrop <> Invalid then m.dynamicBackdrop.opacity = 0.3
    m.currentFocusedForTrailer = Invalid
End Sub

' =============================================================================
' UTILITIES
' =============================================================================
Function GF(node as Object, fieldName as String, fallback as String) as String
    If node = Invalid Then Return fallback
    If Not node.HasField(fieldName) Then Return fallback
    value = node[fieldName]
    If value = Invalid Then Return fallback
    If Type(value) = "roString" Or Type(value) = "String" Then Return value
    Return fallback
End Function

Function JoinArr(arr as Object, delimiter as String) as String
    If arr = Invalid Or arr.Count() = 0 Then Return ""
    result = ""
    For i = 0 To arr.Count() - 1
        If i > 0 Then result = result + delimiter
        result = result + arr[i]
    End For
    Return result
End Function
