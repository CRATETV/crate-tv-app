sub init()
    ' When this Task runs, it will call loadContent()
    m.top.functionName = "loadContent"
end sub

sub loadContent()
    url = "https://cratetv.net/api/roku-feed.json"  ' TODO: put your real feed URL here

    transfer = CreateObject("roURLTransfer")
    transfer.SetURL(url)
    ' If you are using HTTPS, you may need certs:
    ' transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    ' transfer.InitClientCertificates()

    jsonString = transfer.GetToString()
    if jsonString = invalid or jsonString = "" then
        print "ERROR: Empty or invalid response from feed"
        return
    end if

    data = ParseJSON(jsonString)
    if data = invalid then
        print "ERROR: Failed to parse JSON"
        return
    end if

    ' Build a ContentNode tree Roku can use
    topNode = CreateObject("roSGNode", "ContentNode")

    ' HERO NODE
    if data.hero <> invalid then
        heroNode = topNode.CreateChild("ContentNode")
        heroNode.contentType  = "hero"
        heroNode.title        = data.hero.title
        heroNode.description  = data.hero.description
        heroNode.posterUrl    = data.hero.poster
        heroNode.trailerUrl   = data.hero.trailerUrl
        heroNode.movieUrl     = data.hero.movieUrl
    end if

    ' ROW NODES
    if data.rows <> invalid then
        for each row in data.rows
            rowNode = topNode.CreateChild("ContentNode")
            rowNode.contentType = "row"
            rowNode.title       = row.title

            for each item in row.items
                itemNode = rowNode.CreateChild("ContentNode")
                itemNode.id          = item.id
                itemNode.title       = item.title
                itemNode.description = item.description
                itemNode.posterUrl   = item.poster
                itemNode.trailerUrl  = item.trailerUrl
                itemNode.movieUrl    = item.movieUrl
                itemNode.badge       = item.badge
                itemNode.rank        = item.rank
            end for
        end for
    end if

    ' This triggers MainScene.onContentReady
    m.top.content = topNode
end sub
