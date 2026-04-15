' ##############################################################################
' CRATE TV - Video Player Controller (Clean Cinema)
' Pure cinematic playback -- zero on-screen UI during films.
' Remote control (play/pause/ff/rw/back) handled directly via Video node.
' ##############################################################################

Sub Init()
    ' Cache UI references
    m.videoNode = m.top.FindNode("videoNode")
    m.loadingOverlay = m.top.FindNode("loadingOverlay")
    m.loadingLabel = m.top.FindNode("loadingLabel")
    m.syncBanner = m.top.FindNode("syncBanner")
    m.syncLabel = m.top.FindNode("syncLabel")
    m.errorOverlay = m.top.FindNode("errorOverlay")
    m.errorMessage = m.top.FindNode("errorMessage")
    
    ' Theme
    m.theme = GetThemeConfig()
    
    ' State
    m.isPlaying = false
    m.isLiveSync = false
    m.actualStartTime = 0
    m.contentId = ""
    
    ' Live chat overlay (watch party only)
    m.chatOverlay = m.top.FindNode("chatOverlay")

    ' Analytics tracking flags (for Roku certification)
    m.playStartFired = false
    m.playCompleteFired = false
    
    ' Observe video node events
    m.videoNode.ObserveField("state", "OnVideoStateChange")
    m.videoNode.ObserveField("position", "OnPositionChange")
    m.videoNode.ObserveField("duration", "OnDurationChange")
    m.videoNode.ObserveField("bufferingStatus", "OnBufferingChange")
    
    ' Progress save timer (save every 10 seconds)
    m.progressTimer = CreateObject("roSGNode", "Timer")
    m.progressTimer.duration = 10
    m.progressTimer.repeat = true
    m.progressTimer.ObserveField("fire", "SaveProgress")
    
    ' Live sync timer (check sync every second)
    m.syncTimer = CreateObject("roSGNode", "Timer")
    m.syncTimer.duration = 1
    m.syncTimer.repeat = true
    m.syncTimer.ObserveField("fire", "CheckLiveSync")
End Sub

Sub OnContentChange()
    content = m.top.content
    If content = Invalid
        return
    End If
    
    ' Reset analytics tracking flags for new content
    m.playStartFired = false
    m.playCompleteFired = false
    
    ' Store content ID for progress tracking
    m.contentId = SafeContentField(content, "contentId", "")
    If m.contentId = ""
        m.contentId = SafeContentField(content, "movieKey", "")
    End If
    
    ' Check for live sync
    actualStartTimeStr = SafeContentField(content, "actualStartTime", "")
    If actualStartTimeStr <> ""
        m.isLiveSync = true
        m.actualStartTime = ParseISOTimestamp(actualStartTimeStr)
        m.syncBanner.visible = true
        m.syncTimer.control = "start"
    Else
        m.isLiveSync = false
        m.syncBanner.visible = false
    End If
    
    ' Get stream URL
    streamUrl = GetStreamUrl(content)
    streamUrl = NormalizeUrl(streamUrl)
    If streamUrl = ""
        ShowError("No playback URL available for this content.")
        return
    End If
    
    ' Create video content node
    videoContent = CreateObject("roSGNode", "ContentNode")
    videoContent.url = streamUrl
    videoContent.title = SafeContentField(content, "title", "")
    videoContent.streamFormat = DetectStreamFormat(streamUrl)
    
    ' Set video content
    m.videoNode.content = videoContent
    
    ' =======================================================================
    ' ROKU CERTIFICATION 3.6: Apps must start playing within 8 seconds
    ' =======================================================================
    ' Skip initial loading overlay - let Roku's native video buffering handle UX
    ' This ensures fastest possible playback start time
    m.loadingOverlay.visible = false
    
    ' Check for watch party offset (pre-calculated by WatchPartyScene)
    watchPartyOffset = 0
    If content.HasField("watchPartyOffset") And content.watchPartyOffset > 0
        watchPartyOffset = content.watchPartyOffset
        m.isLiveSync     = true   ' treat like live sync -- keep seeking, disable resume save
        m.actualStartTime = CreateObject("roDateTime").AsSeconds() - watchPartyOffset
        m.syncBanner.visible = true
        m.syncTimer.control  = "start"
        Print "CrateTV: Watch party offset = " + Str(watchPartyOffset).Trim() + "s"
    End If

    ' Start live chat overlay for watch parties
    If m.isLiveSync And m.chatOverlay <> Invalid
        movieKey = SafeContentField(content, "movieKey", "")
        If movieKey = "" Then movieKey = SafeContentField(content, "id", "")
        If movieKey <> ""
            m.chatOverlay.movieKey  = movieKey
            m.chatOverlay.isVisible = true
        End If
    End If

    ' Get last watch position (only if not live sync or watch party)
    If Not m.isLiveSync
        lastPosition = GetLastWatchPosition(m.contentId)
        If lastPosition > 0
            m.resumePosition = lastPosition
        Else
            m.resumePosition = 0
        End If
    Else
        m.resumePosition = watchPartyOffset
    End If
    
    ' Start playback
    m.videoNode.control = "play"
    
    Print "CrateTV: Starting playback - " + streamUrl
End Sub

Function GetStreamUrl(content as Object) as String
    ' Priority: HLS > MP4 > generic streamUrl
    hlsUrl = SafeContentField(content, "hlsUrl", "")
    If hlsUrl <> ""
        return hlsUrl
    End If
    
    mp4Url = SafeContentField(content, "mp4Url", "")
    If mp4Url <> ""
        return mp4Url
    End If
    
    streamUrl = SafeContentField(content, "streamUrl", "")
    If streamUrl <> ""
        return streamUrl
    End If
    
    return ""
End Function

Function DetectStreamFormat(url as String) as String
    lowerUrl = LCase(url)
    
    If Instr(1, lowerUrl, ".m3u8") > 0
        return "hls"
    Else If Instr(1, lowerUrl, ".mpd") > 0
        return "dash"
    Else If Instr(1, lowerUrl, ".mp4") > 0
        return "mp4"
    Else If Instr(1, lowerUrl, ".mov") > 0
        return "mp4"
    Else If Instr(1, lowerUrl, ".mkv") > 0
        return "mkv"
    Else
        return "mp4"
    End If
End Function

' =============================================================================
' VIDEO STATE HANDLING
' =============================================================================
Sub OnVideoStateChange()
    state = m.videoNode.state
    m.top.state = state
    
    Print "CrateTV: Video state - " + state
    
    ' =========================================================================
    ' ROKU ANALYTICS TRACKING (CERTIFICATION REQUIREMENT)
    ' =========================================================================
    If state = "playing" And Not m.playStartFired
        m.playStartFired = true
        m.top.signalBeacon("PlaybackStarted")
        Print "CrateTV [Analytics]: PlaybackStarted signaled"
    Else If state = "stopped" And m.playStartFired And Not m.playCompleteFired
        m.playCompleteFired = true
        m.top.signalBeacon("PlaybackStopped")
        Print "CrateTV [Analytics]: PlaybackStopped signaled"
    Else If state = "error" And Not m.playCompleteFired
        m.top.signalBeacon("PlaybackError")
        Print "CrateTV [Analytics]: PlaybackError signaled"
    Else If state = "finished" And Not m.playCompleteFired
        m.playCompleteFired = true
        m.top.signalBeacon("PlaybackComplete")
        Print "CrateTV [Analytics]: PlaybackComplete signaled"
    End If
    
    ' =========================================================================
    ' NORMAL VIDEO STATE HANDLING
    ' =========================================================================
    If state = "playing"
        m.isPlaying = true
        HideLoading()
        m.progressTimer.control = "start"
        
        ' Handle resume or live sync
        If m.isLiveSync
            SyncToLiveTime()
        Else If m.resumePosition > 0
            m.videoNode.seek = m.resumePosition
            m.resumePosition = 0
        End If
        
    Else If state = "paused"
        m.isPlaying = false
        
    Else If state = "buffering"
        ShowLoading("Buffering...")
        
    Else If state = "finished"
        Print "CrateTV: Video state -> finished"
        OnPlaybackFinished()

    Else If state = "stopped"
        Print "CrateTV: Video state -> stopped"
        If m.isPlaying Then OnPlaybackFinished()

    Else If state = "error"
        Print "CrateTV: Video state -> error"
        OnPlaybackError()
    End If
End Sub

Sub OnPositionChange()
    m.top.currentPosition = Int(m.videoNode.position)
End Sub

Sub OnDurationChange()
    m.top.duration = Int(m.videoNode.duration)
End Sub

Sub OnBufferingChange()
    buffering = m.videoNode.bufferingStatus
    If buffering <> Invalid
        percent = buffering.percentage
        If percent < 100
            m.loadingLabel.text = "Buffering... " + Str(Int(percent)).Trim() + "%"
        End If
    End If
End Sub

' =============================================================================
' WATCH PARTY SYNC
' =============================================================================
Sub SyncToLiveTime()
    If Not m.isLiveSync Or m.actualStartTime = 0
        return
    End If
    
    currentTime = GetCurrentTimestamp()
    elapsedSeconds = currentTime - m.actualStartTime
    
    If elapsedSeconds > 0
        m.videoNode.seek = elapsedSeconds
        Print "CrateTV: Synced to live time - position: " + Str(elapsedSeconds).Trim() + "s"
    End If
End Sub

Sub CheckLiveSync()
    If Not m.isLiveSync Or Not m.isPlaying
        return
    End If
    
    currentTime = GetCurrentTimestamp()
    expectedPosition = currentTime - m.actualStartTime
    actualPosition = m.videoNode.position
    
    drift = Abs(expectedPosition - actualPosition)
    
    If drift > 3
        m.videoNode.seek = expectedPosition
        m.syncLabel.text = "🔴 RESYNCING with community..."
        Print "CrateTV: Drift detected (" + Str(Int(drift)).Trim() + "s), resyncing"
    Else
        m.syncLabel.text = "🔴 LIVE WATCH PARTY - Synced with community"
    End If
End Sub

' =============================================================================
' PROGRESS TRACKING
' =============================================================================
Sub SaveProgress()
    If m.contentId = "" Or m.isLiveSync
        return
    End If
    
    position = Int(m.videoNode.position)
    duration = Int(m.videoNode.duration)
    
    If position > 10 And duration > 0
        If (duration - position) > 120
            SaveWatchPosition(m.contentId, position)
            Print "CrateTV: Progress saved - " + Str(position).Trim() + "s"
        End If
    End If
End Sub

Sub OnPlaybackFinished()
    m.isPlaying = false
    m.videoNode.control = "stop"
    m.progressTimer.control = "stop"
    m.syncTimer.control = "stop"
    If m.chatOverlay <> Invalid Then m.chatOverlay.isVisible = false
    
    If m.contentId <> ""
        ClearWatchPosition(m.contentId)
    End If
    
    m.top.playbackComplete = true
    m.top.closeRequested = true
    Print "CrateTV: Playback finished"
End Sub

Sub OnPlaybackError()
    m.isPlaying = false
    m.videoNode.control = "stop"
    m.progressTimer.control = "stop"
    m.syncTimer.control = "stop"
    
    errorInfo = ""
    If m.videoNode.errorMsg <> Invalid Then errorInfo = m.videoNode.errorMsg
    If m.videoNode.errorCode <> Invalid And m.videoNode.errorCode <> 0
        errorInfo = errorInfo + " (code: " + Str(m.videoNode.errorCode).Trim() + ")"
    End If
    
    If errorInfo <> ""
        ShowError("Unable to play this video. " + errorInfo)
    Else
        ShowError("Unable to play this video. Please try again.")
    End If
    
    Print "CrateTV: Playback error -- " + errorInfo
End Sub

' =============================================================================
' UI HELPERS
' =============================================================================
Sub ShowLoading(message as String)
    m.loadingLabel.text = message
    m.loadingOverlay.visible = true
End Sub

Sub HideLoading()
    m.loadingOverlay.visible = false
End Sub

Sub ShowError(message as String)
    m.errorMessage.text = message
    m.errorOverlay.visible = true
End Sub

Function SafeContentField(node as Object, field as String, defaultVal as String) as String
    If node = Invalid
        return defaultVal
    End If
    If Not node.HasField(field)
        return defaultVal
    End If
    value = node[field]
    If value = Invalid
        return defaultVal
    End If
    If Type(value) = "roString" Or Type(value) = "String"
        return value
    End If
    return defaultVal
End Function

' =============================================================================
' KEY HANDLING -- Remote controls playback, no UI rendered
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press
        return false
    End If
    
    ' Handle error state
    If m.errorOverlay.visible
        If key = "OK"
            m.errorOverlay.visible = false
            If m.top.content <> Invalid
                OnContentChange()
            End If
            return true
        End If
        If key = "back"
            m.top.closeRequested = true
            return true
        End If
        return true
    End If
    
    If key = "back"
        m.isPlaying = false
        SaveProgress()
        m.videoNode.control = "stop"
        m.progressTimer.control = "stop"
        m.syncTimer.control = "stop"
        If m.chatOverlay <> Invalid Then m.chatOverlay.isVisible = false
        m.top.closeRequested = true
        Print "CrateTV: User pressed Back -- exiting player"
        return true
    End If
    
    If key = "OK" Or key = "play"
        If m.isPlaying
            m.videoNode.control = "pause"
        Else
            m.videoNode.control = "resume"
        End If
        return true
    End If
    
    If key = "pause"
        m.videoNode.control = "pause"
        return true
    End If
    
    If key = "fastforward" Or key = "right"
        newPosition = m.videoNode.position + 10
        If newPosition < m.videoNode.duration
            m.videoNode.seek = newPosition
        End If
        return true
    End If
    
    If key = "rewind" Or key = "left"
        newPosition = m.videoNode.position - 10
        If newPosition < 0
            newPosition = 0
        End If
        m.videoNode.seek = newPosition
        return true
    End If
    
    If key = "replay"
        m.videoNode.seek = 0
        return true
    End If
    
    return false
End Function