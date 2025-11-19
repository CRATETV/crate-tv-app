sub init()
    m.codeLabel = m.top.findNode("codeLabel")
    m.timer = m.top.findNode("pollTimer")
    m.timer.observeField("fire", "checkStatus")
    
    ' Get Code Immediately
    getCode()
end sub

sub getCode()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "getCode"
    task.observeField("linkCode", "onCodeReceived")
    task.control = "RUN"
end sub

sub onCodeReceived(event as Object)
    code = event.getData()
    if code <> invalid
        m.codeLabel.text = code
        m.timer.control = "start" ' Start polling only after we have a code
    end if
end sub

sub checkStatus()
    task = CreateObject("roSGNode", "APITask")
    task.requestType = "checkLink"
    task.observeField("authResult", "onStatusCheck")
    task.control = "RUN"
end sub

sub onStatusCheck(event as Object)
    res = event.getData()
    if res.linked = true
        m.timer.control = "stop"
        m.top.loginSuccess = true
    end if
end sub