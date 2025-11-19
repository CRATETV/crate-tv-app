sub init()
    m.top.functionName = "routeRequest"
end sub

sub routeRequest()
    reqType = m.top.requestType
    if reqType = "getCode"
        fetchCode()
    else if reqType = "checkLink"
        checkLink()
    else if reqType = "login"
        doLogin()
    else if reqType = "feed"
        fetchFeed()
    end if
end sub

function getDeviceId()
    di = CreateObject("roDeviceInfo")
    return di.GetChannelClientId()
end function

function makeRequest(url as String, method="GET", body="") as Object
    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.InitClientCertificates()
    req.SetUrl(url)
    
    if method = "POST"
        req.SetRequest("POST")
        req.AddHeader("Content-Type", "application/json")
        req.AsyncPostFromString(body)
    else
        req.AsyncGetToString()
    end if
    
    port = CreateObject("roMessagePort")
    req.SetPort(port)
    msg = wait(10000, port)
    
    if type(msg) = "roUrlEvent"
        if msg.GetResponseCode() = 200
            return ParseJson(msg.GetString())
        end if
    end if
    return invalid
end function

' --- AUTH FUNCTIONS ---
sub fetchCode()
    url = GetApiUrl() + "/get-roku-link-code?deviceId=" + getDeviceId()
    json = makeRequest(url)
    if json <> invalid then m.top.linkCode = json.code
end sub

sub checkLink()
    url = GetApiUrl() + "/check-roku-link-status?deviceId=" + getDeviceId()
    json = makeRequest(url)
    if json <> invalid then m.top.authResult = json
end sub

sub doLogin()
    url = GetApiUrl() + "/roku-device-login"
    payload = { email: m.top.email, password: m.top.password, deviceId: getDeviceId() }
    json = makeRequest(url, "POST", FormatJson(payload))
    if json <> invalid and json.success = true
        m.top.authResult = { success: true }
    else
        m.top.authResult = { success: false }
    end if
end sub

' --- FEED PARSING LOGIC (The Update) ---
sub fetchFeed()
    url = GetApiUrl() + "/roku-feed?deviceId=" + getDeviceId()
    json = makeRequest(url)
    
    if json <> invalid
        resultData = {}
        
        ' 1. PARSE HERO ITEMS (For the Carousel)
        ' We create a simple array of ContentNodes for the Hero rotation
        heroNodes = []
        if json.heroItems <> invalid
            for each item in json.heroItems
                node = createItemNode(item)
                heroNodes.push(node)
            end for
        end if
        resultData.heroItems = heroNodes

        ' 2. PARSE ROWS (For the Grid)
        rootNode = CreateObject("roSGNode", "ContentNode")
        
        ' A. Add Festival Row (if live)
        if json.isFestivalLive = true and json.festivalContent <> invalid
            festivalRow = rootNode.CreateChild("ContentNode")
            festivalRow.title = "🏆 " + json.festivalContent.config.title + " (LIVE)"
            if json.festivalContent.days <> invalid
                for each day in json.festivalContent.days
                    if day.blocks <> invalid
                        for each block in day.blocks
                            if block.children <> invalid
                                for each film in block.children
                                    ' Add 0 for rank (not ranked)
                                    parseAndAddItem(festivalRow, film, 0)
                                end for
                            end if
                        end for
                    end if
                end for
            end if
        end if

        ' B. Add Standard Categories
        if json.categories <> invalid
            for each category in json.categories
                if category.children <> invalid and category.children.Count() > 0
                    row = rootNode.CreateChild("ContentNode")
                    row.title = category.title
                    
                    ' Check if Top 10
                    isTopTen = (category.title.Instr("Top 10") >= 0)
                    rank = 1
                    
                    for each video in category.children
                        if isTopTen
                            parseAndAddItem(row, video, rank)
                            rank = rank + 1
                        else
                            parseAndAddItem(row, video, 0)
                        end if
                    end for
                end if
            end for
        end if
        
        resultData.rows = rootNode
        
        ' Send both data sets back to HomeScene
        m.top.feedData = resultData
    end if
end sub

' Helper to create a node and add it to a parent row
sub parseAndAddItem(rowNode, itemData, rank)
    node = createItemNode(itemData)
    if node <> invalid
        node.addField("rank", "int", false)
        node.rank = rank
        rowNode.appendChild(node)
    end if
end sub

' Helper to transform raw JSON item into a Roku ContentNode
function createItemNode(itemData) as Object
    if itemData = invalid return invalid

    node = CreateObject("roSGNode", "ContentNode")
    node.title = itemData.title
    node.url = itemData.streamUrl
    node.hdPosterUrl = itemData.hdPosterUrl
    node.sdPosterUrl = itemData.sdPosterUrl
    
    if itemData.description <> invalid 
        node.description = itemData.description 
    else 
        node.description = ""
    end if
    
    ' Custom Metadata Fields
    node.addField("rating", "string", false)
    if itemData.rating <> invalid then node.rating = itemData.rating
    
    node.addField("duration", "string", false)
    if itemData.duration <> invalid then node.duration = itemData.duration

    node.addField("isLiked", "boolean", false)
    if itemData.isLiked <> invalid then node.isLiked = itemData.isLiked

    ' Actors (Array of objects)
    node.addField("actors", "array", false)
    if itemData.actors <> invalid
        node.actors = itemData.actors
    else
        node.actors = []
    end if

    return node
end function