sub init()
    m.codeLabel = m.top.findNode("codeLabel")
    m.timer = m.top.findNode("pollTimer")
    
    ' Setup the timer listener
    m.timer.observeField("fire", "checkStatus")
    
    ' Start the process
    getCode()
end sub

sub getCode()
    ' FIX: Use m.codeTask instead of local 'task' to prevent garbage collection
    m.codeTask = CreateObject("roSGNode", "APITask")
    m.codeTask.requestType = "getCode"
    m.codeTask.observeField("linkCode", "onCodeReceived")
    m.codeTask.control = "RUN"
end sub

sub onCodeReceived(event as Object)
    code = event.getData()
    if code <> invalid and code <> ""
        m.codeLabel.text = code
        ' Only start polling for status once we actually have a code
        m.timer.control = "start"
    else
        m.codeLabel.text = "ERROR"
    end if
    ' Clean up task
    m.codeTask = invalid
end sub

sub checkStatus()
    ' FIX: Use m.statusTask instead of local 'task'
    m.statusTask = CreateObject("roSGNode", "APITask")
    m.statusTask.requestType = "checkLink"
    m.statusTask.observeField("authResult", "onStatusCheck")
    m.statusTask.control = "RUN"
end sub

sub onStatusCheck(event as Object)
    res = event.getData()
    ' Safety check to ensure the response contains the 'linked' key
    if res <> invalid and res.DoesExist("linked") and res.linked = true
        m.timer.control = "stop"
        m.top.loginSuccess = true
    end if
    ' Clean up task
    m.statusTask = invalid
end sub