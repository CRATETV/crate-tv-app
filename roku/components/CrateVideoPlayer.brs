' ##############################################################################
' CRATE TV - Video player logic (layout in CrateVideoPlayer.xml)
' ##############################################################################
'
' REMOTE
'   OK / Play-Pause   pause or resume (shows the controls)
'   Left / Rewind     back 10 seconds   } shows the controls; blocked during
'   Right / FF        forward 10 seconds} live watch parties (everyone in sync)
'   Replay            back to the start (not during watch parties)
'   Back              save position and leave
'
' CONTROLS
'   ShowControls() makes them visible; while the film is playing they hide
'   again after 4 seconds (controlsTimer). While paused they stay up.
'
' RESUME
'   Position is saved every 10 seconds (SaveProgress -> utils.brs registry),
'   except for trailers and watch parties. Playing again resumes from there;
'   the Title page's "Start over" clears it first.
' ##############################################################################

Sub Init()
    m.endTimer = Invalid
    m.endSecondsLeft = 0
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

    ' On-screen controls
    m.controls     = m.top.FindNode("controls")
    m.ctlTitle     = m.top.FindNode("ctlTitle")
    m.seekBar      = m.top.FindNode("seekBar")
    m.ctlPlayIcon  = m.top.FindNode("ctlPlayIcon")
    m.ctlPauseIcon = m.top.FindNode("ctlPauseIcon")
    m.barTrack     = m.top.FindNode("barTrack")
    m.barFill      = m.top.FindNode("barFill")
    m.barDot       = m.top.FindNode("barDot")
    m.ctlTime      = m.top.FindNode("ctlTime")
    m.ctlHint      = m.top.FindNode("ctlHint")
    m.controlsTimer = m.top.FindNode("controlsTimer")
    m.controlsTimer.ObserveField("fire", "HideControls")
    m.SKIP_SECONDS = 10

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
    m.ctlTitle.text = videoContent.title
    m.seekBar.visible = true
    m.controls.visible = false
    
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
    ' Watch parties: no progress bar or skipping, just the LIVE badge.
    If m.isLiveSync Then m.seekBar.visible = false
    
    ' Start playback
    m.videoNode.fillMode = "full"
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
        
        If m.controls.visible Then ShowControls()   ' restarts the auto-hide
        ' Watch parties: the LIVE badge shows at the start, then fades away.
        If m.isLiveSync And Not m.controls.visible Then m.controlsTimer.control = "start"

        ' Handle resume or live sync
        If m.isLiveSync
            SyncToLiveTime()
        Else If m.resumePosition > 0
            m.videoNode.seek = m.resumePosition
            m.resumePosition = 0
        End If
        
    Else If state = "paused"
        m.isPlaying = false
        ShowControls()
        
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
    If m.controls.visible Then UpdateControls()
End Sub

' =============================================================================
' ON-SCREEN CONTROLS
' =============================================================================
Sub ShowControls()
    UpdateControls()
    m.controls.visible = True
    If m.isLiveSync Then m.syncBanner.visible = True
    m.controlsTimer.control = "stop"
    ' While playing, fade away after a few seconds. While paused, stay up.
    If m.isPlaying Then m.controlsTimer.control = "start"
End Sub

Sub HideControls()
    If Not m.isPlaying Then Return       ' paused: keep them up
    m.controls.visible = False
    m.syncBanner.visible = False
End Sub

Sub UpdateControls()
    position = m.videoNode.position
    duration = m.videoNode.duration
    m.ctlPauseIcon.visible = m.isPlaying
    m.ctlPlayIcon.visible = Not m.isPlaying
    If m.isPlaying
        m.ctlHint.text = "OK  Pause     ◀ ▶  Skip 10 seconds     BACK  Exit"
    Else
        m.ctlHint.text = "OK  Play     ◀ ▶  Skip 10 seconds     BACK  Exit"
    End If
    If duration > 0
        fraction = position / duration
        If fraction > 1 Then fraction = 1
        If fraction < 0 Then fraction = 0
        fillW = Int(m.barTrack.width * fraction)
        m.barFill.width = fillW
        m.barDot.translation = [m.barTrack.translation[0] + fillW - 10, 10]
        m.ctlTime.text = "-" + ClockText(duration - position)
    Else
        m.barFill.width = 0
        m.ctlTime.text = ""
    End If
End Sub

' 3725 -> "1:02:05", 125 -> "2:05"
Function ClockText(seconds as Float) as String
    s = Int(seconds)
    If s < 0 Then s = 0
    h = Int(s / 3600)
    mins = Int((s - h * 3600) / 60)
    secs = s - h * 3600 - mins * 60
    secStr = Right("0" + Str(secs).Trim(), 2)
    If h > 0 Then Return Str(h).Trim() + ":" + Right("0" + Str(mins).Trim(), 2) + ":" + secStr
    Return Str(mins).Trim() + ":" + secStr
End Function

Sub Seek(deltaSeconds as Integer)
    newPosition = m.videoNode.position + deltaSeconds
    If newPosition < 0 Then newPosition = 0
    If m.videoNode.duration > 0 And newPosition >= m.videoNode.duration Then newPosition = m.videoNode.duration - 1
    m.videoNode.seek = newPosition
    ShowControls()
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
        m.syncLabel.text = "●  LIVE  ·  Catching up..."
        Print "CrateTV: Drift detected (" + Str(Int(drift)).Trim() + "s), resyncing"
    Else
        m.syncLabel.text = "●  LIVE  ·  Watching together"
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

    ' A real film (not a trailer or watch party): show the end card first.
    If ShowEndCard() Then Return

    m.top.playbackComplete = true
    m.top.closeRequested = true
    Print "CrateTV: Playback finished"
End Sub

' =============================================================================
' END CARD (after a film): support the filmmaker / read the zine / share
' =============================================================================
' Returns true if the card is showing (the player then closes when it's dismissed).
Function ShowEndCard() as Boolean
    content = m.top.content
    If content = Invalid Or m.isLiveSync Or m.contentId = "" Then Return false
    title = SafeContentField(content, "title", "")
    If Left(title, 8) = "Trailer:" Then Return false

    ' Episodes use "<series>_ep3" keys; the film page is the series'
    key = m.contentId
    epAt = Instr(1, key, "_ep")
    If epAt > 1 Then key = Left(key, epAt - 1)

    tiles = []
    canSupport = (content.HasField("supportEnabled") And content.supportEnabled) And Not (content.HasField("forSale") And content.forSale)
    If canSupport Then tiles.Push({ heading: "Support the filmmaker", note: "Tip any amount on your phone", url: "https://cratetv.net/movie/" + key + "?action=support", shown: "cratetv.net/movie/" + key })
    zine = SafeContentField(content, "zineUrl", "")
    If zine <> "" Then tiles.Push({ heading: "Read the zine", note: "Behind the scenes", url: zine, shown: zine.Replace("https://", "").Replace("http://", "") })
    tiles.Push({ heading: "Loved it? Share it", note: "Send the film to a friend", url: "https://cratetv.net/movie/" + key, shown: "cratetv.net/movie/" + key })

    m.top.FindNode("endTitle").text = title
    group = m.top.FindNode("endTiles")
    group.RemoveChildrenIndex(group.GetChildCount(), 0)
    TILE_W = 420 : GAP = 40
    startX = Int((1920 - (tiles.Count() * TILE_W + (tiles.Count() - 1) * GAP)) / 2)
    encoder = CreateObject("roUrlTransfer")
    For i = 0 To tiles.Count() - 1
        t = tiles[i]
        tile = group.CreateChild("Group")
        tile.translation = [startX + i * (TILE_W + GAP), 0]
        bg = tile.CreateChild("Poster")
        bg.uri = "pkg:/images/ui/card.9.png" : bg.width = TILE_W : bg.height = 480
        h = tile.CreateChild("Label")
        h.text = t.heading : h.font = CrateFont("bold", 28) : h.color = "#FFFFFF"
        h.width = TILE_W : h.horizAlign = "center" : h.translation = [0, 30]
        n = tile.CreateChild("Label")
        n.text = t.note : n.font = CrateFont("regular", 20) : n.color = "#B3B3B3"
        n.width = TILE_W : n.horizAlign = "center" : n.translation = [0, 72]
        white = tile.CreateChild("Rectangle")
        white.color = "#FFFFFF" : white.width = 252 : white.height = 252 : white.translation = [Int((TILE_W - 252) / 2), 118]
        qr = tile.CreateChild("Poster")
        qr.width = 236 : qr.height = 236 : qr.translation = [Int((TILE_W - 236) / 2), 126]
        qr.uri = "https://api.qrserver.com/v1/create-qr-code/?size=236x236&margin=0&data=" + encoder.Escape(t.url)
        u = tile.CreateChild("Label")
        u.text = t.shown : u.font = CrateFont("semibold", 18) : u.color = "#FFFFFF"
        u.width = TILE_W - 40 : u.maxLines = 1 : u.horizAlign = "center" : u.translation = [20, 400]
    End For

    HideControls()
    m.controls.visible = false
    m.top.FindNode("endCard").visible = true
    m.endSecondsLeft = 30
    UpdateEndCountdown()
    If m.endTimer = Invalid
        m.endTimer = m.top.CreateChild("Timer")
        m.endTimer.duration = 1
        m.endTimer.repeat = true
        m.endTimer.ObserveField("fire", "OnEndTick")
    End If
    m.endTimer.control = "start"
    Return true
End Function

Sub OnEndTick()
    m.endSecondsLeft = m.endSecondsLeft - 1
    If m.endSecondsLeft <= 0 Then CloseEndCard() Else UpdateEndCountdown()
End Sub

Sub UpdateEndCountdown()
    m.top.FindNode("endCountdown").text = "Closing in " + Str(m.endSecondsLeft).Trim() + " seconds"
End Sub

Sub CloseEndCard()
    If m.endTimer <> Invalid Then m.endTimer.control = "stop"
    m.top.FindNode("endCard").visible = false
    m.top.playbackComplete = true
    m.top.closeRequested = true
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
    
    ' End card: OK or Back closes it; everything else is ignored
    If m.top.FindNode("endCard").visible
        If key = "OK" Or key = "back" Then CloseEndCard()
        return true
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
            m.videoNode.control = "pause"     ' OnVideoStateChange shows the controls
        Else
            m.videoNode.control = "resume"
            ShowControls()
        End If
        return true
    End If
    
    If key = "pause"
        m.videoNode.control = "pause"
        return true
    End If

    ' Watch parties: Down or * hides/shows the live chat (ChatOverlay.xml).
    If m.isLiveSync And (key = "down" Or key = "options") And m.chatOverlay <> Invalid
        m.chatOverlay.toggle = true
        return true
    End If

    ' Watch parties: everyone watches in sync, so no skipping. Show the LIVE badge.
    If m.isLiveSync And (key = "fastforward" Or key = "right" Or key = "rewind" Or key = "left" Or key = "replay")
        ShowControls()
        return true
    End If
    
    If key = "fastforward" Or key = "right"
        Seek(m.SKIP_SECONDS)
        return true
    End If
    
    If key = "rewind" Or key = "left"
        Seek(-m.SKIP_SECONDS)
        return true
    End If
    
    If key = "replay"
        m.videoNode.seek = 0
        ShowControls()
        return true
    End If

    ' Up / Down just bring up the controls
    If key = "up" Or key = "down"
        ShowControls()
        return true
    End If
    
    return false
End Function