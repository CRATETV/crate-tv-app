' ##############################################################################
' CRATE TV - Account tab logic (layout notes are in AccountScene.xml)
' ##############################################################################
'
' The name, email and photo come from linking (saved in the Roku's registry by
' AccountLinkScene.brs). KEYS: OK = the button; Up/Back = back to the menu.
' In the sign-out dialog: Left/Right choose, OK confirms, Back cancels.
' ##############################################################################

Sub Init()
    Print "CrateTV [Account]: Initializing..."
    
    m.userNameLabel = m.top.FindNode("userNameLabel")
    m.userEmailLabel = m.top.FindNode("userEmailLabel")
    m.statusValueLabel = m.top.FindNode("statusValueLabel")
    m.subscriptionLabel = m.top.FindNode("subscriptionLabel")
    m.subscriptionDetail = m.top.FindNode("subscriptionDetail")
    m.deviceModelLabel = m.top.FindNode("deviceModelLabel")
    m.deviceIdLabel = m.top.FindNode("deviceIdLabel")
    m.appVersionLabel = m.top.FindNode("appVersionLabel")
    m.avatarPoster = m.top.FindNode("avatarPoster")
    m.avatarFallback = m.top.FindNode("avatarFallback")
    m.avatarFallbackText = m.top.FindNode("avatarFallbackText")
    m.signOutBg = m.top.FindNode("signOutBg")
    m.confirmDialog = m.top.FindNode("confirmDialog")
    m.confirmYesBg = m.top.FindNode("confirmYesBg")
    m.confirmNoBg = m.top.FindNode("confirmNoBg")
    m.signOutLabel = m.top.FindNode("signOutLabel")
    m.confirmYesLabel = m.top.FindNode("confirmYesLabel")
    m.confirmNoLabel = m.top.FindNode("confirmNoLabel")
    
    m.theme = GetThemeConfig()
    m.focusedButton = "signout"
    m.dialogOpen = false
    
    PopulateAccountInfo()
    UpdateButtonFocus()
End Sub

Sub PopulateAccountInfo()
    regSection = GetRegistryConfig().SECTION
    di = CreateObject("roDeviceInfo")
    
    ' --- User Name (dynamic from linking) ---
    userName = RegistryRead("userName", regSection)
    If userName <> Invalid And userName <> ""
        m.userNameLabel.text = userName
    Else
        m.userNameLabel.text = "Crate TV Member"
    End If
    
    ' --- User Email ---
    userEmail = RegistryRead("userEmail", regSection)
    If userEmail <> Invalid And userEmail <> ""
        m.userEmailLabel.text = userEmail
    Else
        m.userEmailLabel.text = "Linked via device code"
    End If
    
    ' --- Avatar (from linking) ---
    ' Photo if we have one; otherwise the first letter of their name
    avatarUrl = RegistryRead("avatarUrl", regSection)
    If avatarUrl <> Invalid And avatarUrl <> ""
        m.avatarPoster.uri = avatarUrl
    Else
        m.avatarPoster.visible = false
    End If
    m.avatarFallbackText.text = UCase(Left(m.userNameLabel.text, 1))
    
    ' --- Status ---
    ' Not linked yet: the button links the account instead of "Sign Out".
    ' (Before Oct 2026 it said "Sign Out" even when nobody was signed in.)
    If IsDeviceLinked()
        m.statusValueLabel.text = "●  Linked to this Roku"
        m.statusValueLabel.color = "#4ADE80"
        m.signOutLabel.text = "Sign Out"
    Else
        m.statusValueLabel.text = "●  Not linked"
        m.statusValueLabel.color = "#EF4444"
        m.signOutLabel.text = "Link your account"
        m.userNameLabel.text = "Not linked yet"
        m.userEmailLabel.text = "Link to watch films you buy on cratetv.net"
        m.avatarFallbackText.text = "?"
    End If
    
    ' --- Subscription ---
    token = GetStoredAuthToken()
    If token <> Invalid And token <> ""
        m.subscriptionLabel.text = "Crate TV Member"
        m.subscriptionDetail.text = "Stream all available content"
    Else
        m.subscriptionLabel.text = "Free"
        m.subscriptionDetail.text = "Free films, plus anything you buy"
    End If
    
    ' --- Device ---
    modelName = di.GetModelDisplayName()
    If modelName = "" Then modelName = di.GetModel()
    m.deviceModelLabel.text = "Roku " + modelName
    
    deviceId = ""
    If m.global <> Invalid And m.global.HasField("deviceId") And m.global.deviceId <> Invalid
        deviceId = m.global.deviceId
    End If
    If Len(deviceId) > 16
        m.deviceIdLabel.text = "ID: " + Left(deviceId, 16) + "..."
    Else If deviceId <> ""
        m.deviceIdLabel.text = "ID: " + deviceId
    Else
        m.deviceIdLabel.text = ""
    End If
    
    ' --- Channel version (from the manifest, e.g. 2.2.1) ---
    m.appVersionLabel.text = "Crate TV " + CreateObject("roAppInfo").GetVersion()

    Print "CrateTV [Account]: User=" + m.userNameLabel.text + " Device=" + modelName
End Sub

' White = highlighted, grey = not (the same look as the film page buttons).
Sub UpdateButtonFocus()
    If m.dialogOpen
        SetButtonLook(m.confirmYesBg, m.confirmYesLabel, m.focusedButton = "confirm_yes")
        SetButtonLook(m.confirmNoBg,  m.confirmNoLabel,  m.focusedButton = "confirm_no")
        SetButtonLook(m.signOutBg,    m.signOutLabel,    false)
    Else
        SetButtonLook(m.signOutBg, m.signOutLabel, true)
    End If
End Sub

Sub SetButtonLook(bg as Object, label as Object, focused as Boolean)
    If focused
        bg.uri = "pkg:/images/ui/btn_focus.9.png"
        label.color = "#000000"
    Else
        bg.uri = "pkg:/images/ui/btn_idle.9.png"
        label.color = "#FFFFFF"
    End If
End Sub

Sub ShowConfirmDialog()
    m.dialogOpen = true
    m.confirmDialog.visible = true
    m.focusedButton = "confirm_no"
    UpdateButtonFocus()
End Sub

Sub HideConfirmDialog()
    m.dialogOpen = false
    m.confirmDialog.visible = false
    m.focusedButton = "signout"
    UpdateButtonFocus()
End Sub

Sub DoSignOut()
    Print "CrateTV [Account]: Signing out..."
    regSection = GetRegistryConfig().SECTION
    RegistryDelete("deviceLinked", regSection)
    RegistryDelete("authToken", regSection)
    RegistryDelete("userId", regSection)
    RegistryDelete("userName", regSection)
    RegistryDelete("userEmail", regSection)
    RegistryDelete("avatarUrl", regSection)
    m.top.signOutRequested = true
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    
    If m.dialogOpen
        If key = "left" Or key = "right"
            If m.focusedButton = "confirm_yes"
                m.focusedButton = "confirm_no"
            Else
                m.focusedButton = "confirm_yes"
            End If
            UpdateButtonFocus()
            Return true
        End If
        If key = "OK"
            If m.focusedButton = "confirm_yes" Then DoSignOut() Else HideConfirmDialog()
            Return true
        End If
        If key = "back"
            HideConfirmDialog()
            Return true
        End If
        Return true
    End If
    
    If key = "OK"
        If IsDeviceLinked()
            ShowConfirmDialog()
        Else
            m.top.signOutRequested = true     ' MainScene opens the link screen
        End If
        Return true
    End If
    
    If key = "up" Or key = "back"
        m.top.exitRequested = true
        Return true
    End If
    
    Return true  ' Consume all keys to prevent focus leak
End Function

' Watch streak + badges from the catalogue (roku-feed "viewer"), if linked.
Sub OnFeedData()
    fd = m.top.feedData
    If fd = Invalid Or Not IsDeviceLinked() Or Not fd.HasField("streakMonths") Then Return
    months = fd.streakMonths
    badges = ""
    If fd.HasField("badgeText") Then badges = fd.badgeText
    If months <= 0 And badges = "" Then Return
    If months = 1
        text = "1 month in a row"
    Else If months > 1
        text = Str(months).Trim() + " months in a row"
    Else
        text = "Watch this month to start one"
    End If
    If fd.HasField("bestStreakMonths") And fd.bestStreakMonths > months Then text = text + "  ·  best " + Str(fd.bestStreakMonths).Trim()
    m.top.FindNode("streakLabel").text = text
    If badges = "" Then badges = "None yet: finish a festival to earn one"
    m.top.FindNode("badgesLabel").text = badges
    m.top.FindNode("streakRow").visible = true
    m.top.FindNode("detailsCard").height = 400
    m.top.FindNode("buttonGroup").translation = [96, 850]
End Sub
