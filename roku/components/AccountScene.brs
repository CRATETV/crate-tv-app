' ##############################################################################
' CRATE TV - Account Scene Controller
' Dynamic identity (name + avatar from linking), proper spacing, sign out.
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
    avatarUrl = RegistryRead("avatarUrl", regSection)
    If avatarUrl <> Invalid And avatarUrl <> ""
        m.avatarPoster.uri = avatarUrl
        m.avatarFallback.visible = false
        m.avatarFallbackText.visible = false
    Else
        m.avatarPoster.visible = false
    End If
    
    ' --- Status ---
    If IsDeviceLinked()
        m.statusValueLabel.text = "Linked"
        m.statusValueLabel.color = "#4ADE80"
    Else
        m.statusValueLabel.text = "Not Linked"
        m.statusValueLabel.color = "#EF4444"
    End If
    
    ' --- Subscription ---
    token = GetStoredAuthToken()
    If token <> Invalid And token <> ""
        m.subscriptionLabel.text = "Crate TV Member"
        m.subscriptionDetail.text = "Stream all available content"
    Else
        m.subscriptionLabel.text = "Free Tier"
        m.subscriptionDetail.text = "Watch free films on Crate TV"
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
    
    ' --- Version ---
    deviceInfo = CreateObject("roDeviceInfo")
    osVersion = deviceInfo.GetOsVersion()
    if osVersion <> Invalid and osVersion.major <> Invalid
        ' Convert to strings properly
        majorStr = Box(osVersion.major).ToStr()
        minorStr = Box(osVersion.minor).ToStr()
        m.appVersionLabel.text = "v" + majorStr + "." + minorStr
    else
        m.appVersionLabel.text = "v1.0"
    end if
    
    Print "CrateTV [Account]: User=" + m.userNameLabel.text + " Device=" + modelName
End Sub

Sub UpdateButtonFocus()
    If m.dialogOpen
        If m.focusedButton = "confirm_yes"
            m.confirmYesBg.color = m.theme.PRIMARY_ACCENT
            m.confirmNoBg.color = m.theme.SURFACE_LIGHT
        Else
            m.confirmYesBg.color = m.theme.SURFACE_LIGHT
            m.confirmNoBg.color = m.theme.PRIMARY_ACCENT
        End If
        m.signOutBg.color = m.theme.SURFACE_LIGHT
    Else
        m.signOutBg.color = m.theme.PRIMARY_ACCENT
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
        ShowConfirmDialog()
        Return true
    End If
    
    If key = "up" Or key = "back"
        m.top.exitRequested = true
        Return true
    End If
    
    Return true  ' Consume all keys to prevent focus leak
End Function
