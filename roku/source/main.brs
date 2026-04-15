' ##############################################################################
' CRATE TV - Main Application Entry Point (CERTIFICATION READY 2025)
' Handles application launch, device identity, and deep linking
' 
' ROKU CERTIFICATION REQUIREMENTS ADDRESSED:
' - 5.1 Deep Linking: Full support for contentId and mediaType parameters
' - roInput handling for runtime deep links (critical for automation tests)
' - Proper event loop with both roSGScreenEvent and roInputEvent
' ##############################################################################

Sub Main(args as Dynamic)
    ' Initialize the SceneGraph application
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.SetMessagePort(m.port)
    
    ' Initialize global node for cross-component communication
    ' MUST be done before creating scene so deep link fields are available
    m.global = screen.GetGlobalNode()

    ' Detect resolution and store scale on m.global
    InitResolution()
    
    ' Generate and store device identity
    InitializeDeviceIdentity()
    
    ' Handle initial launch arguments BEFORE creating the scene
    ' This ensures deep link fields are set when MainScene initializes
    HandleDeepLink(args)
    
    ' Create the main scene (NOW it can access deep link globals)
    scene = screen.CreateScene("MainScene")
    screen.Show()

    ' roInput is REQUIRED for deep linking while the app is running
    m.input = CreateObject("roInput")
    m.input.SetMessagePort(m.port)
    
    ' Main event loop - must handle both screen events and input events
    While True
        msg = Wait(0, m.port)
        msgType = Type(msg)
        
        If msgType = "roSGScreenEvent"
            If msg.IsScreenClosed()
                Exit While
            End If
        Else If msgType = "roInputEvent"
            ' Handle runtime deep links (required for certification)
            ' This is triggered when the app is already running and Roku
            ' sends a new deep link via roInput
            HandleInputEvent(msg)
        End If
    End While
End Sub

' =============================================================================
' DEVICE IDENTITY MANAGEMENT
' =============================================================================
Sub InitializeDeviceIdentity()
    deviceInfo = CreateObject("roDeviceInfo")
    
    ' Use Roku's Channel Client ID for unique device identification
    ' This is consistent across app launches but unique per device
    deviceId = deviceInfo.GetChannelClientId()
    
    ' Store in global node for access across all components
    m.global.AddField("deviceId", "string", false)
    m.global.deviceId = deviceId
    
    ' Store additional device info for analytics
    m.global.AddField("deviceModel", "string", false)
    m.global.deviceModel = deviceInfo.GetModel()
    
    m.global.AddField("firmwareVersion", "string", false)
    ' Use GetOsVersion() instead of deprecated GetVersion()
    osVersion = deviceInfo.GetOsVersion()
    if osVersion <> Invalid and osVersion.major <> Invalid
        ' Convert to strings properly - fields may already be strings
        majorStr = Box(osVersion.major).ToStr()
        minorStr = Box(osVersion.minor).ToStr()
        revisionStr = Box(osVersion.revision).ToStr()
        m.global.firmwareVersion = majorStr + "." + minorStr + "." + revisionStr
    else
        m.global.firmwareVersion = "Unknown"
    end if
    
    m.global.AddField("displaySize", "assocarray", false)
    m.global.displaySize = deviceInfo.GetDisplaySize()
    
    ' Debug logging
    Print "CrateTV [Init]: Device ID - " + deviceId
    Print "CrateTV [Init]: Device Model - " + deviceInfo.GetModel()
    Print "CrateTV [Init]: OS Version - " + m.global.firmwareVersion
End Sub

' =============================================================================
' DEEP LINK HANDLING - INITIAL LAUNCH
' =============================================================================
' This function processes deep link parameters when the app is first launched
' with contentId and mediaType arguments (e.g., from Roku Search)
Sub HandleDeepLink(args as Dynamic)
    If args <> Invalid
        ' Ensure global fields exist
        If Not m.global.HasField("deepLinkContentId") Then
            m.global.AddField("deepLinkContentId", "string", false)
        End If
        If Not m.global.HasField("deepLinkMediaType") Then
            m.global.AddField("deepLinkMediaType", "string", false)
        End If
        
        ' =======================================================================
        ' ROKU 5.1: Handle contentId with CASE-INSENSITIVE matching
        ' =======================================================================
        ' Roku automation tests may use "contentId", "contentID", or "ContentId"
        ' We must check all variations to pass certification
        contentIdValue = ""
        If args.contentId <> Invalid And args.contentId <> ""
            contentIdValue = args.contentId
        Else If args.contentID <> Invalid And args.contentID <> ""
            contentIdValue = args.contentID
        Else If args.ContentId <> Invalid And args.ContentId <> ""
            contentIdValue = args.ContentId
        Else If args.ContentID <> Invalid And args.ContentID <> ""
            contentIdValue = args.ContentID
        End If
        
        If contentIdValue <> ""
            m.global.deepLinkContentId = contentIdValue
            Print "CrateTV [DeepLink]: Launch contentId = " + contentIdValue
        End If
        
        ' =======================================================================
        ' ROKU 5.1: Handle mediaType with CASE-INSENSITIVE matching
        ' =======================================================================
        ' Valid values: "movie", "episode", "series", "season", "shortFormVideo"
        mediaTypeValue = ""
        If args.mediaType <> Invalid And args.mediaType <> ""
            mediaTypeValue = args.mediaType
        Else If args.mediatype <> Invalid And args.mediatype <> ""
            mediaTypeValue = args.mediatype
        Else If args.MediaType <> Invalid And args.MediaType <> ""
            mediaTypeValue = args.MediaType
        Else If args.MEDIATYPE <> Invalid And args.MEDIATYPE <> ""
            mediaTypeValue = args.MEDIATYPE
        End If
        
        If mediaTypeValue <> ""
            m.global.deepLinkMediaType = mediaTypeValue
            Print "CrateTV [DeepLink]: Launch mediaType = " + mediaTypeValue
        End If
        
        ' Log all launch arguments for debugging certification issues
        Print "CrateTV [DeepLink]: All launch arguments:"
        For Each key In args
            Print "  " + key + " = " + Box(args[key]).ToStr()
        End For
    Else
        Print "CrateTV [DeepLink]: No launch arguments (normal startup)"
    End If
End Sub

' =============================================================================
' INPUT EVENT HANDLING - RUNTIME DEEP LINKS
' =============================================================================
' This function processes deep link parameters when the app is ALREADY RUNNING
' and receives a new deep link via roInputEvent (e.g., from voice search)
' 
' CRITICAL: This is tested by the Roku Automation Test (RTA) for certification.
' The test will:
' 1. Launch your app normally
' 2. Send a deep link with contentId/mediaType while app is running
' 3. Verify the app navigates to the correct content
Sub HandleInputEvent(msg as Object)
    info = msg.GetInfo()
    If info = Invalid Then Return

    ' Ensure global fields exist
    If Not m.global.HasField("deepLinkContentId") Then
        m.global.AddField("deepLinkContentId", "string", false)
    End If
    If Not m.global.HasField("deepLinkMediaType") Then
        m.global.AddField("deepLinkMediaType", "string", false)
    End If

    ' Handle contentId with case-insensitive matching (Roku 5.1)
    contentIdValue = ""
    If info.contentId <> Invalid And info.contentId <> ""
        contentIdValue = info.contentId
    Else If info.contentID <> Invalid And info.contentID <> ""
        contentIdValue = info.contentID
    Else If info.ContentId <> Invalid And info.ContentId <> ""
        contentIdValue = info.ContentId
    Else If info.ContentID <> Invalid And info.ContentID <> ""
        contentIdValue = info.ContentID
    End If
    
    If contentIdValue <> ""
        m.global.deepLinkContentId = contentIdValue
        Print "CrateTV [roInput]: contentId = " + contentIdValue
    End If

    ' Handle mediaType with case-insensitive matching (Roku 5.1)
    mediaTypeValue = ""
    If info.mediaType <> Invalid And info.mediaType <> ""
        mediaTypeValue = info.mediaType
    Else If info.mediatype <> Invalid And info.mediatype <> ""
        mediaTypeValue = info.mediatype
    Else If info.MediaType <> Invalid And info.MediaType <> ""
        mediaTypeValue = info.MediaType
    Else If info.MEDIATYPE <> Invalid And info.MEDIATYPE <> ""
        mediaTypeValue = info.MEDIATYPE
    End If
    
    If mediaTypeValue <> ""
        m.global.deepLinkMediaType = mediaTypeValue
        Print "CrateTV [roInput]: mediaType = " + mediaTypeValue
    End If
End Sub
