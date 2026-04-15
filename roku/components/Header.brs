'  ##############################################################################
' CRATE TV - Header Navigation Controller (V4 Studio)
' 5 permanent nav items. livePartyAlert pill appears/disappears separately.
'  ##############################################################################

Sub Init()
    m.NAV_COUNT = 5
    m.navLabels = []
    m.navUnderlines = []

    For i = 0 To m.NAV_COUNT - 1
        label     = m.top.FindNode("navLabel"     + Str(i).Trim())
        underline = m.top.FindNode("navUnderline" + Str(i).Trim())
        m.navLabels.Push(label)
        m.navUnderlines.Push(underline)
    End For

    m.clockLabel      = m.top.FindNode("clockLabel")
    m.navBg           = m.top.FindNode("navBg")
    m.navLine         = m.top.FindNode("navBottomLine")
    m.headerLogo      = m.top.FindNode("headerLogo")
    m.navItems        = m.top.FindNode("navItemsGroup")
    m.livePartyAlert  = m.top.FindNode("livePartyAlert")
    m.alertFocusRing  = m.top.FindNode("alertFocusRing")

    ' Whether the focus is currently on the live party alert pill
    m.alertFocused    = false
    m.alertVisible    = false

    m.top.ObserveField("visible", "OnVisibleChange")
    SizeUnderlines()
    UpdateClock()
    UpdateNavVisuals()
End Sub

Sub OnVisibleChange()
    isVis = m.top.visible
    If m.navBg      <> Invalid Then m.navBg.visible     = isVis
    If m.navLine    <> Invalid Then m.navLine.visible    = isVis
    If m.headerLogo <> Invalid Then m.headerLogo.visible = isVis
    If m.navItems   <> Invalid Then m.navItems.visible   = isVis
    If m.clockLabel <> Invalid Then m.clockLabel.visible = isVis
    ' Alert pill stays hidden until a party is live -- never reveal here
End Sub

Sub SizeUnderlines()
    For i = 0 To m.NAV_COUNT - 1
        label     = m.navLabels[i]
        underline = m.navUnderlines[i]
        If label <> Invalid And underline <> Invalid
            bounds = label.boundingRect()
            If bounds <> Invalid And bounds.width > 0
                underline.width = bounds.width
            End If
        End If
    End For
End Sub

Sub OnActiveChange()
    UpdateNavVisuals()
End Sub

Sub UpdateNavVisuals()
    selectedIdx = m.top.selectedIndex
    focusedIdx  = m.top.focusedIndex
    isActive    = m.top.isActive

    For i = 0 To m.NAV_COUNT - 1
        label     = m.navLabels[i]
        underline = m.navUnderlines[i]
        If label = Invalid Or underline = Invalid Then Continue For

        If i = selectedIdx
            label.color       = "#FFFFFF"
            underline.visible = true
        Else If isActive And i = focusedIdx And Not m.alertFocused
            label.color       = "#EF4444"
            underline.visible = false
        Else
            label.color       = "#A0A0A0"
            underline.visible = false
        End If
    End For

    ' Focus ring on alert pill
    If m.alertFocusRing <> Invalid
        m.alertFocusRing.visible = (m.alertFocused And isActive)
    End If
End Sub

Sub UpdateClock()
    dt = CreateObject("roDateTime")
    dt.ToLocalTime()
    hours = dt.GetHours()
    mins  = dt.GetMinutes()
    ampm  = "AM"
    If hours >= 12 Then ampm = "PM"
    If hours > 12  Then hours = hours - 12
    If hours = 0   Then hours = 12
    minStr = Right("0" + Str(mins).Trim(), 2)
    m.clockLabel.text = Str(hours).Trim() + ":" + minStr + " " + ampm
End Sub

' Called when MainScene sets watchPartyIsLive field
Sub OnWatchPartyLiveChange()
    isLive = m.top.watchPartyIsLive
    m.alertVisible = isLive
    If m.livePartyAlert <> Invalid
        m.livePartyAlert.visible = isLive
    End If
    ' If party just ended and alert was focused, move focus back to nav
    If Not isLive And m.alertFocused
        m.alertFocused = false
        UpdateNavVisuals()
    End If
    Print "CrateTV [Header]: watchPartyIsLive = " + Box(isLive).ToStr()
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press      Then Return false
    If Not m.top.isActive Then Return false

    focusedIdx = m.top.focusedIndex

    If key = "left"
        If m.alertFocused
            ' Move focus back from alert to last nav item
            m.alertFocused = false
            UpdateNavVisuals()
        Else If focusedIdx > 0
            m.top.focusedIndex = focusedIdx - 1
            UpdateNavVisuals()
        End If
        Return true
    End If

    If key = "right"
        If Not m.alertFocused And m.alertVisible And focusedIdx = m.NAV_COUNT - 1
            ' Move focus from last nav item onto the alert pill
            m.alertFocused = true
            UpdateNavVisuals()
        Else If Not m.alertFocused And focusedIdx < m.NAV_COUNT - 1
            m.top.focusedIndex = focusedIdx + 1
            UpdateNavVisuals()
        End If
        Return true
    End If

    If key = "OK"
        If m.alertFocused
            ' User pressed OK on the live party alert -- signal MainScene
            m.top.selectedIndex = -1   ' special value: "join party"
            m.alertFocused = false
            UpdateNavVisuals()
        Else
            m.top.selectedIndex = m.top.focusedIndex
            UpdateNavVisuals()
        End If
        Return true
    End If

    Return false
End Function
