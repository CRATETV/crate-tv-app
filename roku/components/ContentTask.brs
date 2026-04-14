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
                m.top.heroItems = CreateHeroNodes(data.heroItems)
                m.top.content = CreateContentTree(data)
                return
            end if
        end if
    end if
    
    m.top.content = CreateContentTree(invalid)
end sub

' Build hero items as a separate node for HomeScene
function CreateHeroNodes(heroItems)
    root = CreateObject("roSGNode", "ContentNode")
    if heroItems = invalid then return root
    for each item in heroItems
        node = root.createChild("ContentNode")
        MapItemToNode(node, item)
    end for
    return root
end function

function CreateContentTree(data)
    root = CreateObject("roSGNode", "ContentNode")
    
    if data <> invalid and data.categories <> invalid
        for each rowData in data.categories
            row = root.createChild("ContentNode")
            row.title = rowData.title
            if rowData.type <> invalid then row.addFields({ rowType: rowData.type })
            if rowData.categoryType <> invalid then row.addFields({ categoryType: rowData.categoryType })
            for each itemData in rowData.children
                item = row.createChild("ContentNode")
                MapItemToNode(item, itemData)
            end for
        next
        return root
    end if

    return root
end function

' Central mapping — all fields in one place
sub MapItemToNode(item as Object, data as Object)
    ' Core content fields
    item.id = data.id
    item.title = data.title
    item.description = data.description
    item.hdPosterUrl = data.hdPosterUrl
    item.url = data.streamUrl

    if data.streamFormat <> invalid
        item.streamFormat = data.streamFormat
    else
        item.streamFormat = "mp4"
    end if

    ' All custom fields — everything the web app shows
    item.addFields({
        ' Playback
        trailerUrl:       data.trailerUrl,
        trailerStart:     data.trailerStart,
        playStart:        data.playStart,
        length:           data.length,

        ' Display — hero uses wide image, poster uses portrait
        heroImage:        data.heroImage,     ' wide 1920x800 format
        tvPoster:         data.tvPoster,      ' TV-optimised portrait poster
        poster:           data.poster,        ' original poster

        ' Metadata
        director:         data.director,
        runtime:          data.runtime,
        year:             data.year,
        genres:           data.genres,
        cast:             data.cast,

        ' Awards
        awardName:        data.awardName,
        awardYear:        data.awardYear,
        customLaurelUrl:  data.customLaurelUrl,

        ' Paywall / access
        isUnlocked:       data.isUnlocked,
        isFree:           data.isFree,
        isForSale:        data.isForSale,
        isWatchPartyPaid: data.isWatchPartyPaid,
        salePrice:        data.salePrice,
        purchaseUrl:      data.purchaseUrl,

        ' Rankings
        rank:             data.rank,

        ' Festival / live
        isFestival:       data.isFestival,
        live:             data.live,
        isWatchPartyEnabled: data.isWatchPartyEnabled
    })
end sub
