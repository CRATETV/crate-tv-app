sub init()
    m.viewport = m.top.findNode("viewport")
    m.navBar = m.top.findNode("navBar")
    m.spinner = m.top.findNode("spinner")
    
    ' Get device ID for personalized feed
    di = CreateObject("roDeviceInfo")
    m.deviceId = di.GetChannelClientId()
    
    m.contentTask = CreateObject("roSGNode", "ContentTask")
    m.contentTask.observeField("content", "onContentReady")
    ' Append deviceId to URL for personalized content (Requirement 3.1)
    m.contentTask.url = "https://cratetv.net/api/roku-feed?deviceId=" + m.deviceId
    m.contentTask.control = "run"
end sub

sub onContentReady()
    m.spinner.visible = false
    m.viewport.visible = true
    m.navBar.visible = true
    
    ShowHome()
end sub

sub ShowHome()
    m.viewport.removeChildren(m.viewport.getChildren(-1, 0))
    m.homeScene = m.viewport.createChild("HomeScene")
    m.homeScene.content = m.contentTask.content
    m.homeScene.observeField("command", "onCommand")
    m.homeScene.setFocus(true)
end sub

sub ShowDetails(content)
    m.viewport.removeChildren(m.viewport.getChildren(-1, 0))
    m.detailsScene = m.viewport.createChild("DetailsScene")
    m.detailsScene.content = content
    m.detailsScene.observeField("command", "onCommand")
    m.detailsScene.setFocus(true)
end sub

sub ShowPlayer(content)
    m.viewport.removeChildren(m.viewport.getChildren(-1, 0))
    m.videoPlayer = m.viewport.createChild("VideoPlayer")
    m.videoPlayer.content = content
    m.videoPlayer.observeField("command", "onCommand")
    m.videoPlayer.setFocus(true)
end sub

sub ShowAccountLink()
    m.viewport.removeChildren(m.viewport.getChildren(-1, 0))
    m.accountLinkScene = m.viewport.createChild("AccountLinkScene")
    m.accountLinkScene.observeField("command", "onCommand")
    m.accountLinkScene.setFocus(true)
end sub

sub onCommand(event)
    command = event.getData()
    if command <> invalid
        if command.action = "details"
            ShowDetails(command.content)
        else if command.action = "play"
            ShowPlayer(command.content)
        else if command.action = "close"
            ShowHome()
        else if command.action = "link"
            ShowAccountLink()
        else if command.action = "linked"
            ' Refresh content after linking
            m.spinner.visible = true
            m.viewport.visible = false
            m.contentTask.control = "run"
        end if
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "back"
            ' Handle back navigation
            currentView = m.viewport.getChild(0)
            if currentView <> invalid
                if type(currentView) = "DetailsScene" or type(currentView) = "VideoPlayer"
                    ShowHome()
                    return true
                end if
            end if
        end if
    end if
    return false
end function
