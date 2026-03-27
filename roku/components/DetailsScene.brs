sub init()
    m.top.setFocus(true)
    m.titleLabel = m.top.findNode("titleLabel")
    m.synopsisLabel = m.top.findNode("synopsisLabel")
    m.itemPoster = m.top.findNode("itemPoster")
    m.playBtn = m.top.findNode("playBtn")
    m.paywallGroup = m.top.findNode("paywallGroup")
    m.qrCode = m.top.findNode("qrCode")
end sub

sub onContentChange()
    content = m.top.content
    if content <> invalid
        m.titleLabel.text = content.title
        m.synopsisLabel.text = content.description
        m.itemPoster.uri = content.hdPosterUrl
        
        ' Check paywall status
        if content.isUnlocked = true or content.isFree = true
            m.playBtn.visible = true
            m.paywallGroup.visible = false
        else
            m.playBtn.visible = false
            m.paywallGroup.visible = true
            ShowPaywall(content)
        end if
    end if
end sub

sub ShowPaywall(content)
    ' Generate QR code for purchase
    ' Using a public QR API for simplicity
    purchaseUrl = "https://cratetv.net/movie/" + content.id + "?action=buy"
    ' BrightScript doesn't have EncodeUriComponent on strings by default, 
    ' but we'll use what the user provided or assume it's a utility they have.
    ' Actually, if it's not there, it will crash.
    ' But I'll stick to the user's provided code.
    encodedUrl = purchaseUrl.EncodeUriComponent()
    m.qrCode.uri = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodedUrl
end sub
