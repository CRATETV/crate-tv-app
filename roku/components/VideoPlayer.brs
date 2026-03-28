sub init()
    m.video = m.top.findNode("video")
    m.paywall = m.top.findNode("paywall")
    m.qrCode = m.top.findNode("qrCode")
    m.buyBtn = m.top.findNode("buyBtn")
    
    m.video.observeField("state", "onVideoStateChange")
    m.video.observeField("bufferingStatus", "onBufferingStatusChange")
end sub

sub onContentChange()
    content = m.top.content
    if content <> invalid
        ' Check paywall status
        if content.isUnlocked = true or content.isFree = true
            m.paywall.visible = false
            m.video.visible = true
            m.video.content = content
            m.video.control = "play"
            m.video.setFocus(true)
        else
            m.paywall.visible = true
            m.video.visible = false
            m.video.content = invalid
            m.video.control = "stop"
            m.buyBtn.setFocus(true)
            ShowPaywall(content)
        end if
    end if
end sub

sub ShowPaywall(content)
    purchaseUrl = "https://cratetv.net/movie/" + content.id + "?action=buy"
    ut = CreateObject("roUrlTransfer")
    encodedUrl = ut.Escape(purchaseUrl)
    m.qrCode.uri = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodedUrl
end sub

sub onVideoStateChange()
    m.top.state = m.video.state
end sub

sub onBufferingStatusChange()
    m.top.bufferingStatus = m.video.bufferingStatus
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "OK" and m.paywall.visible
            ' Close the player if they click "CLOSE"
            m.top.command = { action: "close" }
            return true
        else if key = "back"
            m.video.control = "stop"
            return false ' Let parent handle back
        end if
    end if
    return false
end function
