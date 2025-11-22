sub init()
    m.top.functionName = "loadContent"
end sub

sub loadContent()
    root = {
        heroItems: CreateObject("roSGNode", "ContentNode"),
        mainContent: CreateObject("roSGNode", "ContentNode"),
        classics: CreateObject("roSGNode", "ContentNode")
    }

    di = CreateObject("roDeviceInfo")
    uuid = di.GetChannelClientId()
    url = "https://cratetv.net/api/roku-feed?deviceId=" + uuid
    
    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.InitClientCertificates()
    req.SetUrl(url)
    req.AddHeader("User-Agent", "Roku/CrateTV")
    
    jsonStr = req.GetToString()
    if jsonStr = "" then return
    json = ParseJson(jsonStr)
    if json = invalid then return

    ' --- ROWS ---
    if json.categories <> invalid
        for each category in json.categories
            row = root.mainContent.createChild("ContentNode")
            
            ' Count the items first
            itemCount = 0
            if category.items <> invalid
                itemCount = category.items.Count()
            end if

            ' Set Title WITH COUNT (Debugging)
            baseTitle = "Collection"
            if category.title <> invalid 
                baseTitle = category.title 
            else if category.name <> invalid
                baseTitle = category.name
            end if
            
            row.title = baseTitle + " (" + itemCount.toStr() + ")"
            
            if category.items <> invalid
                for each item in category.items
                    node = row.createChild("ContentNode")
                    node.title = item.title
                    node.description = item.synopsis
                    
                    ' Image Logic
                    pUrl = ""
                    if item.tvPoster <> invalid then pUrl = item.tvPoster else pUrl = item.poster
                    
                    ' FIX: Force HTTP to bypass Roku SSL issues
                    r = CreateObject("roRegex", "https:", "i")
                    node.hdposterurl = r.ReplaceAll(pUrl, "http:")
                    
                    node.url = item.fullMovie
                    node.streamFormat = "mp4" 
                end for
            end if
        end for
    end if
    
    m.top.content = root
end sub
