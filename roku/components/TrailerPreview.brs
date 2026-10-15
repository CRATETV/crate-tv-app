' ##############################################################################
' CRATE TV - Trailer preview logic (how to use it: see TrailerPreview.xml)
' ##############################################################################

Sub Init()
    m.video = m.top.FindNode("video")
    m.video.ObserveField("state", "OnVideoState")
    m.video.ObserveField("duration", "OnDurationKnown")
    m.clipTimer = m.top.FindNode("clipTimer")
    m.clipTimer.ObserveField("fire", "OnClipTimeUp")
    m.needSeek = false
    m.video.opacity = 0.0        ' hidden until the first frame is actually playing

    ' Soft fade-in so the trailer melts in over the artwork
    m.fadeIn = m.top.CreateChild("Animation")
    m.fadeIn.duration = 0.8
    m.fadeIn.easeFunction = "outQuad"
    interp = m.fadeIn.CreateChild("FloatFieldInterpolator")
    interp.fieldToInterp = "video.opacity"
    interp.key = [0.0, 1.0]
    interp.keyValue = [0.0, 1.0]
End Sub

Sub OnControl()
    If m.top.control = "play"
        url = m.top.url
        If url = "" Then Return
        content = CreateObject("roSGNode", "ContentNode")
        content.url = url
        If Instr(1, LCase(url), ".m3u8") > 0
            content.streamFormat = "hls"
        Else
            content.streamFormat = "mp4"
        End If
        m.video.control = "stop"
        m.clipTimer.control = "stop"
        m.video.opacity = 0.0
        ' Clip from the middle of a film: stay silent and hidden while it jumps
        ' there (see OnVideoState), then fade in.
        m.needSeek = (m.top.startPercent > 0)
        m.video.mute = m.top.mute Or m.needSeek
        m.video.content = content
        m.video.control = "play"
    Else If m.top.control = "stop"
        StopPreview()
    End If
End Sub

Sub StopPreview()
    m.needSeek = false
    m.clipTimer.control = "stop"
    m.fadeIn.control = "stop"
    If m.video.state <> "stopped" And m.video.state <> "none" Then m.video.control = "stop"
    m.video.opacity = 0.0
    m.top.isPlaying = false
End Sub

Sub OnVideoState()
    state = m.video.state
    If state = "playing"
        If m.needSeek
            JumpToStart()          ' still hidden; shows after the jump
            Return
        End If
        If Not m.top.isPlaying
            m.top.isPlaying = true
            m.video.mute = m.top.mute
            m.fadeIn.control = "start"
            If m.top.maxSeconds > 0
                m.clipTimer.duration = m.top.maxSeconds
                m.clipTimer.control = "start"
            End If
        End If
    Else If state = "finished" Or state = "error"
        StopPreview()
        m.top.finished = true
    End If
End Sub

Sub OnMute()
    m.video.mute = m.top.mute
End Sub

Sub OnSize()
    m.video.width = m.top.width
    m.video.height = m.top.height
End Sub

' Jump to e.g. the middle of the film. Needs the film's length, which the
' Roku only knows once playback has begun.
Sub JumpToStart()
    If Not m.needSeek Then Return
    d = m.video.duration
    If d <= 0 Then Return                  ' not known yet: OnDurationKnown retries
    m.needSeek = false
    m.video.seek = Int(d * m.top.startPercent)
End Sub

Sub OnDurationKnown()
    If m.needSeek And m.video.state = "playing" Then JumpToStart()
End Sub

' The clip has played long enough.
Sub OnClipTimeUp()
    StopPreview()
    m.top.finished = true
End Sub
