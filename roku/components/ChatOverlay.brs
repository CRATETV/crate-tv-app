' ##############################################################################
' CRATE TV - Live chat panel logic (layout and how hiding works: ChatOverlay.xml)
' ##############################################################################
'
' - While a watch party plays (isVisible = true), asks cratetv.net for the
'   chat every 5 seconds (ChatTask) and shows the last ROWS messages.
' - toggle: hide/show. Remembered on this Roku (registry key "chatHidden").
' - Live reactions arrive with the chat; each new one floats up the screen
'   (released a few at a time so a burst looks like a crowd, not a block).
' ##############################################################################

Sub Init()
    m.ROWS = 5
    m.panel = m.top.FindNode("panel")
    m.emptyLabel = m.top.FindNode("emptyLabel")
    m.toast = m.top.FindNode("toast")
    m.toastLabel = m.top.FindNode("toastLabel")
    m.toastTimer = m.top.FindNode("toastTimer")
    m.toastTimer.ObserveField("fire", "HideToast")

    m.userLabels = []
    m.textLabels = []
    For i = 0 To m.ROWS - 1
        m.userLabels.Push(m.top.FindNode("msgUser" + Str(i).Trim()))
        m.textLabels.Push(m.top.FindNode("msgText" + Str(i).Trim()))
    End For

    m.chatTask = Invalid
    m.movieKey = ""
    m.userHidden = (RegistryRead("chatHidden", GetRegistryConfig().SECTION) = "true")

    ' Live reactions
    m.REACTION_IMAGES = { "😂": "laugh", "😲": "wow", "❤️": "heart", "❤": "heart", "👏": "clap", "😢": "sad" }
    m.MAX_FLOATING = 14
    m.reactionLayer = m.top.FindNode("reactionLayer")
    m.seenReactions = {}
    m.reactionQueue = []
    m.floaters = []
    m.nextFloater = 0
    m.reactionTick = m.top.FindNode("reactionTick")
    m.reactionTick.ObserveField("fire", "ReleaseReaction")

    m.pollTimer = CreateObject("roSGNode", "Timer")
    m.pollTimer.duration = 5
    m.pollTimer.repeat   = true
    m.pollTimer.ObserveField("fire", "PollChat")
End Sub

Sub OnMovieKeyChange()
    m.movieKey = m.top.movieKey
End Sub

' Shown only during a watch party AND when the viewer hasn't hidden it.
Sub OnVisibleChange()
    UpdateShown()
    ' Remind viewers who hid it last time that it's there
    If m.top.isVisible And m.userHidden Then ShowToast("Chat is hidden  ·  press ▼ to show it")
End Sub

Sub UpdateShown()
    ' The panel shows only if not hidden; messages and reactions keep coming
    ' for the whole watch party (reactions float even when the panel is hidden).
    m.panel.visible = m.top.isVisible And Not m.userHidden
    If m.top.isVisible
        PollChat()
        m.pollTimer.control = "start"
        m.reactionTick.control = "start"
    Else
        m.pollTimer.control = "stop"
        m.reactionTick.control = "stop"
        m.reactionQueue = []
        ClearMessages()
        HideToast()
    End If
End Sub

' Down / * pressed in the player
Sub OnToggle()
    If Not m.top.isVisible Then Return
    m.userHidden = Not m.userHidden
    If m.userHidden
        RegistryWrite("chatHidden", "true", GetRegistryConfig().SECTION)
        ShowToast("Chat hidden  ·  press ▼ to show it again")
    Else
        RegistryWrite("chatHidden", "false", GetRegistryConfig().SECTION)
        HideToast()
    End If
    UpdateShown()
End Sub

Sub ShowToast(text as String)
    m.toastLabel.text = text
    m.toast.visible = true
    m.toastTimer.control = "stop"
    m.toastTimer.control = "start"
End Sub

Sub HideToast()
    m.toast.visible = false
End Sub

' =============================================================================
' FETCH (in the background, ChatTask)
' =============================================================================
Sub PollChat()
    If m.movieKey = "" Then Return
    task = CreateObject("roSGNode", "ChatTask")
    task.movieKey  = m.movieKey
    task.authToken = m.top.authToken
    task.ObserveField("taskStatus", "OnChatReady")
    task.control = "RUN"
    m.chatTask = task
End Sub

Sub OnChatReady()
    task = m.chatTask
    If task = Invalid Or task.taskStatus <> "success" Then Return
    raw = task.messages
    If raw = Invalid Or raw = "" Then Return
    parsed = ParseJson(raw)
    If parsed = Invalid Then Return

    ' Response is { "messages": [...] } (or just the list)
    messages = Invalid
    If Type(parsed) = "roAssociativeArray" And parsed.messages <> Invalid
        messages = parsed.messages
    Else If Type(parsed) = "roArray"
        messages = parsed
    End If
    If messages <> Invalid Then RenderMessages(messages)
    If Type(parsed) = "roAssociativeArray" And Type(parsed.reactions) = "roArray" Then QueueReactions(parsed.reactions)
End Sub

' =============================================================================
' LIVE REACTIONS
' =============================================================================
' New reactions join a queue; ReleaseReaction lets one float every 0.3 s.
Sub QueueReactions(list as Object)
    For Each r in list
        If Type(r) = "roAssociativeArray" And r.id <> Invalid And Not m.seenReactions.DoesExist(r.id)
            m.seenReactions[r.id] = true
            img = Invalid
            If r.emoji <> Invalid Then img = m.REACTION_IMAGES[r.emoji]
            If img <> Invalid And m.reactionQueue.Count() < 40 Then m.reactionQueue.Push(img)
        End If
    End For
    ' Forget old ids now and then so the list doesn't grow all night
    If m.seenReactions.Count() > 400 Then m.seenReactions = {}
End Sub

Sub ReleaseReaction()
    If m.reactionQueue.Count() = 0 Then Return
    img = m.reactionQueue.Shift()
    f = NextFloater()
    ' Start low on the right (left of the chat panel when it's showing)
    If m.panel.visible
        x = 1180 + Rnd(150)
    Else
        x = 1560 + Rnd(240)
    End If
    f.poster.uri = "pkg:/images/reactions/" + img + ".png"
    f.moveInterp.keyValue = [[x, 900], [x + Rnd(60) - 30, 380]]
    f.anim.control = "stop"
    f.anim.control = "start"
End Sub

' Reuses a small set of images so a big burst never slows the TV down.
Function NextFloater() as Object
    If m.floaters.Count() < m.MAX_FLOATING
        poster = m.reactionLayer.CreateChild("Poster")
        poster.width = 72 : poster.height = 72 : poster.opacity = 0
        poster.id = "floater" + Str(m.floaters.Count()).Trim()
        anim = m.top.CreateChild("ParallelAnimation")
        a1 = anim.CreateChild("Animation") : a1.duration = 3.2 : a1.easeFunction = "outQuad"
        moveInterp = a1.CreateChild("Vector2DFieldInterpolator")
        moveInterp.fieldToInterp = poster.id + ".translation"
        moveInterp.key = [0.0, 1.0]
        a2 = anim.CreateChild("Animation") : a2.duration = 3.2 : a2.easeFunction = "linear"
        fade = a2.CreateChild("FloatFieldInterpolator")
        fade.fieldToInterp = poster.id + ".opacity"
        fade.key = [0.0, 0.1, 0.7, 1.0]
        fade.keyValue = [0.0, 1.0, 1.0, 0.0]
        f = { poster: poster, anim: anim, moveInterp: moveInterp }
        m.floaters.Push(f)
        Return f
    End If
    f = m.floaters[m.nextFloater]
    m.nextFloater = (m.nextFloater + 1) Mod m.MAX_FLOATING
    Return f
End Function

' =============================================================================
' SHOW the newest messages, oldest at the top
' =============================================================================
Sub RenderMessages(messages as Object)
    ClearMessages()
    total = messages.Count()
    m.emptyLabel.visible = (total = 0)
    startIdx = total - m.ROWS
    If startIdx < 0 Then startIdx = 0

    row = 0
    For mi = startIdx To total - 1
        msg = messages[mi]
        If msg <> Invalid And row < m.ROWS
            name = ""
            text = ""
            isDirector = false
            If msg.userName <> Invalid Then name = msg.userName
            If msg.text <> Invalid Then text = msg.text
            If msg.isVerifiedDirector <> Invalid And msg.isVerifiedDirector = true Then isDirector = true
            If Len(name) > 24 Then name = Left(name, 22) + "…"

            If isDirector
                m.userLabels[row].text = name + "  ✓ Director"
                m.userLabels[row].color = "#E8C15A"
            Else
                m.userLabels[row].text = name
                m.userLabels[row].color = "#B3B3B3"
            End If
            m.textLabels[row].text = text
            row = row + 1
        End If
    End For
End Sub

Sub ClearMessages()
    For i = 0 To m.ROWS - 1
        m.userLabels[i].text = ""
        m.textLabels[i].text = ""
    End For
End Sub
