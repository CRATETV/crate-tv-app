' ##############################################################################
' CRATE TV - Content Task (V4 Studio)
'
' Production-ready API fetcher:
' - fetchFeed: heroItems[] + categories[] with children[]
' - getLinkCode: Fetches link code from /get-roku-link-code
' - pollAuth: Polls /roku/poll-auth for device authentication
' ##############################################################################

Sub Init()
    m.top.functionName = "ExecuteTask"
End Sub

Sub ExecuteTask()
    m.top.taskStatus = "running"
    
    taskType = m.top.taskType
    Print "CrateTV [Task]: Executing taskType=" + taskType
    
    If taskType = "fetchFeed"
        FetchAndParseFeed()
    Else If taskType = "fetchActorProfile"
        FetchActorProfile()
    Else If taskType = "searchActors"
        SearchActors()
    Else If taskType = "getLinkCode"
        FetchLinkCode()
    Else If taskType = "pollAuth"
        PollAuth()
    Else
        m.top.errorMessage = "Unknown task type: " + taskType
        m.top.taskStatus = "error"
    End If
End Sub

' =============================================================================
' ACTOR PROFILE FETCH
' GET /api/get-public-actor-profile?slug=<slug>
' Response: { profile: { name, bio, photo, highResPhoto, ... }, films: [...] }
' We pass the slug in via the searchQuery field and return raw JSON in actorResults.
' =============================================================================
Sub FetchActorProfile()
    slug = m.top.searchQuery
    If slug = Invalid Or slug = ""
        m.top.actorResults = ""
        m.top.taskStatus   = "error"
        Return
    End If

    url = "https://cratetv.net/api/get-public-actor-profile?slug=" + slug
    Print "CrateTV [Task]: GET actor profile " + url

    jsonString = MakeGetRequest(url)

    If jsonString = Invalid Or jsonString = ""
        m.top.actorResults = ""
        m.top.taskStatus   = "error"
        Return
    End If

    m.top.actorResults = jsonString
    m.top.taskStatus   = "success"
    Print "CrateTV [Task]: Actor profile fetched for slug=" + slug
End Sub

' =============================================================================
' ACTOR SEARCH
' =============================================================================
Sub SearchActors()
    q = m.top.searchQuery
    If q = Invalid Or q = ""
        m.top.actorResults = "[]"
        m.top.taskStatus = "success"
        Return
    End If

    url = "https://cratetv.net/api/search-actors?q=" + q
    Print "CrateTV [Task]: Actor search GET " + url

    jsonString = MakeGetRequest(url)

    If jsonString = Invalid Or jsonString = ""
        m.top.actorResults = "[]"
        m.top.taskStatus = "success"
        Return
    End If

    ' Pass raw JSON string back -- SearchScene parses it on render thread (no node creation needed)
    m.top.actorResults = jsonString
    m.top.taskStatus = "success"
    Print "CrateTV [Task]: Actor search complete"
End Sub

' =============================================================================
' LINK CODE FETCHING
' =============================================================================
Sub FetchLinkCode()
    deviceId = m.top.deviceId
    If deviceId = Invalid Or deviceId = ""
        deviceId = "unknown"
    End If
    
    url = "https://cratetv.net/api/get-roku-link-code?deviceId=" + deviceId
    Print "CrateTV [Task]: GET link code from " + url
    
    jsonString = MakeGetRequest(url)
    
    If jsonString = Invalid Or jsonString = ""
        ' API may not be ready -- generate a local code for display
        Print "CrateTV [Task]: Link code API unavailable, generating local code"
        GenerateLocalLinkCode()
        Return
    End If
    
    json = ParseJson(jsonString)
    
    If json <> Invalid
        ' Try common response fields for the code
        code = ""
        If json.code <> Invalid Then code = json.code
        If code = "" And json.linkCode <> Invalid Then code = json.linkCode
        If code = "" And json.device_code <> Invalid Then code = json.device_code
        
        If code <> ""
            m.top.linkCode = code
            m.top.taskStatus = "success"
            Print "CrateTV [Task]: Link code received: " + code
            Return
        End If
    End If
    
    ' Fallback: generate a local code
    Print "CrateTV [Task]: No code in API response, generating local code"
    GenerateLocalLinkCode()
End Sub

Sub GenerateLocalLinkCode()
    ' Generate a 6-digit random code for display
    rnd = CreateObject("roDeviceInfo")
    deviceId = rnd.GetChannelClientId()
    
    ' Hash deviceId to get a consistent 6-digit code
    code = ""
    seed = 0
    For i = 0 To Len(deviceId) - 1
        seed = seed + Asc(Mid(deviceId, i + 1, 1))
    End For
    
    ' Generate 6 digits
    For i = 0 To 5
        seed = (seed * 1103515245 + 12345) Mod 2147483648
        digit = Abs(seed) Mod 10
        code = code + Str(digit).Trim()
    End For
    
    m.top.linkCode = code
    m.top.taskStatus = "success"
    Print "CrateTV [Task]: Generated local link code: " + code
End Sub

' =============================================================================
' AUTH POLLING
' =============================================================================
Sub PollAuth()
    deviceId = m.top.deviceId
    If deviceId = Invalid Or deviceId = ""
        m.top.isLinked = false
        m.top.taskStatus = "error"
        m.top.errorMessage = "No device ID"
        Return
    End If
    
    url = "https://cratetv.net/api/roku/poll-auth?device_code_id=" + deviceId
    Print "CrateTV [Task]: Polling auth at " + url
    
    jsonString = MakeGetRequest(url)
    
    If jsonString = Invalid Or jsonString = ""
        m.top.isLinked = false
        m.top.taskStatus = "error"
        m.top.errorMessage = "Poll request failed"
        Return
    End If
    
    json = ParseJson(jsonString)
    
    If json <> Invalid
        isLinked = false
        If json.linked <> Invalid Then isLinked = json.linked
        If json.authenticated <> Invalid Then isLinked = json.authenticated
        If json.status <> Invalid And LCase(json.status) = "linked" Then isLinked = true
        
        m.top.isLinked = isLinked
        
        If isLinked And json.token <> Invalid
            m.top.authToken = json.token
        End If
        
        ' Capture user display info if present
        If json.displayName <> Invalid Then m.top.userName = json.displayName
        If json.name <> Invalid And m.top.userName = "" Then m.top.userName = json.name
        If json.email <> Invalid Then m.top.userEmail = json.email
        If json.username <> Invalid And m.top.userName = "" Then m.top.userName = json.username
        If json.avatar <> Invalid Then m.top.avatarUrl = json.avatar
        If json.avatarUrl <> Invalid Then m.top.avatarUrl = json.avatarUrl
        If json.photoURL <> Invalid And m.top.avatarUrl = "" Then m.top.avatarUrl = json.photoURL
        
        m.top.taskStatus = "success"
    Else
        m.top.isLinked = false
        m.top.taskStatus = "error"
        m.top.errorMessage = "Invalid poll response"
    End If
End Sub

' =============================================================================
' FETCH AND PARSE FEED
' =============================================================================
Sub FetchAndParseFeed()
    feedUrl = "https://cratetv.net/api/roku-feed"
    
    deviceId = m.top.deviceId
    If deviceId <> Invalid And deviceId <> ""
        feedUrl = feedUrl + "?deviceId=" + deviceId
    End If
    
    Print "CrateTV [Task]: GET " + feedUrl
    
    jsonString = MakeGetRequest(feedUrl)
    
    If jsonString = Invalid Or jsonString = ""
        m.top.errorMessage = "Network request failed"
        m.top.taskStatus = "error"
        Return
    End If
    
    Print "CrateTV [Task]: Received " + Str(Len(jsonString)) + " bytes"
    
    json = ParseJson(jsonString)
    
    If json = Invalid
        m.top.errorMessage = "Invalid JSON response"
        m.top.taskStatus = "error"
        Return
    End If
    
    contentTree = BuildContentTree(json)
    
    If contentTree = Invalid Or contentTree.GetChildCount() = 0
        m.top.errorMessage = "No content found"
        m.top.taskStatus = "error"
        Return
    End If
    
    m.top.feedData = contentTree
    m.top.taskStatus = "success"
    Print "CrateTV [Task]: SUCCESS - " + Str(contentTree.GetChildCount()) + " rows loaded"
End Sub

' =============================================================================
' HTTP REQUEST
' =============================================================================
Function MakeGetRequest(url as String) as Dynamic
    request = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    
    request.SetMessagePort(port)
    request.SetUrl(url)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.EnableEncodings(true)
    request.AddHeader("Accept", "application/json")
    request.AddHeader("Connection", "keep-alive")
    
    If Not request.AsyncGetToString()
        Return Invalid
    End If
    
    event = Wait(30000, port)
    
    If event = Invalid
        request.AsyncCancel()
        Return Invalid
    End If
    
    If Type(event) <> "roUrlEvent"
        Return Invalid
    End If
    
    responseCode = event.GetResponseCode()
    Print "CrateTV [Task]: HTTP " + Str(responseCode)
    
    If responseCode >= 200 And responseCode < 300
        Return event.GetString()
    End If
    
    Print "CrateTV [Task]: HTTP Error - " + event.GetFailureReason()
    Return Invalid
End Function

' =============================================================================
' BUILD CONTENT TREE
' =============================================================================
Function BuildContentTree(json as Object) as Object
    rootNode = CreateObject("roSGNode", "ContentNode")
    
    ' HERO ITEMS -- stored for hero spotlight display ONLY, NOT as a RowList row.
    ' The webapp does NOT have a "Featured" row; heroItems are just the first
    ' category's movies duplicated for the top banner.  Creating a row from them
    ' would add a fake category that doesn't exist on the webapp.
    heroItems = Invalid
    If json.heroItems <> Invalid And Type(json.heroItems) = "roArray" And json.heroItems.Count() > 0
        heroItems = json.heroItems
    End If
    
    ' Store hero items on a special node so HomeScene can read them for the
    ' spotlight area without polluting the RowList.
    If heroItems <> Invalid
        heroNode = CreateObject("roSGNode", "ContentNode")
        heroNode.title = "__hero__"
        heroNode.AddField("rowType", "string", false)
        heroNode.rowType = "hero"
        For hi = 0 To heroItems.Count() - 1
            item = heroItems[hi]
            movieNode = CreateMovieNode(item)
            If movieNode <> Invalid Then heroNode.AppendChild(movieNode)
        End For
        ' Append hero node FIRST so HomeScene can find it, but HomeScene
        ' must strip it out before binding to RowList (it's not a real row).
        If heroNode.GetChildCount() > 0 Then rootNode.AppendChild(heroNode)
    End If
    
    ' CATEGORIES
    categoriesArr = Invalid
    If json.categories <> Invalid And Type(json.categories) = "roArray"
        categoriesArr = json.categories
    Else If json.rows <> Invalid And Type(json.rows) = "roArray"
        categoriesArr = json.rows
    Else If json.sections <> Invalid And Type(json.sections) = "roArray"
        categoriesArr = json.sections
    End If
    
    If categoriesArr <> Invalid
        Print "CrateTV [Task]: API returned " + Str(categoriesArr.Count()) + " categories"
        catIdx = 0
        For catLoop = 0 To categoriesArr.Count() - 1
            category = categoriesArr[catLoop]
            If category <> Invalid
            
            rowNode = CreateObject("roSGNode", "ContentNode")
            
            ' ContentNode has a BUILT-IN title field -- do NOT call AddField for it.
            ' RowList reads the built-in title for showRowLabel.
            rowTitle = "Untitled"
            If category.title <> Invalid Then rowTitle = category.title
            rowNode.title = rowTitle
            
            rowNode.AddField("rowType", "string", false)
            rowType = "standard"
            If category.type <> Invalid
                catType = LCase(category.type)
                If Instr(1, catType, "rank") > 0 Or Instr(1, catType, "top") > 0
                    rowType = "ranked"
                End If
            End If
            rowNode.rowType = rowType
            
            ' Store category slug/type for filtering
            ' API sends both 'type' (e.g. "ranked") and 'categoryType' (e.g. "topTen") as separate fields
            rowNode.AddField("categoryType", "string", false)
            apiCatType = ""
            If category.categoryType <> Invalid And category.categoryType <> ""
                apiCatType = category.categoryType
            Else If category.type <> Invalid
                apiCatType = category.type
            End If
            rowNode.categoryType = apiCatType
            
            children = category.children
            ' Fallback: API may use different field names for the movie array
            If children = Invalid Or Type(children) <> "roArray"
                If category.items <> Invalid And Type(category.items) = "roArray"
                    children = category.items
                Else If category.movies <> Invalid And Type(category.movies) = "roArray"
                    children = category.movies
                Else If category.content <> Invalid And Type(category.content) = "roArray"
                    children = category.content
                Else If category.films <> Invalid And Type(category.films) = "roArray"
                    children = category.films
                End If
            End If
            
            childCount = 0
            If children <> Invalid And Type(children) = "roArray" Then childCount = children.Count()
            catIdx = catIdx + 1
            
            If children <> Invalid And Type(children) = "roArray"
                For ci = 0 To children.Count() - 1
                    child = children[ci]
                    If child <> Invalid
                        movieNode = CreateMovieNode(child)
                        If movieNode <> Invalid
                            ' Stamp rowType on child for ranked detection in MoviePosterItem
                            If rowType = "ranked"
                                movieNode.AddField("rowType", "string", false)
                                movieNode.rowType = "ranked"
                            End If
                            rowNode.AppendChild(movieNode)
                        End If
                    End If
                End For
            End If
            
            If rowNode.GetChildCount() > 0
                rootNode.AppendChild(rowNode)
                Print "CrateTV [Task]: Row '" + rowTitle + "' (" + rowType + ") = " + Str(rowNode.GetChildCount()) + " items"
            End If
            End If ' Close: If category <> Invalid
        End For
    End If
    
    ' ALSO READ publicSquare ARRAY (for Vintage Visions, Community Records, etc.)
    publicSquareArr = Invalid
    If json.publicSquare <> Invalid And Type(json.publicSquare) = "roArray"
        publicSquareArr = json.publicSquare
        Print "CrateTV [Task]: ========================================="
        Print "CrateTV [Task]: API returned " + Str(publicSquareArr.Count()) + " PUBLIC SQUARE rows"
        Print "CrateTV [Task]: ========================================="
        
        For psLoop = 0 To publicSquareArr.Count() - 1
            category = publicSquareArr[psLoop]
            If category <> Invalid
            
            rowNode = CreateObject("roSGNode", "ContentNode")
            
            rowTitle = "Untitled"
            If category.title <> Invalid Then rowTitle = category.title
            rowNode.title = rowTitle
            
            rowNode.AddField("rowType", "string", false)
            rowType = "standard"
            If category.type <> Invalid
                catType = LCase(category.type)
                If Instr(1, catType, "rank") > 0 Or Instr(1, catType, "top") > 0
                    rowType = "ranked"
                End If
            End If
            rowNode.rowType = rowType
            
            ' CRITICAL: Set categoryType for Public Square filtering
            rowNode.AddField("categoryType", "string", false)
            
            ' Try to get categoryType from API response
            apiCategoryType = ""
            If category.categoryType <> Invalid Then 
                apiCategoryType = category.categoryType
                Print "CrateTV [Task]: PUBLIC SQUARE row '" + rowTitle + "' has API categoryType: '" + apiCategoryType + "'"
            End If
            
            If apiCategoryType <> ""
                ' Use the API-provided categoryType
                rowNode.categoryType = apiCategoryType
                Print "CrateTV [Task]:   Using API categoryType: '" + apiCategoryType + "'"
            Else If category.type <> Invalid
                ' Fallback to 'type' field
                rowNode.categoryType = category.type
                Print "CrateTV [Task]:   Using 'type' as categoryType: '" + category.type + "'"
            Else
                ' Final fallback: default to publicDomainIndie
                rowNode.categoryType = "publicDomainIndie"
                Print "CrateTV [Task]:   No categoryType found, defaulting to 'publicDomainIndie'"
            End If
            
            children = category.children
            If children = Invalid Or Type(children) <> "roArray"
                If category.items <> Invalid And Type(category.items) = "roArray"
                    children = category.items
                Else If category.movies <> Invalid And Type(category.movies) = "roArray"
                    children = category.movies
                Else If category.content <> Invalid And Type(category.content) = "roArray"
                    children = category.content
                End If
            End If
            
            If children <> Invalid And Type(children) = "roArray"
                Print "CrateTV [Task]:   Processing " + Str(children.Count()) + " children for '" + rowTitle + "'"
                For childLoop = 0 To children.Count() - 1
                    movie = children[childLoop]
                    If movie <> Invalid
                        movieNode = CreateMovieNode(movie)
                        If movieNode <> Invalid Then
                            rowNode.AppendChild(movieNode)
                        End If
                    End If
                End For
                
                If rowNode.GetChildCount() > 0
                    rootNode.AppendChild(rowNode)
                    Print "CrateTV [Task]: ✅ PUBLIC SQUARE Row '" + rowTitle + "'"
                    Print "CrateTV [Task]:   categoryType = '" + rowNode.categoryType + "'"
                    Print "CrateTV [Task]:   rowType = '" + rowNode.rowType + "'"
                    Print "CrateTV [Task]:   children = " + Str(rowNode.GetChildCount()) + " movies"
                Else
                    Print "CrateTV [Task]: ❌ SKIPPED PUBLIC SQUARE Row '" + rowTitle + "' - no valid children"
                End If
            Else
                Print "CrateTV [Task]: ❌ SKIPPED PUBLIC SQUARE Row '" + rowTitle + "' - no children array"
            End If
            End If
        End For
        Print "CrateTV [Task]: ========================================="
        Print "CrateTV [Task]: Finished processing PUBLIC SQUARE rows"
        Print "CrateTV [Task]: ========================================="
    Else
        Print "CrateTV [Task]: ⚠️ No 'publicSquare' array in API response"
        Print "CrateTV [Task]: ⚠️ Public Square will be empty unless rows have proper categoryType"
    End If
    
    ' Override stream URLs for Roku-compatible re-encoded films
    OverrideRokuStreams(rootNode)
    
    Return rootNode
End Function

' =============================================================================
' ROKU STREAM OVERRIDES
' Hardcoded Roku-compatible S3 URLs for films that need re-encoded streams.
' The API may return original URLs with incompatible codecs (Opus audio,
' H.264 High 4:4:4, etc). This function patches them at load time.
' TODO: Remove once admin panel supports per-platform stream URLs.
' =============================================================================
Sub OverrideRokuStreams(rootNode as Object)
    ' Map of title (lowercase, trimmed) → Roku-compatible stream URL
    rokuUrls = CreateObject("roAssociativeArray")
    rokuUrls["bereavement"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Bereavement+.mov"
    rokuUrls["the cook"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/TheCook_1080p.mp4"
    rokuUrls["autumn"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Autumn_roku.mp4"
    rokuUrls["agent 327"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Agent327_roku.mp4"
    rokuUrls["agent 327: operation barbershop"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Agent327_roku.mp4"
    rokuUrls["agent 327 operation barbershop"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Agent327_roku.mp4"
    rokuUrls["gemini time service"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/GeminiTimeService_fast.mp4"
    rokuUrls["cosmos laundromat"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/CosmoLaundromat_roku.mp4"
    rokuUrls["cosmo laundromat"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/CosmoLaundromat_roku.mp4"
    rokuUrls["cosmos laundromat - first cycle"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/CosmoLaundromat_roku.mp4"
    rokuUrls["a trip to the moon"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ATripToTheMoon_roku.mp4"
    rokuUrls["neighbours"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Neighbours_roku_v2.mp4"
    rokuUrls["neighbors"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Neighbours_roku_v2.mp4"
    rokuUrls["theneighbours"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Neighbours_roku_v2.mp4"
    rokuUrls["theneighbors"] = "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Neighbours_roku_v2.mp4"
    
    ' Hardcoded entries to inject if not in feed at all
    injectList = CreateObject("roArray", 0, true)
    
    ' Track which titles we found
    foundTitles = CreateObject("roAssociativeArray")
    
    ' Scan all rows and override matching stream URLs
    For ri = 0 To rootNode.GetChildCount() - 1
        row = rootNode.GetChild(ri)
        For ci = 0 To row.GetChildCount() - 1
            child = row.GetChild(ci)
            If child <> Invalid And child.HasField("title")
                titleKey = LCase(child.title).Trim()
                rokuUrl = rokuUrls[titleKey]
                If rokuUrl <> Invalid
                    oldUrl = ""
                    If child.HasField("streamUrl") Then oldUrl = child.streamUrl
                    child.streamUrl = rokuUrl
                    child.url = rokuUrl
                    child.streamFormat = "mp4"
                    foundTitles[titleKey] = true
                    Print "CrateTV [Roku]: Overrode stream for '" + child.title + "'"
                    Print "CrateTV [Roku]:   Old: " + oldUrl
                    Print "CrateTV [Roku]:   New: " + rokuUrl
                End If
            End If
        End For
    End For
    
    ' Inject any films not found in the feed
    ' Bereavement
    If foundTitles["bereavement"] = Invalid
        Print "CrateTV [Roku]: Bereavement not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "Bereavement"
            id: "bereavement"
            key: "bereavement"
            description: "A chilling tale of abduction and survival."
            synopsis: "A chilling tale of abduction and survival."
            director: ""
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Bereavement+.mov"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/Bereavement+.mov"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
    
    ' The Cook
    If foundTitles["the cook"] = Invalid
        Print "CrateTV [Roku]: The Cook not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "The Cook"
            id: "thecook"
            key: "thecook"
            description: "A public domain classic."
            synopsis: "A public domain classic."
            director: ""
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/TheCook_1080p.mp4"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/TheCook_1080p.mp4"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
    
    ' Autumn
    If foundTitles["autumn"] = Invalid
        Print "CrateTV [Roku]: Autumn not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "Autumn"
            id: "autumn"
            key: "autumn"
            description: "A short film by Alana Hill."
            synopsis: "A short film by Alana Hill."
            director: "Alana Hill"
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Autumn_roku.mp4"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Autumn_roku.mp4"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
    
    ' Agent 327
    If foundTitles["agent 327"] = Invalid And foundTitles["agent 327: operation barbershop"] = Invalid And foundTitles["agent 327 operation barbershop"] = Invalid
        Print "CrateTV [Roku]: Agent 327 not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "Agent 327"
            id: "agent327"
            key: "agent327"
            description: "Agent 327 Operation Barbershop by Blender Studio."
            synopsis: "Agent 327 Operation Barbershop by Blender Studio."
            director: "Blender Studio"
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Agent327_roku.mp4"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/Agent327_roku.mp4"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
    
    ' Gemini Time Service
    If foundTitles["gemini time service"] = Invalid
        Print "CrateTV [Roku]: Gemini Time Service not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "Gemini Time Service"
            id: "geminitimeservice"
            key: "geminitimeservice"
            description: "A short film by xiani zhong."
            synopsis: "A short film by xiani zhong."
            director: "xiani zhong"
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/GeminiTimeService_fast.mp4"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/GeminiTimeService_fast.mp4"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
    
    ' Cosmos Laundromat
    If foundTitles["cosmos laundromat"] = Invalid And foundTitles["cosmo laundromat"] = Invalid And foundTitles["cosmos laundromat - first cycle"] = Invalid
        Print "CrateTV [Roku]: Cosmos Laundromat not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "Cosmos Laundromat"
            id: "cosmoslaundromat"
            key: "cosmoslaundromat"
            description: "First Cycle. Official Blender Foundation release."
            synopsis: "First Cycle. Official Blender Foundation release."
            director: "Blender Foundation"
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/CosmoLaundromat_roku.mp4"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/Ruko+compatible+movies+/CosmoLaundromat_roku.mp4"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
    
    ' A Trip to the Moon
    If foundTitles["a trip to the moon"] = Invalid
        Print "CrateTV [Roku]: A Trip to the Moon not in feed -- injecting"
        InjectMovie(rootNode, {
            title: "A Trip to the Moon"
            id: "atriptothemoon"
            key: "atriptothemoon"
            description: "The 1902 science fiction film by Georges Méliès."
            synopsis: "The 1902 science fiction film by Georges Méliès."
            director: "Georges Méliès"
            fullMovie: "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ATripToTheMoon_roku.mp4"
            streamUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/ATripToTheMoon_roku.mp4"
            poster: ""
            hdPosterUrl: ""
            tvPoster: ""
            heroImage: ""
            streamFormat: "mp4"
            isFree: true
            isUnlocked: true
        })
    End If
End Sub

' =============================================================================
' INJECT MOVIE -- adds a movie node into the first available row
' =============================================================================
Sub InjectMovie(rootNode as Object, data as Object)
    node = CreateMovieNode(data)
    If node = Invalid Then Return
    
    ' Try to add to first non-hero row
    For ri = 0 To rootNode.GetChildCount() - 1
        row = rootNode.GetChild(ri)
        If row.HasField("rowType") And row.rowType <> "hero"
            row.AppendChild(node)
            Print "CrateTV [Roku]: Injected '" + data.title + "' into row '" + row.title + "'"
            Return
        Else If Not row.HasField("rowType")
            row.AppendChild(node)
            Print "CrateTV [Roku]: Injected '" + data.title + "' into row '" + row.title + "'"
            Return
        End If
    End For
    
    ' No suitable row -- create one
    newRow = CreateObject("roSGNode", "ContentNode")
    newRow.title = "More Films"
    newRow.AddField("rowType", "string", false)
    newRow.rowType = "standard"
    newRow.AddField("categoryType", "string", false)
    newRow.categoryType = ""
    newRow.AppendChild(node)
    rootNode.AppendChild(newRow)
    Print "CrateTV [Roku]: Injected '" + data.title + "' into new 'More Films' row"
End Sub

' =============================================================================
' CREATE MOVIE NODE
' =============================================================================
Function CreateMovieNode(data as Object) as Object
    If data = Invalid Then Return Invalid
    
    node = CreateObject("roSGNode", "ContentNode")
    
    title = "Untitled"
    If data.title <> Invalid And data.title <> "" Then title = data.title.Trim()
    node.title = title
    
    desc = ""
    If data.description <> Invalid Then desc = data.description
    If desc = "" And data.synopsis <> Invalid Then desc = data.synopsis
    node.description = desc
    
    node.AddField("id", "string", false)
    node.AddField("movieKey", "string", false)
    movieId = ""
    If data.id <> Invalid Then movieId = data.id
    If movieId = "" And data.key <> Invalid Then movieId = data.key
    ' Trim whitespace - leading/trailing spaces break deep link matching
    movieId = movieId.Trim()
    node.id = movieId
    node.movieKey = movieId
    
    node.AddField("posterUrl", "string", false)
    
    ' Collect all available poster URLs
    tvP = ""
    hdP = ""
    origP = ""
    If data.tvPoster <> Invalid And data.tvPoster <> "" Then tvP = SafeString(data.tvPoster)
    If data.hdPosterUrl <> Invalid And data.hdPosterUrl <> "" Then hdP = SafeString(data.hdPosterUrl)
    If hdP = "" And data.HDPosterUrl <> Invalid And data.HDPosterUrl <> "" Then hdP = SafeString(data.HDPosterUrl)
    If data.poster <> Invalid And data.poster <> "" Then origP = SafeString(data.poster)
    
    movieTitle = ""
    If data.title <> Invalid Then movieTitle = SafeString(data.title)
    
    ' POSTER PRIORITY for Roku:
    ' 1. Original 'poster' field (root-level S3 paths -- proven to work)
    ' 2. hdPosterUrl (may use subfolders that have encoding issues)
    ' 3. tvPoster (same subfolder risk)
    ' Skip .webp ONLY if other options exist (some Roku firmware can't render WebP)
    posterUrl = ""
    
    ' First try: non-webp original poster
    If origP <> "" And Instr(1, LCase(origP), ".webp") = 0
        posterUrl = origP
    End If
    ' Second try: non-webp hdPosterUrl
    If posterUrl = "" And hdP <> "" And Instr(1, LCase(hdP), ".webp") = 0
        posterUrl = hdP
    End If
    ' Third try: non-webp tvPoster
    If posterUrl = "" And tvP <> "" And Instr(1, LCase(tvP), ".webp") = 0
        posterUrl = tvP
    End If
    ' Final fallback: use any URL even if .webp
    If posterUrl = ""
        If origP <> "" Then posterUrl = origP
        If posterUrl = "" And hdP <> "" Then posterUrl = hdP
        If posterUrl = "" And tvP <> "" Then posterUrl = tvP
    End If
    
    posterUrl = NormalizeUrl(posterUrl)
    node.posterUrl = posterUrl
    node.HDPosterUrl = posterUrl
    node.SDPosterUrl = posterUrl
    
    
    node.AddField("backdropUrl", "string", false)
    node.AddField("heroImageUrl", "string", false)
    backdropUrl = ""
    If data.heroImage <> Invalid And data.heroImage <> "" Then backdropUrl = data.heroImage
    ' Some feeds provide heroImageUrl or heroImage
    If backdropUrl = "" And data.heroImageUrl <> Invalid And data.heroImageUrl <> "" Then backdropUrl = data.heroImageUrl

    ' Fall back to poster keys (support both casings)
    If backdropUrl = "" And data.HDPosterUrl <> Invalid And data.HDPosterUrl <> "" Then backdropUrl = data.HDPosterUrl
    If backdropUrl = "" And data.hdPosterUrl <> Invalid And data.hdPosterUrl <> "" Then backdropUrl = data.hdPosterUrl
    If backdropUrl = "" Then backdropUrl = posterUrl

    backdropUrl = NormalizeUrl(backdropUrl)
    node.backdropUrl = backdropUrl
    node.heroImageUrl = backdropUrl
    
    node.AddField("streamUrl", "string", false)
    node.AddField("streamFormat", "string", false)
    
    ' Stream URL priority: fullMovie first (original video), then streamUrl
    ' Validate that URL looks like a video, not an image
    streamUrl = ""
    
    ' Try fullMovie first -- it's always the actual video file
    If data.fullMovie <> Invalid And data.fullMovie <> ""
        streamUrl = data.fullMovie
    End If
    
    ' Try streamUrl -- but only if it looks like a video (not a .png/.jpg/.webp)
    If streamUrl = "" And data.streamUrl <> Invalid And data.streamUrl <> ""
        streamUrl = data.streamUrl
    End If
    
    ' Validate: if the "stream" URL is actually an image, try fullMovie instead
    sLower = LCase(streamUrl)
    isImage = false
    If Instr(1, sLower, ".png") > 0 Then isImage = true
    If Instr(1, sLower, ".jpg") > 0 Then isImage = true
    If Instr(1, sLower, ".jpeg") > 0 Then isImage = true
    If Instr(1, sLower, ".webp") > 0 Then isImage = true
    If Instr(1, sLower, ".gif") > 0 Then isImage = true
    
    If isImage
        Print "CrateTV [Task]: WARNING -- streamUrl is an image, not a video: " + streamUrl
        ' Fall back to fullMovie
        If data.fullMovie <> Invalid And data.fullMovie <> ""
            streamUrl = data.fullMovie
            Print "CrateTV [Task]: Using fullMovie instead: " + streamUrl
        Else
            Print "CrateTV [Task]: ERROR -- No valid video URL found!"
            streamUrl = ""
        End If
    End If
    
    streamUrl = NormalizeUrl(streamUrl)
    node.streamUrl = streamUrl
    node.url = streamUrl
    streamFormat = "mp4"
    If data.streamFormat <> Invalid Then streamFormat = data.streamFormat
    If Instr(1, LCase(streamUrl), ".m3u8") > 0 Then streamFormat = "hls"
    If Instr(1, LCase(streamUrl), ".mov") > 0 Then streamFormat = "mp4"
    node.streamFormat = streamFormat
    
    node.AddField("year", "string", false)
    node.AddField("releaseYear", "string", false)
    ' Intentionally blank -- API 'year' field uses publishedAt (upload date), not actual release year
    node.year = ""
    node.releaseYear = ""
    
    node.AddField("director", "string", false)
    If data.director <> Invalid Then node.director = data.director Else node.director = ""
    
    node.AddField("runtime", "string", false)
    If data.runtime <> Invalid Then node.runtime = data.runtime Else node.runtime = ""
    
    node.AddField("genres", "string", false)
    genreStr = ""
    If data.genres <> Invalid
        If Type(data.genres) = "roArray"
            genreStr = JoinStrings(data.genres, ", ")
        Else If Type(data.genres) = "roString" Or Type(data.genres) = "String"
            genreStr = data.genres
        End If
    End If
    node.genres = genreStr
    
    node.AddField("cast", "string", false)
    node.AddField("castJson", "string", false)
    castStr  = ""
    castJson = "[]"
    If data.cast <> Invalid And Type(data.cast) = "roArray"
        castNames   = []
        castObjects = []
        For Each castMember in data.cast
            If castMember <> Invalid And castMember.name <> Invalid And castMember.name <> ""
                castNames.Push(castMember.name)
                cm = {}
                cm.name = castMember.name
                cm.slug = ""
                If castMember.slug <> Invalid Then cm.slug = castMember.slug
                If cm.slug = "" Then cm.slug = LCase(castMember.name).Replace(" ", "-")
                cm.photo = ""
                If castMember.photo <> Invalid Then cm.photo = castMember.photo
                cm.highResPhoto = ""
                If castMember.highResPhoto <> Invalid Then cm.highResPhoto = castMember.highResPhoto
                cm.bio = ""
                If castMember.bio <> Invalid Then cm.bio = castMember.bio
                castObjects.Push(cm)
            End If
        End For
        If castNames.Count() > 0 Then castStr = JoinStrings(castNames, ", ")
        If castObjects.Count() > 0 Then castJson = FormatJson(castObjects)
    End If
    node.cast     = castStr
    node.castJson = castJson
    
    node.AddField("isUnlocked", "boolean", false)
    node.AddField("isFree", "boolean", false)
    node.AddField("purchaseUrl", "string", false)
    isUnlocked = true
    If data.isUnlocked <> Invalid Then isUnlocked = data.isUnlocked
    If Not isUnlocked And data.isFree <> Invalid Then isUnlocked = data.isFree
    node.isUnlocked = isUnlocked
    node.isFree = isUnlocked
    If data.purchaseUrl <> Invalid Then node.purchaseUrl = data.purchaseUrl Else node.purchaseUrl = ""
    
    node.AddField("watchPartyStartTime", "string", false)
    node.AddField("isWatchPartyEnabled", "boolean", false)
    If data.watchPartyStartTime <> Invalid Then node.watchPartyStartTime = data.watchPartyStartTime Else node.watchPartyStartTime = ""
    If data.isWatchPartyEnabled <> Invalid Then node.isWatchPartyEnabled = data.isWatchPartyEnabled Else node.isWatchPartyEnabled = false
    
    node.AddField("trailerUrl", "string", false)
    trailerUrl = ""
    If data.trailer <> Invalid And data.trailer <> ""
        t = LCase(data.trailer)
        ' Only use direct video files — YouTube/Vimeo links can't play in Roku Video node
        isYoutube = (Instr(1, t, "youtube.com") > 0 Or Instr(1, t, "youtu.be") > 0)
        isVimeo   = (Instr(1, t, "vimeo.com") > 0)
        isDirectVideo = (Instr(1, t, ".mp4") > 0 Or Instr(1, t, ".m3u8") > 0 Or Instr(1, t, ".mov") > 0 Or Instr(1, t, ".mpd") > 0)
        If isDirectVideo And Not isYoutube And Not isVimeo
            trailerUrl = data.trailer
        End If
    End If
    node.trailerUrl = trailerUrl

    node.AddField("zineUrl", "string", false)
    If data.zineUrl <> Invalid And data.zineUrl <> "" Then node.zineUrl = data.zineUrl Else node.zineUrl = ""

    Return node
End Function

Function JoinStrings(arr as Object, delimiter as String) as String
    If arr = Invalid Or arr.Count() = 0 Then Return ""
    result = ""
    For i = 0 To arr.Count() - 1
        If i > 0 Then result = result + delimiter
        itemStr = ""
        item = arr[i]
        If Type(item) = "roString" Or Type(item) = "String"
            itemStr = item
        Else If Type(item) = "roAssociativeArray" And item.name <> Invalid
            itemStr = item.name
        End If
        result = result + itemStr
    End For
    Return result
End Function