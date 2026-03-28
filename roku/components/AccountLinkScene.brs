' [CRATE_TV_FORGE_V4]
sub init()
    m.codeLabel = m.top.findNode("codeLabel")
    m.statusLabel = m.top.findNode("statusLabel")
    m.pollTimer = m.top.findNode("pollTimer")
    
    m.pollTimer.observeField("fire", "onPoll")
    
    ' Get device ID
    di = CreateObject("roDeviceInfo")
    m.deviceId = di.GetChannelClientId()
    
    GenerateLinkCode()
end sub

sub GenerateLinkCode()
    ' In a real app, you'd call an API to get a short code
    ' For now, we'll use a mock code or a hash of the device ID
    ' Actually, let's just use the last 6 chars of device ID for demo
    m.codeLabel.text = m.deviceId.right(6).toUpper()
    m.pollTimer.control = "start"
end sub

sub onPoll()
    ' Check if linked via API
    url = "https://cratetv.net/api/check-roku-link?deviceId=" + m.deviceId
    ut = CreateObject("roUrlTransfer")
    ut.SetUrl(url)
    ut.SetCertificatesFile("common:/certs/ca-bundle.crt")
    ut.InitClientCertificates()
    
    json = ut.GetToString()
    if json <> ""
        res = ParseJson(json)
        if res <> invalid and res.linked = true
            m.statusLabel.text = "Account Linked! Restarting..."
            m.statusLabel.color = "#22C55E" ' Green
            m.pollTimer.control = "stop"
            
            ' Notify parent to refresh content
            m.top.command = { action: "linked" }
        end if
    end if
end sub
