sub init()
    m.sceneContainer = m.top.findNode("sceneContainer")
    m.globalSpinner = m.top.findNode("globalSpinner")
    checkLogin()
end sub

sub checkLogin()
    m.authTask = CreateObject("roSGNode", "APITask")
    m.authTask.requestType = "checkLink"
    m.authTask.observeField("authResult", "onAuthResult")
    m.authTask.control = "RUN"
end sub

sub onAuthResult()
    res = m.authTask.authResult
    m.globalSpinner.visible = false
    if res <> invalid and res.linked = true
        showHome()
    else
        showLogin()
    end if
end sub

sub showLogin()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    node = CreateObject("roSGNode", "AccountLinkScene")
    node.observeField("loginSuccess", "onLoginSuccess")
    m.sceneContainer.appendChild(node)
    node.setFocus(true)
end sub

sub showHome()
    m.sceneContainer.removeChildren(m.sceneContainer.getChildren(-1, 0))
    node = CreateObject("roSGNode", "HomeScene")
    m.sceneContainer.appendChild(node)
    node.setFocus(true)
end sub

sub onLoginSuccess()
    showHome()
end sub