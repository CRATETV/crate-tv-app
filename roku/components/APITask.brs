sub init()
    m.top.functionName = "routeRequest"
end sub

sub routeRequest()
    type = m.top.requestType
    
    if type = "feed"
        fetchFeed()
    else if type = "getCode"
        fetchCode()
    else if type = "checkLink"
        checkLink()
    end if
end sub

function getDeviceId()
    di = CreateObject("roDeviceInfo")
    return di.GetChannelClientId()
end function

sub fetchCode()
    url = GetApiUrl() + "/get-roku-link-code?deviceId=" + getDeviceId()
    ' ... perform request, ParseJson ...
    m.top.linkCode = json.code
end sub

sub checkLink()
    url = GetApiUrl() + "/check-roku-link-status?deviceId=" + getDeviceId()
    ' ... perform request, ParseJson ...
    m.top.authResult = json
end sub

sub fetchFeed()
    ' Standard feed fetch logic ...
end sub