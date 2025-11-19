sub init()
    m.top.functionName = "routeRequest"
end sub

sub routeRequest()
    ' FIX: specificType instead of type (which is reserved)
    reqType = m.top.requestType
    
    if reqType = "getCode"
        fetchCode()
    else if reqType = "checkLink"
        checkLink()
    else if reqType = "feed"
        fetchFeed()
    end if
end sub

function getDeviceId()
    di = CreateObject("roDeviceInfo")
    return di.GetChannelClientId()
end function

function makeRequest(url as String) as Object
    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.InitClientCertificates()
    req.SetUrl(url)
    str = req.GetToString()
    if str <> "" then return ParseJson(str)
    return invalid
end function

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

sub fetchFeed()
    url = GetApiUrl() + "/roku-feed?deviceId=" + getDeviceId()
    json = makeRequest(url)
    
    if json <> invalid
        rootNode = CreateObject("roSGNode", "ContentNode")
        
        ' 1. Festival (Top Row)
        if json.isFestivalLive = true and json.festivalContent <> invalid
            festivalRow = rootNode.CreateChild("ContentNode")
            festivalRow.title = "🏆 " + json.festivalContent.config.title + " (LIVE)"
            if json.festivalContent.days <> invalid
                for each day in json.festivalContent.days
                    if day.blocks <> invalid
                        for each block in day.blocks
                            if block.children <> invalid
                                for each film in block.children
                                    parseItem(festivalRow, film, 0)
                                end for
                            end if
                        end for
                    end if
                end for
            end if
        end if

        ' 2. Categories & Top 10
        if json.categories <> invalid
            for each category in json.categories
                if category.children <> invalid and category.children.Count() > 0
                    row = rootNode.CreateChild("ContentNode")
                    row.title = category.title
                    
                    ' Detect Top 10
                    isTopTen = (category.title.Instr("Top 10") >= 0)
                    rank = 1
                    
                    for each video in category.children
                        if isTopTen
                            parseItem(row, video, rank)
                            rank = rank + 1
                        else
                            parseItem(row, video, 0)
                        end if
                    end for
                end if
            end for
        end if
        m.top.content = rootNode
    end if
end sub

sub parseItem(rowNode, itemData, rank)
    if itemData <> invalid
        itemNode = rowNode.CreateChild("ContentNode")
        itemNode.title = itemData.title
        if itemData.description <> invalid then itemNode.description = itemData.description else itemNode.description = ""
        itemNode.hdPosterUrl = itemData.HDPosterUrl
        itemNode.sdPosterUrl = itemData.SDPosterUrl
        itemNode.url = itemData.streamUrl
        
        itemNode.addField("rank", "int", false)
        itemNode.rank = rank

        itemNode.addField("rating", "string", false)
        if itemData.rating <> invalid then itemNode.rating = itemData.rating
        
        itemNode.addField("duration", "string", false)
        if itemData.duration <> invalid then itemNode.duration = itemData.duration
    end if
end sub