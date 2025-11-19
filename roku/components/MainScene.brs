sub init()
    m.sceneContainer = m.top.findNode("sceneContainer")
    m.globalSpinner = m.top.findNode("globalSpinner")
    checkLoginStatus()
end sub

sub checkLoginStatus()
    m.authTask = CreateObject("roSGNode", "APITask")
    m.authTask.requestType = "checkLink"
    m.authTask.observeField("authResult", "onAuthResult")
    m.authTask.control = "RUN"
end sub

sub onAuthResult()
    result = m.authTask.authResult
    m.globalSpinner.visible = false
    
    if result <> invalid and result.linked = true
        showHome()
    else
        showLogin()
    end if
end sub

sub showLogin()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    loginScreen = CreateObject("roSGNode", "AccountLinkScene")
    loginScreen.observeField("loginSuccess", "onLoginSuccess")
    m.sceneContainer.appendChild(loginScreen)
    loginScreen.setFocus(true)
end sub

sub showHome()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    homeScreen = CreateObject("roSGNode", "HomeScene")
    m.sceneContainer.appendChild(homeScreen)
    homeScreen.setFocus(true)
end sub

sub onLoginSuccess()
    showHome()
end sub