sub init()
    m.top.functionName = "fetchContent"
end sub

sub fetchContent()
    deviceInfo = CreateObject("roDeviceInfo")
    deviceId = deviceInfo.GetChannelClientId()
    
    url = GetApiUrl() + "/roku-feed?deviceId=" + deviceId
    
    request = CreateObject("roUrlTransfer")
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.InitClientCertificates()
    request.SetUrl(url)
    
    responseString = request.GetToString()
    
    if responseString <> ""
        json = ParseJson(responseString)
        if json <> invalid
            rootNode = CreateObject("roSGNode", "ContentNode")
            
            ' 1. FESTIVAL LOGIC
            if json.isFestivalLive = true and json.festivalContent <> invalid
                festivalRow = rootNode.CreateChild("ContentNode")
                festivalRow.title = "🏆 " + json.festivalContent.config.title + " (LIVE)"
                
                if json.festivalContent.days <> invalid
                    for each day in json.festivalContent.days
                        if day.blocks <> invalid
                            for each block in day.blocks
                                if block.children <> invalid
                                    for each film in block.children
                                        parseItem(festivalRow, film)
                                    end for
                                end if
                            end for
                        end if
                    end for
                end if
            end if

            ' 2. Featured Items
            if json.heroItems <> invalid and json.heroItems.Count() > 0
                heroRow = rootNode.CreateChild("ContentNode")
                heroRow.title = "Featured"
                for each item in json.heroItems
                    parseItem(heroRow, item)
                end for
            end if

            ' 3. Standard Categories
            if json.categories <> invalid
                for each category in json.categories
                    if category.children <> invalid and category.children.Count() > 0
                        row = rootNode.CreateChild("ContentNode")
                        row.title = category.title
                        for each video in category.children
                            parseItem(row, video)
                        end for
                    end if
                end for
            end if
            
            m.top.content = rootNode
        end if
    end if
end sub

sub parseItem(rowNode as Object, itemData as Object)
    if itemData <> invalid
        itemNode = rowNode.CreateChild("ContentNode")
        itemNode.title = itemData.title
        
        ' Safety check for description
        if itemData.description <> invalid
            itemNode.description = itemData.description
        else
            itemNode.description = ""
        end if

        ' Posters
        itemNode.hdPosterUrl = itemData.HDPosterUrl
        itemNode.sdPosterUrl = itemData.SDPosterUrl
        itemNode.url = itemData.streamUrl
        
        ' Metadata
        itemNode.addField("rating", "string", false)
        if itemData.rating <> invalid then itemNode.rating = itemData.rating else itemNode.rating = ""

        itemNode.addField("duration", "string", false)
        if itemData.duration <> invalid then itemNode.duration = itemData.duration else itemNode.duration = ""
    end if
end sub