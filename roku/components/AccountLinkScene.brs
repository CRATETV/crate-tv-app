sub init()
    ' References
    m.linkGroup = m.top.findNode("linkCodeGroup")
    m.emailGroup = m.top.findNode("emailGroup")
    m.passGroup = m.top.findNode("passwordGroup")
    m.codeLabel = m.top.findNode("codeLabel")
    m.userEmailDisplay = m.top.findNode("userEmailDisplay")
    m.emailKeyboard = m.top.findNode("emailKeyboard")
    m.passKeyboard = m.top.findNode("passKeyboard")
    
    ' Buttons
    m.btnGoToEmail = m.top.findNode("btnGoToEmail")
    m.btnNextToPass = m.top.findNode("btnNextToPass")
    m.btnBackToLink = m.top.findNode("btnBackToLink")
    m.btnLogin = m.top.findNode("btnLogin")
    m.btnBackToEmail = m.top.findNode("btnBackToEmail")
    
    ' Secure Mode
    m.passKeyboard.textEditBox.secureMode = true
    
    ' 1. GENERATE CODE
    m.codeLabel.text = "GENERATING..."
    m.linkTask = CreateObject("roSGNode", "LinkTask")
    m.linkTask.observeField("code", "onCodeReceived")
    m.linkTask.control = "RUN"
    
    ' 2. START POLLING (The Fix)
    m.pollTimer = m.top.findNode("pollTimer")
    m.pollTimer.observeField("fire", "checkStatus")
    m.pollTimer.control = "start"
    
    ' Observers
    m.btnGoToEmail.observeField("buttonSelected", "showEmailScreen")
    m.btnNextToPass.observeField("buttonSelected", "showPasswordScreen")
    m.btnBackToLink.observeField("buttonSelected", "showLinkScreen")
    m.btnLogin.observeField("buttonSelected", "doLogin")
    m.btnBackToEmail.observeField("buttonSelected", "showEmailScreen")
    
    m.top.observeField("focusedChild", "onFocusChange")
end sub

sub onCodeReceived()
    m.codeLabel.text = m.linkTask.code
end sub

' --- POLLING LOGIC ---
sub checkStatus()
    ' Only check if we are actually on the Link Screen
    if m.linkGroup.visible = true
        m.statusTask = CreateObject("roSGNode", "StatusTask")
        m.statusTask.observeField("isLinked", "onStatusResult")
        m.statusTask.control = "RUN"
    end if
end sub

sub onStatusResult(event)
    isLinked = event.getData()
    if isLinked = true
        print "DEVICE LINK CONFIRMED!"
        m.pollTimer.control = "stop"
        m.top.loginSuccess = true
    end if
end sub
' ---------------------

sub onFocusChange()
    if m.top.hasFocus()
        if m.linkGroup.visible
            m.btnGoToEmail.setFocus(true)
        else if m.emailGroup.visible
            m.emailKeyboard.setFocus(true)
        else if m.passGroup.visible
            m.passKeyboard.setFocus(true)
        end if
    end if
end sub

sub showLinkScreen()
    m.emailGroup.visible = false
    m.passGroup.visible = false
    m.linkGroup.visible = true
    m.btnGoToEmail.setFocus(true)
end sub

sub showEmailScreen()
    m.linkGroup.visible = false
    m.passGroup.visible = false
    m.emailGroup.visible = true
    m.emailKeyboard.setFocus(true)
end sub

sub showPasswordScreen()
    if m.emailKeyboard.text <> ""
        m.userEmailDisplay.text = "Logging in as: " + m.emailKeyboard.text
        m.emailGroup.visible = false
        m.passGroup.visible = true
        m.passKeyboard.setFocus(true)
    else
        m.emailKeyboard.setFocus(true)
    end if
end sub

sub doLogin()
    m.top.loginSuccess = true
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "down"
            if m.emailGroup.visible and m.emailKeyboard.isInFocusChain()
                m.btnNextToPass.setFocus(true)
                return true
            else if m.passGroup.visible and m.passKeyboard.isInFocusChain()
                m.btnLogin.setFocus(true)
                return true
            end if
        else if key = "up"
            if m.emailGroup.visible and (m.btnNextToPass.hasFocus() or m.btnBackToLink.hasFocus())
                m.emailKeyboard.setFocus(true)
                return true
            else if m.passGroup.visible and (m.btnLogin.hasFocus() or m.btnBackToEmail.hasFocus())
                m.passKeyboard.setFocus(true)
                return true
            end if
        else if key = "right"
            if m.emailGroup.visible and m.btnNextToPass.hasFocus()
                m.btnBackToLink.setFocus(true)
                return true
            else if m.passGroup.visible and m.btnLogin.hasFocus()
                m.btnBackToEmail.setFocus(true)
                return true
            end if
        else if key = "left"
            if m.emailGroup.visible and m.btnBackToLink.hasFocus()
                m.btnNextToPass.setFocus(true)
                return true
            else if m.passGroup.visible and m.btnBackToEmail.hasFocus()
                m.btnLogin.setFocus(true)
                return true
            end if
        end if
    end if
    return false
end function
