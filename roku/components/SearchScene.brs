' ##############################################################################
' CRATE TV - Search Scene Controller
'
' Actor search uses ContentTask (Task node) for network I/O -- the only
' correct pattern for SceneGraph Group components. The render thread never
' touches roUrlTransfer directly.
'
' FLOW:
'   Type query -> local movie search (instant) + ContentTask actor search
'   ContentTask fires "searchActors" -> returns raw JSON in actorResults
'   OnActorSearchDone() parses JSON, builds actor cards prepended to grid
'   Focus actor card -> ShowActorPanel() with photo + bio
'   Select actor card -> m.top.showActorDetail = slug (MainScene opens ActorDetailScene)
' ##############################################################################

Sub Init()
    Print "CrateTV [Search]: Initializing..."

    m.searchInput       = m.top.FindNode("searchInput")
    m.searchPlaceholder = m.top.FindNode("searchPlaceholder")
    m.searchCursor      = m.top.FindNode("searchCursor")
    m.keyboardGrid      = m.top.FindNode("keyboardGrid")
    m.resultsGrid       = m.top.FindNode("resultsGrid")
    m.resultsLabel      = m.top.FindNode("resultsLabel")
    m.noResultsLabel    = m.top.FindNode("noResultsLabel")
    m.mobileTextBox     = m.top.FindNode("mobileTextBox")

    ' Actor panel nodes
    m.actorPanel      = m.top.FindNode("actorPanel")
    m.actorPanelPhoto = m.top.FindNode("actorPanelPhoto")
    m.actorPanelName  = m.top.FindNode("actorPanelName")
    m.actorPanelBio   = m.top.FindNode("actorPanelBio")
    m.bioScrollUp     = m.top.FindNode("bioScrollUp")
    m.bioScrollDown   = m.top.FindNode("bioScrollDown")
    m.bioLines        = []
    m.bioOffset       = 0
    m.BIO_PAGE        = 12
    m.fullBio         = ""

    m.keyboardDialog = Invalid

    ' Mobile keyboard bridge
    If m.mobileTextBox <> Invalid
        m.mobileTextBox.text = ""
        m.mobileTextBox.ObserveField("text", "OnMobileTextChange")
    End If

    m.query          = ""
    m.allMovies      = []
    m.topTenMovies   = []
    m.currentResults = []
    m.currentActors  = []
    m.allActors      = []
    m.actorProfileTask = Invalid
    m.loadedActorSlug  = ""

    m.focusZone = "keyboard"
    m.kbRow     = 0
    m.kbCol     = 0

    m.kbRows = []
    m.kbRows.Push(["A","B","C","D","E","F","G","H","I","J"])
    m.kbRows.Push(["K","L","M","N","O","P","Q","R","S","T"])
    m.kbRows.Push(["U","V","W","X","Y","Z","1","2","3","4"])
    m.kbRows.Push(["5","6","7","8","9","0","SPACE","DEL"])

    m.kbButtons = []
    BuildKeyboard()
    UpdateKeyboardFocus()

    ' Blinking cursor animation
    m.cursorAnim          = CreateObject("roSGNode", "Animation")
    m.cursorAnim.duration = 1.0
    m.cursorAnim.repeat   = true
    ci                    = m.cursorAnim.CreateChild("FloatFieldInterpolator")
    ci.fieldToInterp      = "searchCursor.opacity"
    ci.key                = [0.0, 0.49, 0.5, 1.0]
    ci.keyValue           = [1.0, 1.0, 0.0, 0.0]
    m.cursorAnim.control  = "start"

    ' PosterGrid: flat itemSelected/itemFocused integers, 5 columns
    m.COLS = 5
    m.lastFocusedItem = -1  ' Track previous focus for edge detection
    m.resultsGrid.ObserveField("itemSelected", "OnResultSelected")
    m.resultsGrid.ObserveField("itemFocused",  "OnResultFocused")
    m.top.ObserveField("focusedChild", "OnSceneFocusChange")
    m.keyboardAutoLaunched = false
End Sub

Sub OnSceneFocusChange()
    If m.top.IsInFocusChain()
        If m.focusZone = "results"
            m.resultsGrid.SetFocus(true)
        Else If m.focusZone = "keyboard"
            ' Give TextEditBox focus for Roku mobile app keyboard bridge
            If m.mobileTextBox <> Invalid
                m.mobileTextBox.SetFocus(true)
            End If
            ' Do NOT auto-launch keyboard dialog - let user use the on-screen A-Z keyboard
        End If
    End If
End Sub

' =============================================================================
' KEYBOARD BUILD
' =============================================================================
Sub BuildKeyboard()
    theme = GetThemeConfig()
    For rowIdx = 0 To m.kbRows.Count() - 1
        rowGroup              = CreateObject("roSGNode", "LayoutGroup")
        rowGroup.layoutDirection = "horiz"
        rowGroup.itemSpacings = [6]
        rowButtons            = []
        For colIdx = 0 To m.kbRows[rowIdx].Count() - 1
            keyLabel = m.kbRows[rowIdx][colIdx]
            btnGroup = CreateObject("roSGNode", "Group")
            btnWidth = 60
            If keyLabel = "SPACE" Then btnWidth = 126
            If keyLabel = "DEL"   Then btnWidth = 126
            bg        = CreateObject("roSGNode", "Rectangle")
            bg.width  = btnWidth
            bg.height = 56
            bg.color  = theme.SURFACE_LIGHT
            btnGroup.AppendChild(bg)
            lbl = CreateObject("roSGNode", "Label")
            If keyLabel = "SPACE"
                lbl.text = "SPACE"
                lbl.font = "font:SmallBoldSystemFont"
            Else If keyLabel = "DEL"
                lbl.text = "DELETE"
                lbl.font = "font:SmallBoldSystemFont"
            Else
                lbl.text = keyLabel
                lbl.font = "font:MediumBoldSystemFont"
            End If
            lbl.color      = "#FFFFFF"
            lbl.width      = btnWidth
            lbl.height     = 56
            lbl.horizAlign = "center"
            lbl.vertAlign  = "center"
            btnGroup.AppendChild(lbl)
            rowGroup.AppendChild(btnGroup)
            rowButtons.Push({group: btnGroup, bg: bg, label: lbl, key: keyLabel})
        End For
        m.keyboardGrid.AppendChild(rowGroup)
        m.kbButtons.Push(rowButtons)
    End For
End Sub

Sub UpdateKeyboardFocus()
    theme = GetThemeConfig()
    For rr = 0 To m.kbButtons.Count() - 1
        For cc = 0 To m.kbButtons[rr].Count() - 1
            btn = m.kbButtons[rr][cc]
            If rr = m.kbRow And cc = m.kbCol And m.focusZone = "keyboard"
                btn.bg.color = theme.PRIMARY_ACCENT
            Else
                btn.bg.color = theme.SURFACE_LIGHT
            End If
        End For
    End For
End Sub

' =============================================================================
' FOCUS ZONE SWITCHING
' =============================================================================
Sub SwitchToKeyboard()
    m.focusZone = "keyboard"
    m.resultsGrid.SetFocus(false)
    UpdateKeyboardFocus()
    HideActorPanel()
    ' Give focus to TextEditBox so Roku mobile app activates phone keyboard
    If m.mobileTextBox <> Invalid
        m.mobileTextBox.SetFocus(true)
    Else
        m.top.SetFocus(true)
    End If
End Sub

Sub SwitchToResults()
    ' Allow switching if there are results, actors, OR top movies showing
    gridContent = m.resultsGrid.content
    If gridContent = Invalid Or gridContent.GetChildCount() = 0
        ' No content in grid at all - stay on keyboard
        Return
    End If
    m.focusZone = "results"
    UpdateKeyboardFocus()
    m.resultsGrid.SetFocus(true)
End Sub

' =============================================================================
' ACTOR PANEL
' (ShowActorPanel and HideActorPanel defined below, after RenderBioPage)



' Render bio text cleanly.
' Key insight: do NOT manually wrap at character count -- that fights Roku Label
' wrapping and creates ugly mid-sentence breaks. Instead split only on real
' paragraph breaks (Chr(10) / Chr(13)) so each chunk is a natural paragraph,
' then let the Label with wrap=true handle word-wrapping automatically.
' Pagination scrolls by paragraph chunks, not by artificial line counts.
Sub RenderBioPage()
    If m.actorPanelBio = Invalid Then Return
    bio = m.fullBio
    If bio = Invalid Then bio = ""

    ' Normalise line endings then assign directly.
    ' Do NOT manually split/rejoin -- that fights Roku Label word-wrap
    ' and causes mid-sentence breaks. Let the Label handle it natively.
    bio = bio.Replace(Chr(13) + Chr(10), Chr(10))
    bio = bio.Replace(Chr(13), Chr(10))
    bio = bio.Trim()

    m.actorPanelBio.text = bio

    ' No manual pagination -- hide scroll arrows
    If m.bioScrollUp   <> Invalid Then m.bioScrollUp.visible   = false
    If m.bioScrollDown <> Invalid Then m.bioScrollDown.visible = false
End Sub

Sub ScrollBioUp()
    m.bioOffset = m.bioOffset - (m.BIO_PAGE - 2)
    If m.bioOffset < 0 Then m.bioOffset = 0
    RenderBioPage()
End Sub

Sub ScrollBioDown()
    maxOffset = m.bioLines.Count() - m.BIO_PAGE
    If maxOffset < 0 Then maxOffset = 0
    m.bioOffset = m.bioOffset + (m.BIO_PAGE - 2)
    If m.bioOffset > maxOffset Then m.bioOffset = maxOffset
    RenderBioPage()
End Sub

' =============================================================================
' MOBILE KEYBOARD TEXT SYNC
' Called whenever the hidden TextEditBox.text changes -- this fires for both
' ECP Lit_ keypresses (phone keyboard) AND physical remote key presses routed
' through AppendChar/DeleteChar below. Keeps m.query in sync automatically.
' =============================================================================
Sub OnMobileTextChange()
    If m.mobileTextBox = Invalid Then Return
    newText = m.mobileTextBox.text
    If newText = Invalid Then newText = ""
    ' Only update if text changed from outside (phone keyboard typed a char)
    If newText <> m.query
        m.query = newText
        UpdateSearchDisplay()
        ExecuteSearch()
    End If
End Sub

' =============================================================================
' FEED DATA - index movies + build Top 10
' =============================================================================
Sub OnFeedDataReady()
    feed = m.top.feedData
    If feed = Invalid Then Return

    Print "CrateTV [Search]: Processing feed with " + Str(feed.GetChildCount()) + " rows"

    m.allMovies    = []
    m.topTenMovies = []
    m.allActors    = []   ' {name, nameLower, photo, highResPhoto, slug}
    heroMovies     = []
    rankedMovies   = []
    actorSeen      = {}   ' dedupe by name

    allRows = []
    For i = 0 To feed.GetChildCount() - 1
        r = feed.GetChild(i)
        If r <> Invalid Then allRows.Push(r)
    End For

    For i = 0 To allRows.Count() - 1
        row      = allRows[i]
        rowTitle = ""
        If row.HasField("title") Then rowTitle = row.title
        rowType  = ""
        If row.HasField("rowType") Then rowType = row.rowType

        isHero = (rowTitle = "__hero__" Or rowType = "hero")

        If isHero
            For hj = 0 To row.GetChildCount() - 1
                hm = row.GetChild(hj)
                If hm <> Invalid And hm.HasField("title")
                    hmTitle = hm.title
                    If hmTitle = Invalid Then hmTitle = "Untitled"
                    heroMovies.Push({node: hm, searchText: LCase(hmTitle), title: hmTitle})
                    IndexCastFromMovie(hm, actorSeen)
                End If
            End For
        Else
            isRanked = false
            If rowType = "ranked" Then isRanked = true
            If Instr(1, LCase(rowTitle), "top 10") > 0 Then isRanked = true

            For j = 0 To row.GetChildCount() - 1
                movie = row.GetChild(j)
                If movie <> Invalid
                    mTitle = ""
                    If movie.HasField("title") Then mTitle = movie.title
                    If mTitle = "" Or mTitle = Invalid Then mTitle = "Untitled"

                    searchText = LCase(mTitle)
                    If movie.HasField("director") And movie.director <> Invalid
                        searchText = searchText + " " + LCase(movie.director)
                    End If
                    If movie.HasField("cast") And movie.cast <> Invalid
                        searchText = searchText + " " + LCase(movie.cast)
                    End If
                    If movie.HasField("genres") And movie.genres <> Invalid
                        searchText = searchText + " " + LCase(movie.genres)
                    End If

                    entry = {node: movie, searchText: searchText, title: mTitle}
                    m.allMovies.Push(entry)
                    If isRanked Then rankedMovies.Push(entry)
                    IndexCastFromMovie(movie, actorSeen)
                End If
            End For
        End If
    End For

    ' Build Top 10
    topSeen = {}
    For i = 0 To heroMovies.Count() - 1
        If m.topTenMovies.Count() >= 10 Then Exit For
        hKey = LCase(heroMovies[i].title)
        If Not topSeen.DoesExist(hKey)
            topSeen[hKey] = true
            m.topTenMovies.Push(heroMovies[i])
        End If
    End For
    For i = 0 To rankedMovies.Count() - 1
        If m.topTenMovies.Count() >= 10 Then Exit For
        rKey = LCase(rankedMovies[i].title)
        If Not topSeen.DoesExist(rKey)
            topSeen[rKey] = true
            m.topTenMovies.Push(rankedMovies[i])
        End If
    End For
    If m.topTenMovies.Count() < 10
        priorityCats = ["New Releases", "Now Streaming", "Award-Winning Films", "Featured Films"]
        For pi = 0 To priorityCats.Count() - 1
            If m.topTenMovies.Count() >= 10 Then Exit For
            catName = priorityCats[pi]
            For ri = 0 To allRows.Count() - 1
                If m.topTenMovies.Count() >= 10 Then Exit For
                row = allRows[ri]
                rowTitle = ""
                If row.HasField("title") Then rowTitle = row.title
                If rowTitle = catName
                    For j = 0 To row.GetChildCount() - 1
                        If m.topTenMovies.Count() >= 10 Then Exit For
                        movie = row.GetChild(j)
                        If movie <> Invalid And movie.HasField("title")
                            mTitle = movie.title
                            If mTitle = Invalid Then mTitle = ""
                            If Not topSeen.DoesExist(LCase(mTitle))
                                topSeen[LCase(mTitle)] = true
                                m.topTenMovies.Push({node: movie, searchText: "", title: mTitle})
                            End If
                        End If
                    End For
                End If
            End For
        End For
    End If
    If m.topTenMovies.Count() < 10
        For i = 0 To m.allMovies.Count() - 1
            If m.topTenMovies.Count() >= 10 Then Exit For
            mTitle = m.allMovies[i].title
            If Not topSeen.DoesExist(LCase(mTitle))
                topSeen[LCase(mTitle)] = true
                m.topTenMovies.Push(m.allMovies[i])
            End If
        End For
    End If

    seen   = {}
    unique = []
    For i = 0 To m.allMovies.Count() - 1
        key = LCase(m.allMovies[i].title)
        If Not seen.DoesExist(key)
            seen[key] = true
            unique.Push(m.allMovies[i])
        End If
    End For
    m.allMovies = unique

    Print "CrateTV [Search]: Indexed " + Str(m.allMovies.Count()) + " movies, " + Str(m.allActors.Count()) + " actors"
    ShowTopMovies()
End Sub

Sub IndexCastFromMovie(movieNode as Object, actorSeen as Object)
    If movieNode = Invalid Then Return
    ' Prefer castJson -- full objects with photo/bio/slug saved by ContentTask
    If movieNode.HasField("castJson") And movieNode.castJson <> Invalid And movieNode.castJson <> "" And movieNode.castJson <> "[]"
        castArray = ParseJson(movieNode.castJson)
        If castArray <> Invalid And Type(castArray) = "roArray"
            For i = 0 To castArray.Count() - 1
                cm = castArray[i]
                If cm = Invalid Then Continue For
                nm = ""
                If cm.DoesExist("name") And cm.name <> Invalid Then nm = cm.name.Trim()
                If nm = "" Then Continue For
                key = LCase(nm)
                If actorSeen.DoesExist(key) Then Continue For
                actorSeen[key] = true
                slug = ""
                If cm.DoesExist("slug") And cm.slug <> ""
                    slug = cm.slug
                Else
                    slug = key.Replace(" ", "-")
                End If
                photo = ""
                If cm.DoesExist("photo") And cm.photo <> Invalid Then photo = cm.photo
                hiRes = ""
                If cm.DoesExist("highResPhoto") And cm.highResPhoto <> Invalid Then hiRes = cm.highResPhoto
                bio = ""
                If cm.DoesExist("bio") And cm.bio <> Invalid Then bio = cm.bio
                m.allActors.Push({name: nm, nameLower: key, slug: slug, photo: photo, highResPhoto: hiRes, bio: bio})
            End For
            Return
        End If
    End If
    ' Fallback: castJson absent -- use comma-separated names only (no photo)
    If Not movieNode.HasField("cast") Then Return
    castStr = movieNode.cast
    If castStr = Invalid Or castStr = "" Then Return
    castNames = castStr.Split(",")
    For i = 0 To castNames.Count() - 1
        nm = castNames[i].Trim()
        If nm = "" Then Continue For
        key = LCase(nm)
        If actorSeen.DoesExist(key) Then Continue For
        actorSeen[key] = true
        slug = key.Replace(" ", "-")
        m.allActors.Push({name: nm, nameLower: key, slug: slug, photo: "", highResPhoto: "", bio: ""})
    End For
End Sub

' =============================================================================
' DISPLAY
' =============================================================================
Sub ShowTopMovies()
    m.resultsLabel.text      = "Top Movies"
    m.noResultsLabel.visible = false
    m.currentResults         = m.topTenMovies
    m.currentActors          = []
    HideActorPanel()

    content = CreateObject("roSGNode", "ContentNode")
    For i = 0 To m.topTenMovies.Count() - 1
        item  = m.topTenMovies[i]
        child = CreateObject("roSGNode", "ContentNode")
        child.title = ""
        posterUrl   = GetPosterUrl(item.node)
        child.HDPosterUrl = posterUrl
        child.SDPosterUrl = posterUrl
        child.shortDescriptionLine1 = "movie:" + Str(i).Trim()
        content.AppendChild(child)
    End For

    m.resultsGrid.content = content
    m.resultsGrid.visible = true
End Sub

Sub ExecuteSearch()
    q = LCase(m.query)
    If q = ""
        m.currentActors = []
        HideActorPanel()
        ShowTopMovies()
        Return
    End If

    m.resultsLabel.text = "Results for """ + m.query + """"

    ' Actor search -- instant, local index from feed cast data
    actorResults = []
    For i = 0 To m.allActors.Count() - 1
        If Instr(1, m.allActors[i].nameLower, q) > 0
            actorResults.Push(m.allActors[i])
        End If
    End For

    ' Movie search -- instant, local index
    movieResults = []
    For i = 0 To m.allMovies.Count() - 1
        If Instr(1, m.allMovies[i].searchText, q) > 0
            movieResults.Push(m.allMovies[i])
        End If
    End For

    m.currentActors  = actorResults
    m.currentResults = movieResults
    HideActorPanel()
    RenderGrid(actorResults, movieResults)
End Sub

' Build flat interleaved content for PosterGrid (actors + movies mixed).
Sub RenderGrid(actors as Object, movies as Object)
    nA = actors.Count()
    nM = movies.Count()
    If nA = 0 And nM = 0
        m.noResultsLabel.visible = true
        m.noResultsLabel.text    = "No results for """ + m.query + """"
        m.resultsGrid.content    = CreateObject("roSGNode", "ContentNode")
        Return
    End If
    m.noResultsLabel.visible = false
    content = CreateObject("roSGNode", "ContentNode")
    ai = 0
    mi = 0
    While ai < nA Or mi < nM
        If ai < nA
            actor = actors[ai]
            child = CreateObject("roSGNode", "ContentNode")
            child.title = ""
            photoUrl = ""
            If actor.DoesExist("highResPhoto") And actor.highResPhoto <> "" Then photoUrl = actor.highResPhoto
            If photoUrl = "" And actor.DoesExist("photo") And actor.photo <> "" Then photoUrl = actor.photo
            child.HDPosterUrl = photoUrl
            child.SDPosterUrl = photoUrl
            child.shortDescriptionLine1 = "actor:" + actor.slug
            content.AppendChild(child)
            ai = ai + 1
        End If
        If mi < nM
            child = CreateObject("roSGNode", "ContentNode")
            child.title = ""
            url = GetPosterUrl(movies[mi].node)
            child.HDPosterUrl = url
            child.SDPosterUrl = url
            child.shortDescriptionLine1 = "movie:" + Str(mi).Trim()
            content.AppendChild(child)
            mi = mi + 1
        End If
    End While
    m.resultsGrid.content = content
End Sub

Function GetPosterUrl(movieNode as Object) as String
    posterUrl = ""
    If movieNode.HasField("posterUrl") And movieNode.posterUrl <> Invalid
        posterUrl = movieNode.posterUrl
    End If
    If posterUrl = "" And movieNode.HasField("HDPosterUrl") And movieNode.HDPosterUrl <> Invalid
        posterUrl = movieNode.HDPosterUrl
    End If
    Return posterUrl
End Function

' =============================================================================
' ACTOR PROFILE -- fetched via ContentTask on focus only (not every keystroke)
' API: GET /api/get-public-actor-profile?slug=<slug>
' Response: { profile: { name, bio, photo, highResPhoto, ... }, films: [...] }
' =============================================================================
Sub FetchActorProfile(slug as String)
    ' Always cancel any in-flight task for a different slug
    If m.actorProfileTask <> Invalid
        m.actorProfileTask.control = "stop"
        m.actorProfileTask = Invalid
    End If

    ' If already cached, just re-show the panel -- no network call needed
    If slug = m.loadedActorSlug
        ' Find the actor in m.currentActors by slug and re-render panel
        For i = 0 To m.currentActors.Count() - 1
            If m.currentActors[i].slug = slug
                ShowActorPanel(m.currentActors[i])
                Return
            End If
        End For
        Return
    End If

    m.loadedActorSlug = slug
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType    = "fetchActorProfile"
    task.searchQuery = slug   ' slug also used by OnActorProfileDone to match result
    task.ObserveField("taskStatus", "OnActorProfileDone")
    task.control = "run"
    m.actorProfileTask = task
    Print "CrateTV [Search]: Fetching actor profile slug=" + slug
End Sub

Sub OnActorProfileDone()
    task = m.actorProfileTask
    If task = Invalid Then Return
    If task.taskStatus = "running" Then Return

    If task.taskStatus = "success" And task.actorResults <> Invalid And task.actorResults <> ""
        json = ParseJson(task.actorResults)
        If json <> Invalid And json.DoesExist("profile") And json.profile <> Invalid
            profile    = json.profile
            ' Read the slug the task was launched with -- NOT itemFocused.
            ' itemFocused is a grid position in an interleaved actor+movie grid
            ' and cannot be used as an actor array index.
            taskSlug = ""
            If task.HasField("searchQuery") And task.searchQuery <> Invalid
                taskSlug = task.searchQuery
            End If

            ' Find the matching actor in m.currentActors by slug
            For i = 0 To m.currentActors.Count() - 1
                If m.currentActors[i].slug = taskSlug
                    actor = m.currentActors[i]
                    If profile.DoesExist("bio") And profile.bio <> Invalid Then actor.bio = profile.bio
                    If profile.DoesExist("photo") And profile.photo <> Invalid Then actor.photo = profile.photo
                    If profile.DoesExist("highResPhoto") And profile.highResPhoto <> Invalid Then actor.highResPhoto = profile.highResPhoto
                    m.currentActors[i] = actor

                    ' Only update panel if this actor is still the one focused
                    focusedContent = m.resultsGrid.content
                    focusedIdx     = m.resultsGrid.itemFocused
                    panelSlug      = ""
                    If focusedContent <> Invalid And focusedIdx >= 0 And focusedIdx < focusedContent.GetChildCount()
                        focusedCard = focusedContent.GetChild(focusedIdx)
                        If focusedCard <> Invalid And focusedCard.HasField("shortDescriptionLine1")
                            tag = focusedCard.shortDescriptionLine1
                            If Left(tag, 6) = "actor:" Then panelSlug = Mid(tag, 7)
                        End If
                    End If
                    If panelSlug = taskSlug Then ShowActorPanel(actor)
                    Exit For
                End If
            End For
        End If
    End If

    m.actorProfileTask = Invalid
End Sub

Sub StopActorSearch()
    If m.actorProfileTask <> Invalid
        m.actorProfileTask.control = "stop"
        m.actorProfileTask = Invalid
    End If
    m.loadedActorSlug = ""
End Sub


' =============================================================================
' RESULT EVENTS -- PosterGrid: flat integer itemSelected/itemFocused
' =============================================================================
Sub OnResultSelected()
    idx = m.resultsGrid.itemSelected
    If idx < 0 Then Return
    gridContent = m.resultsGrid.content
    If gridContent = Invalid Or idx >= gridContent.GetChildCount() Then Return
    node = gridContent.GetChild(idx)
    If node = Invalid Then Return
    tag = ""
    If node.HasField("shortDescriptionLine1") Then tag = node.shortDescriptionLine1
    If Left(tag, 6) = "actor:"
        slug = Mid(tag, 7)
        If slug <> "" And slug <> Invalid Then m.top.showActorDetail = slug
    Else If Left(tag, 6) = "movie:"
        movieIdx = Val(Mid(tag, 7))
        If movieIdx >= 0 And movieIdx < m.currentResults.Count()
            m.top.playContent = m.currentResults[movieIdx].node
        End If
    End If
End Sub

Sub OnResultFocused()
    idx = m.resultsGrid.itemFocused
    If idx < 0 Then Return
    gridContent = m.resultsGrid.content
    If gridContent = Invalid Or idx >= gridContent.GetChildCount() Then Return
    node = gridContent.GetChild(idx)
    If node = Invalid Then Return
    tag = ""
    If node.HasField("shortDescriptionLine1") Then tag = node.shortDescriptionLine1
    If Left(tag, 6) = "actor:"
        slug = Mid(tag, 7)
        actor = Invalid
        For i = 0 To m.currentActors.Count() - 1
            If m.currentActors[i].slug = slug
                actor = m.currentActors[i]
                Exit For
            End If
        End For
        If actor <> Invalid
            ShowActorPanel(actor)
            If slug <> "" Then FetchActorProfile(slug)
        End If
    Else
        HideActorPanel()
    End If
End Sub

' ShowActorPanel and HideActorPanel restored to original simple panel
Sub ShowActorPanel(actor as Object)
    If m.actorPanel = Invalid Then Return
    name = ""
    If actor.DoesExist("name") And actor.name <> Invalid Then name = actor.name
    m.actorPanelName.text = name
    bio = ""
    If actor.DoesExist("bio") And actor.bio <> Invalid Then bio = actor.bio
    If bio = "" And actor.DoesExist("biography") And actor.biography <> Invalid Then bio = actor.biography
    If bio = "" Then bio = "Loading..."
    m.fullBio   = bio
    m.bioOffset = 0
    RenderBioPage()
    photoUrl = ""
    If actor.DoesExist("highResPhoto") And actor.highResPhoto <> Invalid And actor.highResPhoto <> ""
        photoUrl = actor.highResPhoto
    Else If actor.DoesExist("photo") And actor.photo <> Invalid And actor.photo <> ""
        photoUrl = actor.photo
    End If
    If photoUrl <> "" And (Instr(1, photoUrl, ".s3.") > 0 Or Instr(1, photoUrl, ".amazonaws.com") > 0)
        photoUrl = "https://cratetv.net/api/proxy-image?url=" + photoUrl
    End If
    m.actorPanelPhoto.uri = photoUrl
    m.actorPanel.visible = true
End Sub

Sub HideActorPanel()
    If m.actorPanel <> Invalid Then m.actorPanel.visible = false
End Sub

Sub AppendChar(c as String)
    m.query = m.query + c
    ' Sync TextEditBox so phone keyboard shows current text
    If m.mobileTextBox <> Invalid Then m.mobileTextBox.text = m.query
    UpdateSearchDisplay()
    ExecuteSearch()
End Sub

Sub DeleteChar()
    If Len(m.query) > 0
        m.query = Left(m.query, Len(m.query) - 1)
        ' Sync TextEditBox so phone keyboard shows current text
        If m.mobileTextBox <> Invalid Then m.mobileTextBox.text = m.query
        UpdateSearchDisplay()
        ExecuteSearch()
    End If
End Sub

Sub UpdateSearchDisplay()
    m.searchInput.text          = m.query
    m.searchPlaceholder.visible = (m.query = "")
    cursorX                     = 20 + Len(m.query) * 13
    m.searchCursor.translation  = [cursorX, 15]
End Sub

' =============================================================================
' MOBILE KEYBOARD
' =============================================================================
Sub LaunchMobileKeyboard()
    Print "CrateTV [Search]: Launching mobile keyboard"
    m.keyboardDialog         = CreateObject("roSGNode", "StandardKeyboardDialog")
    m.keyboardDialog.title   = "Search Movies"
    m.keyboardDialog.text    = m.query
    m.keyboardDialog.buttons = ["OK", "Cancel"]
    m.keyboardDialog.ObserveField("buttonSelected", "OnMobileKeyboardButton")
    scene = m.top.GetScene()
    If scene <> Invalid
        scene.dialog = m.keyboardDialog
    End If
End Sub

Sub OnMobileKeyboardButton()
    If m.keyboardDialog = Invalid Then Return
    buttonIndex = m.keyboardDialog.buttonSelected
    If buttonIndex = 0
        newText = m.keyboardDialog.text
        If newText <> Invalid And newText <> ""
            m.query = newText
            UpdateSearchDisplay()
            ExecuteSearch()
        End If
    End If
    scene = m.top.GetScene()
    If scene <> Invalid Then scene.dialog = Invalid
    m.keyboardDialog = Invalid
    If m.focusZone = "keyboard"
        m.top.SetFocus(true)
    Else If m.focusZone = "results"
        m.resultsGrid.SetFocus(true)
    End If
End Sub

' =============================================================================
' KEY HANDLING
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false

    If key = "back"
        If m.focusZone = "results"
            SwitchToKeyboard()
            Return true
        End If
        If m.query <> ""
            m.query = ""
            UpdateSearchDisplay()
            StopActorSearch()
            m.currentActors = []
            HideActorPanel()
            ShowTopMovies()
            Return true
        End If
        m.top.exitRequested = true
        Return true
    End If

    If m.focusZone = "keyboard"
        If key = "play" Or key = "*"
            LaunchMobileKeyboard()
            Return true
        End If
        If key = "OK"
            If m.kbRow < m.kbButtons.Count() And m.kbCol < m.kbButtons[m.kbRow].Count()
                btn = m.kbButtons[m.kbRow][m.kbCol]
                If btn.key = "DEL"
                    DeleteChar()
                Else If btn.key = "SPACE"
                    AppendChar(" ")
                Else
                    AppendChar(LCase(btn.key))
                End If
            End If
            Return true
        End If
        If key = "up"
            If m.kbRow > 0
                m.kbRow = m.kbRow - 1
                If m.kbCol >= m.kbButtons[m.kbRow].Count()
                    m.kbCol = m.kbButtons[m.kbRow].Count() - 1
                End If
                UpdateKeyboardFocus()
            Else
                m.top.exitRequested = true
            End If
            Return true
        End If
        If key = "down"
            If m.kbRow < m.kbButtons.Count() - 1
                m.kbRow = m.kbRow + 1
                If m.kbCol >= m.kbButtons[m.kbRow].Count()
                    m.kbCol = m.kbButtons[m.kbRow].Count() - 1
                End If
                UpdateKeyboardFocus()
            End If
            Return true
        End If
        If key = "left"
            If m.kbCol > 0 Then m.kbCol = m.kbCol - 1
            UpdateKeyboardFocus()
            Return true
        End If
        If key = "right"
            If m.kbCol < m.kbButtons[m.kbRow].Count() - 1
                m.kbCol = m.kbCol + 1
                UpdateKeyboardFocus()
            Else
                SwitchToResults()
            End If
            Return true
        End If
        Return true
    End If

    If m.focusZone = "results"
        If key = "play" Or key = "*"
            LaunchMobileKeyboard()
            Return true
        End If
        If key = "left"
            ' Col 0 of any row -> back to keyboard
            focused = m.resultsGrid.itemFocused
            If focused < 0 Then focused = 0
            If (focused Mod m.COLS) = 0
                SwitchToKeyboard()
                Return true
            End If
            Return false
        End If
        If key = "up"
            ' Top row (items 0 to COLS-1) -> go to nav bar (Netflix pattern)
            focused = m.resultsGrid.itemFocused
            If focused < 0 Then focused = 0
            currentRow = Int(focused / m.COLS)
            Print "CrateTV [Search]: UP pressed, focused=" + Str(focused) + ", row=" + Str(currentRow)
            If currentRow = 0
                Print "CrateTV [Search]: At top row - exiting to nav bar"
                m.top.exitRequested = true
                Return true
            End If
            ' Not at top row - let PosterGrid handle internal navigation
            Return false
        End If
        If key = "OK"    Then Return false
        If key = "right" Then Return false
        If key = "down"  Then Return false
        Return false  ' Changed from Return true - let other keys pass through
    End If

    Return false
End Function
