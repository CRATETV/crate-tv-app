sub init()
    m.top.functionName = "getContent"
end sub

sub getContent()
    url = m.top.url
    if url <> ""
        ut = CreateObject("roUrlTransfer")
        ut.SetUrl(url)
        ut.SetCertificatesFile("common:/certs/ca-bundle.crt")
        ut.InitClientCertificates()
        
        json = ut.GetToString()
        if json <> ""
            data = ParseJson(json)
            if data <> invalid
                if data.announcement <> invalid then m.top.announcement = data.announcement
                m.top.content = CreateContentTree(data)
                return
            end if
        end if
    end if
    
    ' Fallback to mock data if API fails
    m.top.content = CreateContentTree(invalid)
end sub

function CreateContentTree(data)
    root = CreateObject("roSGNode", "ContentNode")
    
    ' Handle server response format (categories/children)
    if data <> invalid and data.categories <> invalid
        for each rowData in data.categories
            row = root.createChild("ContentNode")
            row.title = rowData.title
            for each itemData in rowData.children
                item = row.createChild("ContentNode")
                item.id = itemData.id
                item.title = itemData.title
                item.description = itemData.description
                item.hdPosterUrl = itemData.hdPosterUrl
                item.url = itemData.streamUrl
                if itemData.streamFormat <> invalid
                    item.streamFormat = itemData.streamFormat
                else
                    item.streamFormat = "mp4"
                end if
                
                ' Custom fields
                item.addFields({
                    isUnlocked: itemData.isUnlocked,
                    isFree: itemData.isFree,
                    trailerUrl: itemData.trailerUrl,
                    rank: itemData.rank,
                    playStart: itemData.playStart,
                    length: itemData.length
                })
            next
        next
        return root
    end if

    ' Fallback to mock data format (rows/items)
    if data = invalid or data.rows = invalid
        data = {
            rows: [
                {
                    title: "Featured Films",
                    items: [
                        {
                            id: "1",
                            title: "CrateTV Original",
                            description: "A cinematic masterpiece from the CrateTV community.",
                            hdPosterUrl: "https://picsum.photos/seed/movie1/240/360",
                            isUnlocked: false,
                            isFree: false,
                            rank: 1,
                            playStart: 1200,
                            length: 3600,
                            streamUrl: "",
                            trailerUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                        },
                        {
                            id: "2",
                            title: "Free Short Film",
                            description: "Enjoy this free short film from our creators.",
                            hdPosterUrl: "https://picsum.photos/seed/movie2/240/360",
                            isUnlocked: false,
                            isFree: true,
                            rank: 0,
                            playStart: 0,
                            length: 0,
                            streamUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                            trailerUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                        }
                    ]
                }
            ]
        }
    end if
    
    for each rowData in data.rows
        row = root.createChild("ContentNode")
        row.title = rowData.title
        for each itemData in rowData.items
            item = row.createChild("ContentNode")
            item.id = itemData.id
            item.title = itemData.title
            item.description = itemData.description
            item.hdPosterUrl = itemData.hdPosterUrl
            item.url = itemData.streamUrl
            if itemData.streamFormat <> invalid
                item.streamFormat = itemData.streamFormat
            else
                item.streamFormat = "mp4"
            end if
            
            ' Custom fields
            item.addFields({
                isUnlocked: itemData.isUnlocked,
                isFree: itemData.isFree,
                trailerUrl: itemData.trailerUrl,
                rank: itemData.rank,
                playStart: itemData.playStart,
                length: itemData.length
            })
        next
    next
    
    return root
end function
