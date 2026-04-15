' ##############################################################################
' CRATE TV - Live Chat Overlay Controller
'
' Polls GET /api/get-watch-party-chat every 5 seconds.
' Displays the most recent 6 messages in a scrolling panel.
' Usernames in red, messages in white. Completely read-only on Roku.
'
' Call isVisible=true to start polling and show panel.
' Call isVisible=false to stop polling and hide panel.
' ##############################################################################

Sub Init()
    m.panel = m.top.FindNode("panel")

    ' Cache all 6 username + message label pairs
    m.userLabels = []
    m.textLabels = []
    For i = 0 To 5
        m.userLabels.Push(m.top.FindNode("msgUser" + Str(i).Trim()))
        m.textLabels.Push(m.top.FindNode("msgText" + Str(i).Trim()))
    End For

    m.chatTask   = Invalid
    m.pollTimer  = Invalid
    m.movieKey   = ""
    m.lastMsgTs  = 0   ' timestamp of newest message we've seen

    ' Poll timer -- every 5 seconds
    m.pollTimer = CreateObject("roSGNode", "Timer")
    m.pollTimer.duration = 5
    m.pollTimer.repeat   = true
    m.pollTimer.ObserveField("fire", "PollChat")
End Sub

Sub OnMovieKeyChange()
    m.movieKey = m.top.movieKey
End Sub

Sub OnVisibleChange()
    show = m.top.isVisible
    If m.panel <> Invalid Then m.panel.visible = show

    If show
        ' Start polling immediately
        PollChat()
        If m.pollTimer <> Invalid Then m.pollTimer.control = "start"
    Else
        If m.pollTimer <> Invalid Then m.pollTimer.control = "stop"
        ClearMessages()
    End If
End Sub

' =============================================================================
' POLL
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
    If task = Invalid Then Return
    If task.taskStatus <> "success" Then Return

    raw = task.messages
    If raw = Invalid Or raw = "" Then Return

    parsed = ParseJson(raw)
    If parsed = Invalid Then Return

    ' Response is { "messages": [...] } wrapper
    messages = Invalid
    If Type(parsed) = "roAssociativeArray" And parsed.messages <> Invalid
        messages = parsed.messages
    Else If Type(parsed) = "roArray"
        messages = parsed
    End If

    If messages = Invalid Then Return
    If messages.Count() = 0 Then Return

    RenderMessages(messages)
End Sub

' =============================================================================
' RENDER -- take last 6 messages, fill rows bottom-up
' =============================================================================
Sub RenderMessages(messages as Object)
    total = messages.Count()

    ' We show at most 6 rows. Take the last 6 messages.
    startIdx = total - 6
    If startIdx < 0 Then startIdx = 0

    ' Clear all rows first
    ClearMessages()

    ' Fill rows 0..5 with messages startIdx..total-1
    rowIdx = 0
    For mi = startIdx To total - 1
        msg = messages[mi]
        If msg = Invalid Then Continue For

        ' Exact field names from /api/get-chat-messages response
        username   = ""
        msgText    = ""
        isDirector = false
        If msg.userName          <> Invalid Then username   = msg.userName
        If msg.text              <> Invalid Then msgText    = msg.text
        If msg.isVerifiedDirector <> Invalid Then isDirector = msg.isVerifiedDirector

        ' Truncate long usernames
        If Len(username) > 16 Then username = Left(username, 14) + ".."

        ' Director messages get a checkmark prefix on their name
        If isDirector And username <> "" Then username = username + " [D]"

        If rowIdx <= 5
            uLabel = m.userLabels[rowIdx]
            tLabel = m.textLabels[rowIdx]
            If uLabel <> Invalid
                uLabel.text  = username
                ' Director name in bright white, regular users in red
                If isDirector
                    uLabel.color = "#FFFFFF"
                Else
                    uLabel.color = "#EF4444"
                End If
            End If
            If tLabel <> Invalid Then tLabel.text = msgText
        End If
        rowIdx = rowIdx + 1
    End For
End Sub

Sub ClearMessages()
    For i = 0 To 5
        uLabel = m.userLabels[i]
        tLabel = m.textLabels[i]
        If uLabel <> Invalid Then uLabel.text = ""
        If tLabel <> Invalid Then tLabel.text = ""
    End For
End Sub
