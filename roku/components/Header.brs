' ##############################################################################
' CRATE TV - Header menu logic (see Header.xml for the layout)
' ##############################################################################
'
' KEYS (only while the menu has focus, i.e. isActive = true)
'   Left / Right  move along the menu (and onto the live party pill, if shown)
'   OK            open that tab -> sets selectedIndex; MainScene does the rest
'   Down          handled by MainScene (moves focus back into the page)
'
' selectedIndex = -1 is a special value meaning "join the live watch party".
' ##############################################################################

Sub Init()
    m.NAV_COUNT = 5
    m.SHOW_LOGO = false          ' true = show the CRATE logo top-left (menu then starts at x=300)
    m.SHOW_CLOCK = false         ' true = show the time on the right (hidden by request, Oct 2026)
    m.ITEM_GAP = 44              ' space between menu words

    m.navLabels = []
    m.navUnderlines = []
    m.navItems = []
    For i = 0 To m.NAV_COUNT - 1
        n = Str(i).Trim()
        m.navLabels.Push(m.top.FindNode("navLabel" + n))
        m.navUnderlines.Push(m.top.FindNode("navUnderline" + n))
        m.navItems.Push(m.top.FindNode("navItem" + n))
    End For

    m.navBg          = m.top.FindNode("navBg")
    m.navSolidBg     = m.top.FindNode("navSolidBg")
    m.headerLogo     = m.top.FindNode("headerLogo")
    m.navItemsGroup  = m.top.FindNode("navItemsGroup")
    m.livePartyAlert = m.top.FindNode("livePartyAlert")
    m.alertFocusRing = m.top.FindNode("alertFocusRing")
    m.clockLabel     = m.top.FindNode("clockLabel")

    m.alertFocused = false
    m.alertVisible = false

    m.top.ObserveField("visible", "OnVisibleChange")
    m.top.ObserveField("selectedIndex", "UpdateNavVisuals")

    ' Keep the clock current (it used to be set once at launch and never change).
    clockTimer = m.top.FindNode("clockTimer")
    clockTimer.ObserveField("fire", "UpdateClock")
    clockTimer.control = "start"

    If m.SHOW_LOGO Then m.navItemsGroup.translation = [300, 0] Else m.navItemsGroup.translation = [96, 0]
    LayoutMenu()
    UpdateClock()
    UpdateNavVisuals()
End Sub

' Places menu items one after another based on how wide each word is.
Sub LayoutMenu()
    x = 0
    For i = 0 To m.NAV_COUNT - 1
        m.navItems[i].translation = [x, 0]
        w = m.navLabels[i].boundingRect().width
        If w <= 0 Then w = 120          ' safety if the font hasn't measured yet
        x = x + w + m.ITEM_GAP
    End For
End Sub

Sub OnVisibleChange()
    isVis = m.top.visible
    m.navBg.visible = isVis And m.top.overArtwork
    m.navSolidBg.visible = isVis And Not m.top.overArtwork
    m.headerLogo.visible = isVis And m.SHOW_LOGO
    m.navItemsGroup.visible = isVis
    m.clockLabel.visible = isVis And m.SHOW_CLOCK
    ' The live pill is shown only by OnWatchPartyLiveChange.
    If isVis Then LayoutMenu()
End Sub

Sub OnBackgroundModeChange()
    OnVisibleChange()
End Sub

Sub OnActiveChange()
    UpdateNavVisuals()
End Sub

Sub UpdateNavVisuals()
    selectedIdx = m.top.selectedIndex
    focusedIdx  = m.top.focusedIndex
    isActive    = m.top.isActive
    For i = 0 To m.NAV_COUNT - 1
        label = m.navLabels[i]
        underline = m.navUnderlines[i]
        isFocused = (isActive And i = focusedIdx And Not m.alertFocused)
        If isFocused Or i = selectedIdx
            label.color = "#FFFFFF"
        Else
            label.color = "#8C8C8C"
        End If
        ' Red bar: under the open tab; when browsing the menu, under the highlighted item.
        If isActive
            underline.visible = isFocused
        Else
            underline.visible = (i = selectedIdx)
        End If
    End For
    m.alertFocusRing.visible = (m.alertFocused And isActive)
End Sub

Sub UpdateClock()
    dt = CreateObject("roDateTime")
    dt.ToLocalTime()
    hours = dt.GetHours()
    mins = dt.GetMinutes()
    ampm = "AM"
    If hours >= 12 Then ampm = "PM"
    If hours > 12 Then hours = hours - 12
    If hours = 0 Then hours = 12
    m.clockLabel.text = Str(hours).Trim() + ":" + Right("0" + Str(mins).Trim(), 2) + " " + ampm
End Sub

Sub OnWatchPartyLiveChange()
    isLive = m.top.watchPartyIsLive
    m.alertVisible = isLive
    m.livePartyAlert.visible = isLive
    If Not isLive And m.alertFocused
        m.alertFocused = false
        UpdateNavVisuals()
    End If
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Or Not m.top.isActive Then Return false
    focusedIdx = m.top.focusedIndex

    If key = "left"
        If m.alertFocused
            m.alertFocused = false
        Else If focusedIdx > 0
            m.top.focusedIndex = focusedIdx - 1
        End If
        UpdateNavVisuals()
        Return true
    End If

    If key = "right"
        If Not m.alertFocused And m.alertVisible And focusedIdx = m.NAV_COUNT - 1
            m.alertFocused = true
        Else If Not m.alertFocused And focusedIdx < m.NAV_COUNT - 1
            m.top.focusedIndex = focusedIdx + 1
        End If
        UpdateNavVisuals()
        Return true
    End If

    If key = "OK"
        If m.alertFocused
            m.alertFocused = false
            m.top.selectedIndex = -1      ' join the live party
        Else
            m.top.selectedIndex = m.top.focusedIndex
        End If
        UpdateNavVisuals()
        Return true
    End If

    Return false
End Function
