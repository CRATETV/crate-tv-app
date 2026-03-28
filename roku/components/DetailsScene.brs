sub init()
    m.top.setFocus(true)
    m.titleLabel = m.top.findNode("titleLabel")
    m.genresLabel = m.top.findNode("genresLabel")
    m.synopsisLabel = m.top.findNode("synopsisLabel")
    m.itemPoster = m.top.findNode("itemPoster")
    m.playBtn = m.top.findNode("playBtn")
    m.paywallGroup = m.top.findNode("paywallGroup")
    m.qrCode = m.top.findNode("qrCode")
    m.trailerBtn = m.top.findNode("trailerBtn")
    
    m.focusedButton = "play" ' Default focus
end sub

sub onContentChange()
    content = m.top.content
    if content <> invalid
        m.titleLabel.text = content.title
        
        ' Display genres if available
        if content.genres <> invalid and content.genres.count() > 0
            genresText = ""
            for i = 0 to content.genres.count() - 1
                genresText = genresText + content.genres[i]
                if i < content.genres.count() - 1
                    genresText = genresText + " | "
                end if
            next
            m.genresLabel.text = genresText.toUpper()
        else
            m.genresLabel.text = ""
        end if

        m.synopsisLabel.text = content.description
        m.itemPoster.uri = content.hdPosterUrl
        
        ' Check paywall status
        isLocked = (content.isUnlocked = false and content.isFree = false)
        if not isLocked
            m.playBtn.visible = true
            m.paywallGroup.visible = false
            m.focusedButton = "play"
        else
            m.playBtn.visible = false
            m.paywallGroup.visible = true
            m.focusedButton = "trailer"
            ShowPaywall(content)
        end if
        
        ' Show trailer button if URL exists
        if content.trailerUrl <> invalid and content.trailerUrl <> ""
            m.trailerBtn.visible = true
        else
            m.trailerBtn.visible = false
        end if
        
        UpdateFocus()
    end if
end sub

sub UpdateFocus()
    if m.focusedButton = "play"
        m.playBtn.color = "#EF4444" ' Highlight color
        m.trailerBtn.color = "#333333"
    else if m.focusedButton = "trailer"
        m.trailerBtn.color = "#EF4444" ' Highlight color
        m.playBtn.color = "#FFFFFF"
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "up" or key = "down"
            if m.playBtn.visible and m.trailerBtn.visible
                if m.focusedButton = "play"
                    m.focusedButton = "trailer"
                else
                    m.focusedButton = "play"
                end if
                UpdateFocus()
                return true
            end if
        else if key = "OK"
            if m.focusedButton = "play" and m.playBtn.visible
                m.top.command = { action: "play", content: m.top.content }
            else if m.focusedButton = "trailer" and m.trailerBtn.visible
                ' Create a temporary content node for the trailer
                trailerContent = CreateObject("roSGNode", "ContentNode")
                trailerContent.url = m.top.content.trailerUrl
                trailerContent.title = m.top.content.title + " (Trailer)"
                trailerContent.streamFormat = "mp4"
                
                m.top.command = { action: "play", content: trailerContent }
            end if
            return true
        end if
    end if
    return false
end function

sub ShowPaywall(content)
    ' Generate QR code for purchase
    ' Using a public QR API for simplicity
    purchaseUrl = "https://cratetv.net/movie/" + content.id + "?action=buy"
    
    ' BrightScript doesn't have EncodeUriComponent on strings.
    ' We use roUrlTransfer to escape the URL.
    ut = CreateObject("roUrlTransfer")
    encodedUrl = ut.Escape(purchaseUrl)
    
    m.qrCode.uri = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodedUrl
end sub
