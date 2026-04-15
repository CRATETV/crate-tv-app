' ##############################################################################
' CRATE TV - Account Link Scene Controller
' Handles device linking with 6-digit code and auth polling
' FIXED: Properly uses ContentTask with taskStatus and linkCode fields
' ##############################################################################

Sub Init()
    m.linkCodeLabel = m.top.FindNode("linkCodeLabel")
    m.statusLabel = m.top.FindNode("statusLabel")
    m.errorLabel = m.top.FindNode("errorLabel")
    m.codeSpinner = m.top.FindNode("codeSpinner")
    m.skipButtonBg = m.top.FindNode("skipButtonBg")
    m.skipButtonLabel = m.top.FindNode("skipButtonLabel")
    m.focusRing = m.top.FindNode("focusRing")
    
    m.isPolling = false
    m.pollAttempts = 0
    m.maxPollAttempts = 60
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
    m.linkCodeLabel.text = "------"
    m.statusLabel.text = "Generating code..."
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
            m.statusLabel.text = "Waiting for link..."
            
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
        StopAuthPolling()
        ShowError("Link code expired. Press OK to get a new code.")
        Return
    End If
    
    remainingTime = (m.maxPollAttempts - m.pollAttempts) * GetApiConfig().AUTH_POLL_INTERVAL
    minutes = Int(remainingTime / 60)
    m.statusLabel.text = "Waiting for link... (" + Str(minutes).Trim() + " min remaining)"
    
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
            m.statusLabel.text = "Device linked successfully!"
            m.linkCodeLabel.color = "#00CC00"
            
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
    m.top.errorMessage = message
End Sub

Sub ClearError()
    m.errorLabel.visible = false
    m.errorLabel.text = ""
    m.top.errorMessage = ""
End Sub

' =============================================================================
' SKIP BUTTON
' =============================================================================
Sub UpdateSkipButtonFocus(focused as Boolean)
    m.skipButtonFocused = focused
    If focused
        m.skipButtonBg.color = m.theme.SURFACE_ELEVATED
        m.skipButtonLabel.color = m.theme.TEXT_PRIMARY
        m.focusRing.visible = true
    Else
        m.skipButtonBg.color = m.theme.SURFACE_LIGHT
        m.skipButtonLabel.color = m.theme.TEXT_SECONDARY
        m.focusRing.visible = false
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
        If m.skipButtonFocused
            OnSkipPressed()
            Return true
        End If
        If m.errorLabel.visible
            ClearError()
            FetchLinkCode()
            Return true
        End If
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
