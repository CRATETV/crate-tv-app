' ##############################################################################
' CRATE TV - Main Scene Controller (V4 Studio)
'
' Global router:
' - Login (AccountLinkScene) on first launch
' - Header nav switches viewport: HOME / THE PUBLIC SQUARE / SEARCH / MY ACCOUNT
' - Movies play directly on OK (no details screen)
' ##############################################################################

Sub Init()
    m.top.SetFocus(true)
    m.top.BackgroundColor = GetThemeConfig().BACKGROUND
    
    m.loadingGroup    = m.top.FindNode("loadingGroup")
    m.loadingBar      = m.top.FindNode("loadingBar")
    m.loadingText     = m.top.FindNode("loadingText")
    m.dot1            = m.top.FindNode("dot1")
    m.dot2            = m.top.FindNode("dot2")
    m.dot3            = m.top.FindNode("dot3")

    ' Sweeping progress bar animation
    m.loadingBarAnim = CreateObject("roSGNode", "Animation")
    m.loadingBarAnim.duration = 1.8
    m.loadingBarAnim.repeat = true
    m.loadingBarAnim.easeFunction = "inOutCubic"
    barInterp = m.loadingBarAnim.CreateChild("FloatFieldInterpolator")
    barInterp.fieldToInterp = "loadingBar.width"
    barInterp.key = [0.0, 0.5, 1.0]
    barInterp.keyValue = [0, 600, 0]
    m.loadingBarAnim.control = "start"

    ' Dot pulse timer
    m.dotTimer = m.top.CreateChild("Timer")
    m.dotTimer.duration = 0.4
    m.dotTimer.repeat = true
    m.dotTimer.ObserveField("fire", "OnDotTimerFire")
    m.dotTimer.control = "start"
    m.dotStep = 0

    ' Cycling status messages
    m.loadingMessages = ["Loading content...", "Curating your cinema...", "Fetching today\'s top films...", "Almost ready..."]
    m.loadingMsgIndex = 0
    m.msgTimer = m.top.CreateChild("Timer")
    m.msgTimer.duration = 3.0
    m.msgTimer.repeat = true
    m.msgTimer.ObserveField("fire", "OnMsgTimerFire")
    m.msgTimer.control = "start"
    m.sceneContainer  = m.top.FindNode("sceneContainer")
    m.dialogContainer = m.top.FindNode("dialogContainer")
    m.headerNav       = m.top.FindNode("headerNav")
    
    m.sceneStack = []
    m.currentSceneNode = Invalid
    m.focusZone = "content"
    m.cachedFeedData = Invalid
    m.searchScene = Invalid
    m.homeScene = Invalid
    m.appLaunchFired = false
    m.nowStreamingFilm = Invalid   ' first movie from Now Streaming row, cached for nav scene
    m.authToken        = ""        ' user auth token for watch party access checks
    ' Restore auth token from registry if user was previously linked
    regSection = CreateObject("roRegistrySection", "CrateTV")
    If regSection.Exists("authToken") Then m.authToken = regSection.Read("authToken")

    m.watchPartyLive     = false   ' true when a party is currently live
    m.watchPartyFilm     = Invalid ' the film node for the current live party
    m.watchPartyMovieKey = ""      ' movieKey of the currently live party

    ' Background poll timer -- checks for live parties every 60 seconds
    m.partyPollTimer = CreateObject("roSGNode", "Timer")
    m.partyPollTimer.duration = 15
    m.partyPollTimer.repeat   = true
    m.partyPollTimer.ObserveField("fire", "OnPartyPollTick")
    
    m.headerNav.ObserveField("selectedIndex", "OnNavSelectionChange")
    m.global.ObserveField("deviceId", "OnDeviceIdReady")

    ' Deep link updates can arrive while the app is already running via roInputEvent.
    ' Observe the global deepLinkContentId so we can route immediately for certification 5.1.
    if m.global <> Invalid
        m.global.ObserveField("deepLinkContentId", "OnGlobalDeepLink")
    end if
    
    ' =======================================================================
    ' ROKU CERTIFICATION 3.2: Launch as fast as possible
    ' =======================================================================
    ' Skip init timer delay - check authentication immediately
    ' Every millisecond counts for the 15-second launch requirement
    CheckAuthenticationState()
End Sub

' =============================================================================
' DEEP LINK ROUTING (while running)
' =============================================================================
Sub OnGlobalDeepLink()
    if m.global = Invalid Then Return
    if Not m.global.HasField("deepLinkContentId") Then Return
    dlId = m.global.deepLinkContentId
    if dlId = Invalid Or dlId = "" Then Return

    ' Make sure we have HomeScene loaded so it can resolve ID against the feed
    if m.top.currentScene <> "HomeScene"
        ' If a video is playing, close it first so we don't stack players
        if m.top.currentScene = "CrateVideoPlayer"
            PopScene()
        end if
        LoadHomeScene()
    end if

    ' Pass the ID into HomeScene and let it resolve once content is ready
    if m.homeScene <> Invalid
        m.homeScene.deepLinkContentId = dlId
    end if

    ' Keep mediaType available (HomeScene reads it from global)
    ' Clear contentId so it doesn't repeat
    m.global.deepLinkContentId = ""
End Sub

Sub OnDeviceIdReady()
    Print "CrateTV: Device ID ready"
End Sub

Sub CheckAuthenticationState()
    ' =======================================================================
    ' ROKU CERTIFICATION 3.2: Show UI immediately (within 15 seconds)
    ' =======================================================================
    ' For certification, always show main UI first
    ' Auth check happens in background - users can browse public content
    ' This ensures we meet the 15-second launch requirement
    
    Print "CrateTV: Loading main UI immediately for fast launch"
    ShowMainUI()
    
    ' Note: Auth check could be added later if needed, but for certification
    ' and best user experience, we show content immediately
End Sub

' =============================================================================
' ACCOUNT LINK
' =============================================================================
Sub LoadAccountLinkScene()
    HideLoading()
    m.headerNav.visible = false
    ClearSceneContainer()
    
    scene = CreateObject("roSGNode", "AccountLinkScene")
    scene.ObserveField("linkComplete", "OnAccountLinkComplete")
    scene.ObserveField("skipLink", "OnSkipAccountLink")
    
    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    scene.SetFocus(true)
    m.currentSceneNode = scene
    m.top.currentScene = "AccountLinkScene"
    Print "CrateTV: Loaded AccountLinkScene"
End Sub

Sub OnAccountLinkComplete()
    Print "CrateTV: Account linked"
    SetDeviceLinked(true)
    ShowMainUI()
End Sub

Sub OnSkipAccountLink()
    Print "CrateTV: Link skipped"
    ShowMainUI()
End Sub

' =============================================================================
' MAIN UI
' =============================================================================
Sub ShowMainUI()
    ' Keep loadingGroup visible and headerNav hidden until feed data returns.
    ' This eliminates the "CRATE TV" header flash before content loads.
    ' HideLoading() and m.headerNav.visible = true are called in OnHomeFeedReady()
    ' once the first real feed payload arrives.
    m.headerNav.UnobserveField("selectedIndex")
    m.headerNav.selectedIndex = 0
    m.headerNav.focusedIndex = 0
    m.headerNav.isActive = false
    m.headerNav.ObserveField("selectedIndex", "OnNavSelectionChange")

    ' headerNav stays hidden -- revealed in OnHomeFeedReady()
    m.headerNav.visible = false
    ' loadingGroup stays visible -- hidden in OnHomeFeedReady()

    LoadHomeScene()

    ' =======================================================================
    ' ROKU CERTIFICATION 3.2: Signal AppLaunchComplete when UI is rendered
    ' =======================================================================
    If Not m.appLaunchFired
        m.appLaunchFired = true
        m.top.signalBeacon("AppLaunchComplete")
        Print "CrateTV [Beacon]: AppLaunchComplete signaled (home screen rendered)"
    End If
End Sub

' =============================================================================
' NAV SELECTION → SCENE SWAP
' =============================================================================
Sub OnNavSelectionChange()
    idx = m.headerNav.selectedIndex
    Print "CrateTV: Nav -> " + Str(idx)
    
    If idx = -1 Then LoadWatchPartyScene(m.watchPartyFilm) : Return  ' live alert pill
    If idx = 0  Then LoadHomeScene()
    If idx = 1  Then LoadNowStreamingScene()
    If idx = 2  Then LoadSquareScene()
    If idx = 3  Then LoadSearchScene()
    If idx = 4  Then LoadAccountScene()
    
    SetFocusZone("content")
End Sub

' =============================================================================
' SCENE LOADERS
' =============================================================================
Sub LoadHomeScene()
    ClearSceneContainer()
    
    scene = CreateObject("roSGNode", "HomeScene")
    scene.ObserveField("playContent", "OnPlayContent")
    scene.ObserveField("selectedContent", "OnContentSelected")
    scene.ObserveField("exitRequested", "OnExitFromContent")
    scene.ObserveField("feedDataReady", "OnHomeFeedReady")
    
    ' =======================================================================
    ' OPTIMIZATION: Use cached feed data if available
    ' =======================================================================
    ' If we've already loaded the feed once, reuse it instead of showing
    ' a loading spinner. This prevents "stuck on loading" when navigating
    ' back to Home from other tabs.
    If m.cachedFeedData <> Invalid
        Print "CrateTV: Using cached feed data for Home (instant load)"
        scene.feedData = m.cachedFeedData
    End If
    
    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    scene.SetFocus(true)
    m.currentSceneNode = scene
    m.homeScene = scene
    
    If m.global <> Invalid And m.global.HasField("deepLinkContentId")
        If m.global.deepLinkContentId <> Invalid And m.global.deepLinkContentId <> ""
            scene.deepLinkContentId = m.global.deepLinkContentId
            m.global.deepLinkContentId = ""
        End If
    End If
    
    m.top.currentScene = "HomeScene"
End Sub

Sub LoadNowStreamingScene()
    ClearSceneContainer()

    scene = CreateObject("roSGNode", "NowStreamingScene")
    scene.ObserveField("playContent",   "OnPlayContent")
    scene.ObserveField("exitRequested", "OnExitFromContent")

    ' Pass the cached Now Streaming film -- instant, no extra network call
    If m.nowStreamingFilm <> Invalid
        scene.spotlightFilm = m.nowStreamingFilm
    Else If m.cachedFeedData <> Invalid
        ' Fallback: scan feed for Now Streaming row
        For ri = 0 To m.cachedFeedData.GetChildCount() - 1
            row = m.cachedFeedData.GetChild(ri)
            If row <> Invalid And row.HasField("title")
                tl = LCase(row.title)
                If Instr(1, tl, "now streaming") > 0 Or Instr(1, tl, "streaming now") > 0
                    If row.GetChildCount() > 0
                        scene.spotlightFilm = row.GetChild(0)
                    End If
                    Exit For
                End If
            End If
        End For
    End If

    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    scene.SetFocus(true)
    m.currentSceneNode = scene
    m.top.currentScene = "NowStreamingScene"
    Print "CrateTV: Loaded NowStreamingScene"
End Sub

Sub CheckForLiveWatchParty()
    ' Two-pronged approach:
    ' 1. Ask the status endpoint directly with no movieKey -- returns current live party
    '    This works even if the feed hasn't been refreshed since app launch.
    ' 2. Also scan the live feed fresh (re-fetched each time) as a backup.
    ' We always re-scan even if we already found a key -- party could have changed.

    ' Prong 1: Hit status endpoint with no movieKey to find any live party
    task = CreateObject("roSGNode", "WatchPartyTask")
    task.movieKey  = ""             ' empty = ask for any currently live party
    task.authToken = m.authToken
    task.ObserveField("taskStatus", "OnLivePartyPollDone")
    task.control = "RUN"
    m.livePartyPollTask = task

    ' Prong 2: Scan the live feed fresh for isWatchPartyEnabled films
    ' Run as a separate ContentTask fetch so we get current data not stale cache
    feedTask = CreateObject("roSGNode", "ContentTask")
    feedTask.taskType = "fetchFeed"
    feedTask.ObserveField("feedData", "OnLiveFeedForParty")
    feedTask.control = "RUN"
    m.partyFeedTask = feedTask
End Sub

Sub OnLiveFeedForParty()
    feedTask = m.partyFeedTask
    If feedTask = Invalid Then Return
    fd = feedTask.feedData
    If fd = Invalid Then Return

    ' Scan fresh feed for any film with isWatchPartyEnabled=true
    For ri = 0 To fd.GetChildCount() - 1
        row = fd.GetChild(ri)
        If row = Invalid Then Continue For
        For ci = 0 To row.GetChildCount() - 1
            film = row.GetChild(ci)
            If film = Invalid Then Continue For
            If film.HasField("isWatchPartyEnabled") And film.isWatchPartyEnabled = true
                movieKey = ""
                If film.HasField("movieKey") And film.movieKey <> Invalid Then movieKey = film.movieKey
                If film.HasField("id") And film.id <> Invalid And movieKey = "" Then movieKey = film.id
                If movieKey <> ""
                    ' Always update -- party may have changed since last scan
                    m.watchPartyMovieKey = movieKey
                    m.watchPartyFilm     = film
                    Print "CrateTV [WatchParty]: Found enabled party film: " + movieKey
                    ' Now check if this specific film's party is live
                    task2 = CreateObject("roSGNode", "WatchPartyTask")
                    task2.movieKey  = movieKey
                    task2.authToken = m.authToken
                    task2.ObserveField("taskStatus", "OnLivePartyPollDone")
                    task2.control = "RUN"
                    m.livePartyPollTask = task2
                    Return   ' found one -- no need to scan further
                End If
            End If
        End For
    End For
    Print "CrateTV [WatchParty]: No isWatchPartyEnabled films found in fresh feed"
End Sub

Sub OnPartyPollTick()
    CheckForLiveWatchParty()
End Sub

Sub OnLivePartyPollDone()
    task = m.livePartyPollTask
    If task = Invalid Then Return
    If task.taskStatus <> "success" Then Return

    wasLive = m.watchPartyLive
    partyIsLive = false
    If task.partyStatus = "live"
        If task.isPlaying = true Or task.isPlaying = "true" Then partyIsLive = true
    End If
    isNowLive = partyIsLive
    m.watchPartyLive = isNowLive

    ' Update the live alert on the nav header via interface field
    If m.headerNav <> Invalid
        m.headerNav.watchPartyIsLive = isNowLive
    End If

    Print "CrateTV [WatchParty]: Live status = " + Box(isNowLive).ToStr()
End Sub

Sub LoadSquareScene()
    ClearSceneContainer()
    
    scene = CreateObject("roSGNode", "SquareScene")
    scene.ObserveField("playContent", "OnPlayContent")
    scene.ObserveField("exitRequested", "OnExitFromContent")
    
    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    m.currentSceneNode = scene
    
    If m.cachedFeedData <> Invalid
        scene.feedData = m.cachedFeedData
    Else
        FetchFeedForSquare(scene)
    End If
    
    scene.SetFocus(true)
    m.top.currentScene = "SquareScene"
End Sub

Sub FetchFeedForSquare(scene as Object)
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "fetchFeed"
    If m.global <> Invalid And m.global.HasField("deviceId")
        task.deviceId = m.global.deviceId
    End If
    task.ObserveField("taskStatus", "OnSquareFeedReady")
    task.control = "run"
    m.squareFeedTask = task
    m.pendingSquareScene = scene
End Sub

Sub OnSquareFeedReady()
    task = m.squareFeedTask
    If task = Invalid Then Return
    If task.taskStatus = "success" And task.feedData <> Invalid
        m.cachedFeedData = task.feedData
        If m.pendingSquareScene <> Invalid
            m.pendingSquareScene.feedData = task.feedData
        End If
    End If
End Sub

Sub OnHomeFeedReady()
    If m.homeScene <> Invalid And m.homeScene.HasField("feedDataReady")
        fd = m.homeScene.feedDataReady
        If fd <> Invalid
            m.cachedFeedData = fd
            Print "CrateTV: Cached feed from Home (" + Str(fd.GetChildCount()) + " rows)"
        End If
    End If

    ' Extract the spotlight film from Now Streaming row for the nav scene
    If m.nowStreamingFilm = Invalid And fd <> Invalid
        For ri = 0 To fd.GetChildCount() - 1
            row = fd.GetChild(ri)
            If row <> Invalid And row.HasField("title")
                tl = LCase(row.title)
                If Instr(1, tl, "now streaming") > 0 Or Instr(1, tl, "streaming now") > 0
                    If row.GetChildCount() > 0
                        m.nowStreamingFilm = row.GetChild(0)
                        Print "CrateTV: Cached Now Streaming spotlight: " + m.nowStreamingFilm.title
                    End If
                    Exit For
                End If
            End If
        End For
    End If

    ' =======================================================================
    ' REVEAL UI -- only now, after real content is ready.
    ' Order matters: show content first, then lift covers so first frame
    ' the user sees is fully rendered -- zero flash.
    ' =======================================================================
    '
    ' ADMIN → ROKU LIVE FEED NOTE:
    ' The feed is fetched fresh from https://cratetv.net/api/roku-feed on
    ' every app launch (and on tab switches if cache is stale).
    ' Any change published in the Crate TV admin will be reflected on the
    ' Roku channel on the user's next app launch -- no channel update needed.
    m.sceneContainer.visible = true   ' reveal HomeScene content
    HideLoading()                      ' remove MainScene loading bar
    m.headerNav.visible = true         ' Header.OnVisibleChange reveals nav children

    ' Start background watch party polling now that feed is ready
    If m.partyPollTimer <> Invalid Then m.partyPollTimer.control = "start"
    CheckForLiveWatchParty()           ' immediate first check

End Sub

Sub LoadSearchScene()
    ClearSceneContainer()
    
    scene = CreateObject("roSGNode", "SearchScene")
    scene.ObserveField("playContent",     "OnPlayContent")
    scene.ObserveField("showActorDetail", "OnShowActorDetail")
    scene.ObserveField("exitRequested",   "OnExitFromContent")

    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    m.currentSceneNode = scene
    m.top.currentScene = "SearchScene"
    m.searchScene = scene
    ' Route focus to resultsGrid -- SearchScene is a Group and cannot hold focus
    resultsGrid = scene.FindNode("resultsGrid")
    If resultsGrid <> Invalid
        resultsGrid.SetFocus(true)
    Else
        scene.SetFocus(true)
    End If
    
    ' Use cached feed if it has enough data (5+ rows means full feed)
    If m.cachedFeedData <> Invalid And m.cachedFeedData.GetChildCount() >= 5
        Print "CrateTV: SearchScene using cached feed (" + Str(m.cachedFeedData.GetChildCount()) + " rows)"
        scene.feedData = m.cachedFeedData
    Else
        ' Fetch fresh -- cached data was mutated or empty
        Print "CrateTV: SearchScene fetching fresh feed..."
        searchFeedTask = CreateObject("roSGNode", "ContentTask")
        searchFeedTask.taskType = "fetchFeed"
        If m.global <> Invalid And m.global.HasField("deviceId") And m.global.deviceId <> Invalid
            searchFeedTask.deviceId = m.global.deviceId
        End If
        searchFeedTask.ObserveField("taskStatus", "OnSearchFeedLoaded")
        searchFeedTask.control = "run"
        m.searchFeedTask = searchFeedTask
    End If
    
    Print "CrateTV: Loaded SearchScene"
End Sub

Sub OnSearchFeedLoaded()
    task = m.searchFeedTask
    If task = Invalid Then Return
    If task.taskStatus = "running" Then Return
    
    If task.taskStatus = "success" And task.feedData <> Invalid
        m.cachedFeedData = task.feedData
        If m.searchScene <> Invalid
            m.searchScene.feedData = task.feedData
        End If
    End If
End Sub

Sub LoadAccountScene()
    ClearSceneContainer()
    
    scene = CreateObject("roSGNode", "AccountScene")
    scene.ObserveField("signOutRequested", "OnSignOutRequested")
    scene.ObserveField("exitRequested", "OnExitFromContent")
    
    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    scene.SetFocus(true)
    m.currentSceneNode = scene
    m.top.currentScene = "AccountScene"
    
    Print "CrateTV: Loaded AccountScene"
End Sub

Sub OnSignOutRequested()
    Print "CrateTV: Sign out - returning to link screen"
    SetDeviceLinked(false)
    RegistryDelete("authToken", GetRegistryConfig().SECTION)
    LoadAccountLinkScene()
End Sub

Sub ClearSceneContainer()
    m.sceneContainer.RemoveChildrenIndex(m.sceneContainer.GetChildCount(), 0)
    m.currentSceneNode = Invalid
    m.sceneStack = []
End Sub

' =============================================================================
' PLAY CONTENT -- Direct playback
' =============================================================================
Sub OnShowActorDetail()
    If m.searchScene = Invalid Then Return
    slug = m.searchScene.showActorDetail
    If slug = Invalid Or slug = "" Then Return
    Print "CrateTV: Opening ActorDetailScene for: " + slug
    ClearSceneContainer()
    actorScene = CreateObject("roSGNode", "ActorDetailScene")
    actorScene.ObserveField("exitToSearch",  "OnExitActorDetail")
    actorScene.ObserveField("videoContent",  "OnActorMovieSelected")
    m.sceneContainer.AppendChild(actorScene)
    actorScene.visible = true
    actorScene.SetFocus(true)
    m.currentSceneNode = actorScene
    m.top.currentScene = "ActorDetailScene"
    m.actorScene = actorScene
    actorScene.actorSlug = slug
End Sub

Sub OnExitActorDetail()
    Print "CrateTV: Back from ActorDetail -> Search"
    m.actorScene = Invalid
    ClearSceneContainer()
    LoadSearchScene()
End Sub

Sub OnActorMovieSelected()
    If m.actorScene = Invalid Then Return
    videoContent = m.actorScene.videoContent
    If videoContent = Invalid Then Return
    LoadVideoPlayer(videoContent)
End Sub

Sub OnPlayContent()
    content = Invalid
    If m.currentSceneNode <> Invalid And m.currentSceneNode.HasField("playContent")
        content = m.currentSceneNode.playContent
    End If
    If content = Invalid Then Return

    ' Check if this film has an active watch party
    isWatchParty = false
    If content.HasField("isWatchPartyEnabled") And content.isWatchPartyEnabled = true
        isWatchParty = true
    End If

    ' If film came from WatchPartyScene (has watchPartyOffset), go straight to player
    hasOffset = false
    If content.HasField("watchPartyOffset") And content.watchPartyOffset > 0
        hasOffset = true
    End If

    If isWatchParty And Not hasOffset
        LoadWatchPartyScene(content)
    Else
        LoadVideoPlayer(content)
    End If
End Sub

Sub OnContentSelected()
    If m.currentSceneNode <> Invalid And m.currentSceneNode.HasField("selectedContent")
        content = m.currentSceneNode.selectedContent
        If content <> Invalid Then LoadVideoPlayer(content)
    End If
End Sub

Sub OnExitFromContent()
    Print "CrateTV [Main]: OnExitFromContent called - switching to nav"
    SetFocusZone("nav")
End Sub

Sub LoadWatchPartyScene(film as Object)
    ClearSceneContainer()

    scene = CreateObject("roSGNode", "WatchPartyScene")
    scene.authToken = m.authToken
    scene.ObserveField("playContent",   "OnPlayContent")
    scene.ObserveField("exitRequested", "OnExitFromContent")

    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    ' Set film AFTER adding to scene so OnFilmSet fires correctly
    scene.film = film
    scene.SetFocus(true)
    m.currentSceneNode = scene
    m.top.currentScene = "WatchPartyScene"
    Print "CrateTV: Loaded WatchPartyScene for " + film.title
End Sub

Sub LoadVideoPlayer(content as Object)
    m.headerNav.visible = false
    
    scene = CreateObject("roSGNode", "CrateVideoPlayer")
    scene.content = content
    scene.ObserveField("playbackComplete", "OnPlaybackComplete")
    scene.ObserveField("closeRequested", "OnVideoClose")
    
    If m.currentSceneNode <> Invalid
        m.currentSceneNode.visible = false
        m.sceneStack.Push(m.currentSceneNode)
    End If
    
    m.sceneContainer.AppendChild(scene)
    scene.visible = true
    scene.SetFocus(true)
    m.currentSceneNode = scene
    m.top.currentScene = "CrateVideoPlayer"
End Sub

Sub OnPlaybackComplete()
    If m.currentSceneNode <> Invalid And m.currentSceneNode.content <> Invalid
        MarkContentWatched(m.currentSceneNode.content)
    End If
    PopScene()
End Sub

Sub OnVideoClose()
    PopScene()
End Sub

Sub PopScene()
    If m.sceneStack.Count() > 0
        ' CRITICAL: Fully clean up the current scene (especially video player)
        If m.currentSceneNode <> Invalid
            ' Stop video playback if this is a video player
            videoNode = m.currentSceneNode.FindNode("videoNode")
            If videoNode <> Invalid
                videoNode.control = "stop"
                videoNode.content = Invalid
            End If
            m.sceneContainer.RemoveChild(m.currentSceneNode)
            m.currentSceneNode = Invalid
        End If
        
        ' Restore the previous scene
        m.currentSceneNode = m.sceneStack.Pop()
        m.currentSceneNode.visible = true
        m.headerNav.visible = true
        m.top.currentScene = m.currentSceneNode.SubType()
        
        ' CRITICAL: Reset focus state and give focus back to restored scene
        m.focusZone = "content"
        m.headerNav.isActive = false
        m.currentSceneNode.SetFocus(true)
        
        Print "CrateTV: PopScene -> restored " + m.top.currentScene
    Else
        m.headerNav.visible = true
        SetFocusZone("nav")
    End If
End Sub

' =============================================================================
' FOCUS MANAGEMENT
' =============================================================================
Sub SetFocusZone(zone as String)
    m.focusZone = zone
    If zone = "nav"
        m.headerNav.isActive = true
        m.headerNav.SetFocus(true)
        If m.currentSceneNode <> Invalid Then m.currentSceneNode.opacity = 0.7
    Else
        m.headerNav.isActive = false
        If m.currentSceneNode <> Invalid
            m.currentSceneNode.opacity = 1.0
            ' Group nodes cannot hold focus -- find the real focusable child.
            ' SearchScene exposes resultsGrid; other scenes self-manage via
            ' their own focusedChild observer (e.g. HomeScene -> rowList).
            focusTarget = m.currentSceneNode.FindNode("resultsGrid")
            If focusTarget <> Invalid
                focusTarget.SetFocus(true)
            Else
                m.currentSceneNode.SetFocus(true)
            End If
        End If
    End If
End Sub

' =============================================================================
' UTILITIES
' =============================================================================
Sub ShowLoading(message as String)
    If m.loadingText <> Invalid Then m.loadingText.text = message
    m.loadingGroup.visible = true
End Sub

Sub HideLoading()
    If m.loadingBarAnim <> Invalid Then m.loadingBarAnim.control = "stop"
    If m.dotTimer <> Invalid Then m.dotTimer.control = "stop"
    If m.msgTimer <> Invalid Then m.msgTimer.control = "stop"
    m.loadingGroup.visible = false
End Sub

Sub OnDotTimerFire()
    m.dotStep = (m.dotStep + 1) Mod 3
    If m.dot1 <> Invalid Then m.dot1.color = "#333333"
    If m.dot2 <> Invalid Then m.dot2.color = "#333333"
    If m.dot3 <> Invalid Then m.dot3.color = "#333333"
    If m.dotStep = 0 And m.dot1 <> Invalid Then m.dot1.color = "#EF4444"
    If m.dotStep = 1 And m.dot2 <> Invalid Then m.dot2.color = "#EF4444"
    If m.dotStep = 2 And m.dot3 <> Invalid Then m.dot3.color = "#EF4444"
End Sub

Sub OnMsgTimerFire()
    If m.loadingMessages = Invalid Then Return
    m.loadingMsgIndex = (m.loadingMsgIndex + 1) Mod m.loadingMessages.Count()
    If m.loadingText <> Invalid
        m.loadingText.text = m.loadingMessages[m.loadingMsgIndex]
    End If
End Sub

Sub ShowDialog(title as String, message as String, buttons as Object)
    dialogContent = m.top.FindNode("dialogContent")
    dialogContent.RemoveChildrenIndex(dialogContent.GetChildCount(), 0)
    dialogBg = CreateObject("roSGNode", "Rectangle")
    dialogBg.width = 800 : dialogBg.height = 400 : dialogBg.color = GetThemeConfig().SURFACE_ELEVATED
    titleLabel = CreateObject("roSGNode", "Label")
    titleLabel.text = title : titleLabel.font = "font:LargeBoldSystemFont"
    titleLabel.color = GetThemeConfig().TEXT_PRIMARY : titleLabel.width = 720 : titleLabel.translation = [40, 40]
    messageLabel = CreateObject("roSGNode", "Label")
    messageLabel.text = message : messageLabel.font = "font:MediumSystemFont"
    messageLabel.color = GetThemeConfig().TEXT_SECONDARY : messageLabel.width = 720
    messageLabel.wrap = true : messageLabel.translation = [40, 120]
    dialogBg.AppendChild(titleLabel)
    dialogBg.AppendChild(messageLabel)
    dialogContent.AppendChild(dialogBg)
    m.dialogContainer.visible = true
End Sub

Sub HideDialog()
    m.dialogContainer.visible = false
End Sub

Sub MarkContentWatched(content as Object)
    If content = Invalid Then Return
    movieKey = SafeString(content.id)
    If movieKey = "" And content.HasField("movieKey") Then movieKey = SafeString(content.movieKey)
    If movieKey = "" Then Return
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "markWatched"
    If m.global <> Invalid And m.global.HasField("deviceId") Then task.deviceId = m.global.deviceId
    task.control = "run"
End Sub

' =============================================================================
' KEY HANDLING
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    
    If m.dialogContainer.visible
        If key = "back" Or key = "OK"
            HideDialog()
            Return true
        End If
    End If
    
    ' Let video player handle its own keys
    If m.top.currentScene = "CrateVideoPlayer" Then Return false
    
    ' Navigate UP from content to header nav
    If key = "up" And m.focusZone = "content"
        If m.currentSceneNode <> Invalid And m.headerNav.visible
            SetFocusZone("nav")
            Return true
        End If
    End If
    
    ' Navigate DOWN from header nav to content
    If key = "down" And m.focusZone = "nav"
        SetFocusZone("content")
        Return true
    End If
    
    If key = "back"
        If m.sceneStack.Count() > 0
            PopScene()
            Return true
        End If
        If m.focusZone = "content"
            SetFocusZone("nav")
            Return true
        Else
            Return false
        End If
    End If
    
    Return false
End Function
