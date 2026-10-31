' ##############################################################################
' CRATE TV - Link this Roku (layout + how linking works: AccountLinkScene.xml)
' ##############################################################################
'
' STEPS
'   1. FetchLinkCode: ask cratetv.net for a code for this Roku (ContentTask
'      "getLinkCode"), show it, and draw the QR code that opens
'      cratetv.net/link?code=<code>.
'   2. Every AUTH_POLL_INTERVAL seconds (Config.brs), ask whether the code has
'      been used (ContentTask "pollAuth").
'   3. Linked -> save the name/email for the Account tab and tell MainScene
'      (linkComplete), which reloads Home with the viewer's films unlocked.
'   After ~10 minutes without a link, a fresh code is fetched automatically.
'
' KEYS: OK or Back = "Not now". (If the code couldn't load, OK retries.)
' ##############################################################################

Sub Init()
    m.linkCodeLabel = m.top.FindNode("linkCodeLabel")
    m.statusLabel = m.top.FindNode("statusLabel")
    m.errorLabel = m.top.FindNode("errorLabel")
    m.codeSpinner = m.top.FindNode("codeSpinner")
    m.skipButtonBg = m.top.FindNode("skipButtonBg")
    m.skipButtonLabel = m.top.FindNode("skipButtonLabel")
    m.qrCode = m.top.FindNode("qrCode")
    
    m.isPolling = false
    m.pollAttempts = 0
    m.maxPollAttempts = 120          ' x 5 seconds = 10 minutes, then a fresh code
    m.skipButtonFocused = false
    
    m.theme = GetThemeConfig()
    
    ' Create poll timer
    m.pollTimer = CreateObject("roSGNode", "Timer")
    m.pollTimer.duration = GetApiConfig().AUTH_POLL_INTERVAL
    m.pollTimer.repeat = true
    m.pollTimer.ObserveField("fire", "OnPollTimer")
    
    ' Initial state
    UpdateSkipButtonFocus(true)
    
    ' Start by fetching link code
    FetchLinkCode()
End Sub

' =============================================================================
' LINK CODE FETCHING -- Uses ContentTask with taskType="getLinkCode"
' =============================================================================
Sub FetchLinkCode()
    m.codeSpinner.visible = true
    m.linkCodeLabel.text = ""
    m.qrCode.uri = ""
    m.statusLabel.text = "Getting your code..."
    m.errorLabel.visible = false
    
    deviceId = ""
    If m.global <> Invalid And m.global.HasField("deviceId") And m.global.deviceId <> Invalid
        deviceId = m.global.deviceId
    End If
    
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "getLinkCode"
    task.deviceId = deviceId
    task.ObserveField("taskStatus", "OnLinkCodeTaskComplete")
    task.control = "run"
    
    m.linkCodeTask = task
    Print "CrateTV [Link]: Fetching link code..."
End Sub

Sub OnLinkCodeTaskComplete()
    task = m.linkCodeTask
    If task = Invalid Then Return
    
    status = task.taskStatus
    If status = "running" Then Return
    
    m.codeSpinner.visible = false
    
    If status = "success"
        linkCode = task.linkCode
        If linkCode <> Invalid And linkCode <> ""
            m.top.linkCode = linkCode
            
            ' Format code with space for readability
            If Len(linkCode) = 6
                formattedCode = Left(linkCode, 3) + "  " + Mid(linkCode, 4, 3)
            Else
                formattedCode = linkCode
            End If
            
            m.linkCodeLabel.text = formattedCode
            m.statusLabel.text = "Waiting for you to link..."

            ' QR code -> cratetv.net/link?code=ABC123 (same free QR service the
            ' film page uses). Spaces/dashes removed; the website accepts either.
            plain = ""
            For ci = 1 To Len(linkCode)
                ch = UCase(Mid(linkCode, ci, 1))
                If (ch >= "A" And ch <= "Z") Or (ch >= "0" And ch <= "9") Then plain = plain + ch
            End For
            m.qrCode.uri = "https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=0&data=" + UrlEncode("https://cratetv.net/link?code=" + plain)
            
            ' Start polling for authentication
            StartAuthPolling()
            
            Print "CrateTV [Link]: Code displayed - " + linkCode
        Else
            ShowError("No code received. Press OK to retry.")
        End If
    Else
        errorMsg = task.errorMessage
        If errorMsg = Invalid Or errorMsg = "" Then errorMsg = "Unable to generate code"
        ShowError(errorMsg + ". Press OK to retry.")
        Print "CrateTV [Link]: Code fetch failed"
    End If
End Sub

' =============================================================================
' AUTH POLLING -- Uses ContentTask with taskType="pollAuth"
' =============================================================================
Sub StartAuthPolling()
    m.isPolling = true
    m.pollAttempts = 0
    m.pollTimer.control = "start"
    Print "CrateTV [Link]: Started auth polling"
End Sub

Sub StopAuthPolling()
    m.isPolling = false
    m.pollTimer.control = "stop"
    Print "CrateTV [Link]: Stopped auth polling"
End Sub

Sub OnPollTimer()
    If Not m.isPolling Then Return
    
    m.pollAttempts = m.pollAttempts + 1
    
    If m.pollAttempts >= m.maxPollAttempts
        ' Code is about to run out: quietly get a fresh one.
        StopAuthPolling()
        FetchLinkCode()
        Return
    End If
    
    deviceId = ""
    If m.global <> Invalid And m.global.HasField("deviceId") And m.global.deviceId <> Invalid
        deviceId = m.global.deviceId
    End If
    
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "pollAuth"
    task.deviceId = deviceId
    task.ObserveField("taskStatus", "OnAuthPollComplete")
    task.control = "run"
    
    m.authPollTask = task
End Sub

Sub OnAuthPollComplete()
    task = m.authPollTask
    If task = Invalid Then Return
    
    status = task.taskStatus
    If status = "running" Then Return
    
    If status = "success"
        If task.isLinked
            StopAuthPolling()
            m.statusLabel.text = "Linked! Loading your films..."
            m.statusLabel.color = "#4ADE80"
            
            ' Store auth token if provided
            If task.authToken <> Invalid And task.authToken <> ""
                StoreAuthToken(task.authToken)
            End If
            
            ' Store user display name and email
            If task.userName <> Invalid And task.userName <> ""
                RegistryWrite("userName", task.userName, GetRegistryConfig().SECTION)
            End If
            If task.userEmail <> Invalid And task.userEmail <> ""
                RegistryWrite("userEmail", task.userEmail, GetRegistryConfig().SECTION)
            End If
            If task.HasField("avatarUrl") And task.avatarUrl <> Invalid And task.avatarUrl <> ""
                RegistryWrite("avatarUrl", task.avatarUrl, GetRegistryConfig().SECTION)
            End If
            
            ' Notify parent after brief delay
            linkCompleteTimer = CreateObject("roSGNode", "Timer")
            linkCompleteTimer.duration = 1.5
            linkCompleteTimer.ObserveField("fire", "OnLinkCompleteDelay")
            linkCompleteTimer.control = "start"
            m.linkCompleteTimer = linkCompleteTimer
            
            Print "CrateTV [Link]: Device linked!"
        End If
    End If
    ' Don't show error for individual poll failures -- just keep polling
End Sub

Sub OnLinkCompleteDelay()
    m.top.linkComplete = true
End Sub

' =============================================================================
' ERROR HANDLING
' =============================================================================
Sub ShowError(message as String)
    m.errorLabel.text = message
    m.errorLabel.visible = true
    m.statusLabel.visible = false
    m.top.errorMessage = message
End Sub

Sub ClearError()
    m.errorLabel.visible = false
    m.statusLabel.visible = true
    m.errorLabel.text = ""
    m.top.errorMessage = ""
End Sub

' =============================================================================
' SKIP BUTTON
' =============================================================================
' "Not now" is the only button, so it always looks focused (white).
Sub UpdateSkipButtonFocus(focused as Boolean)
    m.skipButtonFocused = focused
    If focused
        m.skipButtonBg.uri = "pkg:/images/ui/btn_focus.9.png"
        m.skipButtonLabel.color = "#000000"
    Else
        m.skipButtonBg.uri = "pkg:/images/ui/btn_idle.9.png"
        m.skipButtonLabel.color = "#FFFFFF"
    End If
End Sub

Sub OnSkipPressed()
    StopAuthPolling()
    m.top.skipLink = true
    Print "CrateTV [Link]: User skipped"
End Sub

' =============================================================================
' KEY HANDLING
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    
    If key = "OK"
        If m.errorLabel.visible
            ClearError()
            FetchLinkCode()
            Return true
        End If
        OnSkipPressed()
        Return true
    End If
    
    If key = "back"
        OnSkipPressed()
        Return true
    End If
    
    If key = "up" Or key = "down" Or key = "left" Or key = "right"
        Return true
    End If
    
    Return false
End Function
