sub init()
    ' References
    m.linkGroup = m.top.findNode("linkGroup")
    m.loginGroup = m.top.findNode("loginGroup")
    
    m.codeLabel = m.top.findNode("codeLabel")
    m.signInBtn = m.top.findNode("signInBtn")
    
    m.keyboard = m.top.findNode("keyboard")
    m.inputText = m.top.findNode("inputText")
    m.loginTitle = m.top.findNode("loginTitle")
    m.statusLabel = m.top.findNode("statusLabel")
    m.backBtn = m.top.findNode("backBtn")
    m.pollTimer = m.top.findNode("pollTimer")

    ' State
    m.email = ""
    m.password = ""
    m.inputMode = "email" ' or "password"

    ' Observers
    m.pollTimer.observeField("fire", "checkStatus")
    m.signInBtn.observeField("buttonSelected", "onShowLogin")
    m.backBtn.observeField("buttonSelected", "onShowLink")
    m.keyboard.observeField("text", "onKeyboardText")
    m.keyboard.observeField("buttonSelected", "onKeyboardAction")

    ' Start Code Process
    getCode()
    m.signInBtn.setFocus(true)
end sub

sub getCode()
    m.codeTask = CreateObject("roSGNode", "APITask")
    m.codeTask.requestType = "getCode"
    m.codeTask.observeField("linkCode", "onCodeReceived")
    m.codeTask.control = "RUN"
end sub

sub onCodeReceived(event as Object)
    code = event.getData()
    if code <> invalid and code <> ""
        m.codeLabel.text = code
        m.pollTimer.control = "start"
    else
        m.codeLabel.text = "ERROR"
    end if
end sub

sub checkStatus()
    m.statusTask = CreateObject("roSGNode", "APITask")
    m.statusTask.requestType = "checkLink"
    m.statusTask.observeField("authResult", "onStatusCheck")
    m.statusTask.control = "RUN"
end sub

sub onStatusCheck(event as Object)
    res = event.getData()
    if res <> invalid and res.linked = true
        m.pollTimer.control = "stop"
        m.top.loginSuccess = true
    end if
end sub

' --- LOGIN FLOW ---

sub onShowLogin()
    m.linkGroup.visible = false
    m.loginGroup.visible = true
    m.pollTimer.control = "stop" ' Stop polling while typing
    
    ' Reset to Email mode
    m.inputMode = "email"
    m.loginTitle.text = "Enter Email Address"
    m.keyboard.text = ""
    m.keyboard.textEditBox.secureMode = false
    m.inputText.text = ""
    m.keyboard.setFocus(true)
end sub

sub onShowLink()
    m.loginGroup.visible = false
    m.linkGroup.visible = true
    m.pollTimer.control = "start"
    m.signInBtn.setFocus(true)
end sub

sub onKeyboardText(event as Object)
    m.inputText.text = event.getData()
end sub

sub onKeyboardAction()
    text = m.keyboard.text
    
    if m.inputMode = "email"
        if text = ""
            m.statusLabel.text = "Please enter an email address"
            return
        end if
        
        ' Switch to Password Mode
        m.email = text
        m.inputMode = "password"
        m.loginTitle.text = "Enter Password"
        m.inputText.text = ""
        m.keyboard.text = ""
        m.keyboard.textEditBox.secureMode = true
        m.statusLabel.text = ""
        
    else if m.inputMode = "password"
        if text = ""
            m.statusLabel.text = "Please enter a password"
            return
        end if
        
        m.password = text
        performLogin()
    end if
end sub

sub performLogin()
    m.statusLabel.text = "Signing in..."
    m.keyboard.enabled = false
    
    m.loginTask = CreateObject("roSGNode", "APITask")
    m.loginTask.requestType = "login"
    ' Pass params via fields we will add to APITask
    m.loginTask.email = m.email
    m.loginTask.password = m.password
    
    m.loginTask.observeField("authResult", "onLoginResult")
    m.loginTask.control = "RUN"
end sub

sub onLoginResult(event as Object)
    res = event.getData()
    m.keyboard.enabled = true
    
    if res <> invalid and res.success = true
        m.statusLabel.text = "Success!"
        m.top.loginSuccess = true
    else
        m.statusLabel.text = "Login Failed. Invalid email or password."
        ' Reset to password retry
        m.keyboard.text = ""
        m.inputText.text = ""
        m.keyboard.setFocus(true)
    end if
end sub

' Handle Back Button to escape keyboard
function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and key = "back"
        if m.loginGroup.visible = true
            if m.inputMode = "password"
                ' Go back to email
                onShowLogin()
                return true
            else
                ' Go back to code screen
                onShowLink()
                return true
            end if
        end if
    end if
    return false
end function