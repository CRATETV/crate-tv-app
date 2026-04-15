' ##############################################################################
' CRATE TV - Configuration Module
' Global constants, API endpoints, and theme definitions
' ##############################################################################

Function GetApiConfig() as Object
    return {
        BASE_URL: "https://cratetv.net/api"
        FEED_ENDPOINT: "/roku-feed"
        LINK_CODE_ENDPOINT: "/get-roku-link-code"
        POLL_AUTH_ENDPOINT: "/roku/poll-auth"
        MARK_WATCHED_ENDPOINT: "/roku-mark-watched"
        AUTH_POLL_INTERVAL: 5
        AUTH_POLL_TIMEOUT: 300
        REQUEST_TIMEOUT: 30000
        RETRY_ATTEMPTS: 3
        RETRY_DELAY: 2000
    }
End Function

Function BuildFeedUrl(deviceId as String) as String
    config = GetApiConfig()
    return config.BASE_URL + config.FEED_ENDPOINT + "?deviceId=" + deviceId
End Function

Function BuildLinkCodeUrl(deviceId as String) as String
    config = GetApiConfig()
    return config.BASE_URL + config.LINK_CODE_ENDPOINT + "?deviceId=" + deviceId
End Function

Function BuildPollAuthUrl(deviceId as String) as String
    config = GetApiConfig()
    return config.BASE_URL + config.POLL_AUTH_ENDPOINT + "?device_code_id=" + deviceId
End Function

Function GetMarkWatchedUrl() as String
    config = GetApiConfig()
    return config.BASE_URL + config.MARK_WATCHED_ENDPOINT
End Function

Function GetThemeConfig() as Object
    return {
        BACKGROUND: "#050505"
        BACKGROUND_RGB: &h050505FF
        PRIMARY_ACCENT: "#EF4444"
        PRIMARY_ACCENT_RGB: &hEF4444FF
        SURFACE: "#0A0A0A"
        SURFACE_LIGHT: "#1A1A1A"
        SURFACE_ELEVATED: "#252525"
        TEXT_PRIMARY: "#FFFFFF"
        TEXT_SECONDARY: "#A0A0A0"
        TEXT_MUTED: "#666666"
        FOCUS_RING: "#EF4444"
        UNFOCUSED: "#333333"
        DISABLED: "#404040"
        GRADIENT_START: "#00050505"
        GRADIENT_END: "#FF050505"
    }
End Function

Function GetLayoutConfig() as Object
    ' Read scale factor set by InitResolution() in Main.brs (FHD=1.0, HD=0.667, SD=0.375, 4K=1.0)
    s = 1.0
    if m.global <> Invalid and m.global.HasField("resolutionScale")
        if m.global.resolutionScale <> Invalid then s = m.global.resolutionScale
    end if
    return {
        SCREEN_WIDTH:           int(1920 * s)
        SCREEN_HEIGHT:          int(1080 * s)
        OVERSCAN_LEFT:          int(90   * s)
        OVERSCAN_TOP:           int(60   * s)
        OVERSCAN_RIGHT:         int(90   * s)
        OVERSCAN_BOTTOM:        int(60   * s)
        HERO_WIDTH:             int(1740 * s)
        HERO_HEIGHT:            int(675  * s)
        ROW_HEIGHT_STANDARD:    int(320  * s)
        ROW_HEIGHT_RANKED:      int(400  * s)
        ROW_SPACING:            int(40   * s)
        ROW_LABEL_HEIGHT:       int(50   * s)
        POSTER_WIDTH_STANDARD:  int(200  * s)
        POSTER_HEIGHT_STANDARD: int(300  * s)
        POSTER_SPACING:         int(20   * s)
        RANKED_NUMBER_WIDTH:    int(120  * s)
        RANKED_POSTER_WIDTH:    int(180  * s)
        RANKED_POSTER_HEIGHT:   int(270  * s)
        BACKDROP_WIDTH:         int(1920 * s)
        BACKDROP_HEIGHT:        int(1080 * s)
        DETAILS_PANEL_WIDTH:    int(700  * s)
        BUTTON_WIDTH:           int(280  * s)
        BUTTON_HEIGHT:          int(60   * s)
        BUTTON_SPACING:         int(20   * s)
    }
End Function

Function GetFontConfig() as Object
    return {
        FONT_REGULAR: "font:MediumSystemFont"
        FONT_BOLD: "font:BoldSystemFont"
        FONT_LIGHT: "font:SmallSystemFont"
    }
End Function

Function GetRegistryConfig() as Object
    return {
        SECTION: "CrateTV"
        KEY_DEVICE_LINKED: "deviceLinked"
        KEY_AUTH_TOKEN: "authToken"
        KEY_USER_ID: "userId"
        KEY_LAST_POSITION: "lastPosition"
        KEY_WATCH_HISTORY: "watchHistory"
    }
End Function

Function GetAnimationConfig() as Object
    return {
        FAST: 0.15
        NORMAL: 0.25
        SLOW: 0.4
        HERO_TRANSITION: 0.5
        FOCUS_SCALE: 1.08
        UNFOCUS_SCALE: 1.0
    }
End Function
