' ##############################################################################
' CRATE TV - Watch Party Scene Controller
'
' Flow:
'   OnFilmSet() called by MainScene with the film node
'     -> shows LOADING state
'     -> runs WatchPartyTask to fetch party status
'   OnPartyStatusReady()
'     -> status="waiting"  : show countdown, start countdownTimer
'     -> status="live"     : isPaid+!isUnlocked -> PAID QR screen
'                            else -> fire playContent with actualStartTime
'     -> status="ended"    : show ENDED screen (OK plays from beginning)
'   Poll timer (30s) re-runs WatchPartyTask to catch status transitions
'   (waiting->live, live->ended, isQALive toggle)
' ##############################################################################

Sub Init()
    ' UI nodes
    m.backdropPoster      = m.top.FindNode("backdropPoster")
    m.filmTitle           = m.top.FindNode("filmTitle")
    m.loadingState        = m.top.FindNode("loadingState")
    m.waitingState        = m.top.FindNode("waitingState")
    m.paidState           = m.top.FindNode("paidState")
    m.endedState          = m.top.FindNode("endedState")
    m.qaOverlay           = m.top.FindNode("qaOverlay")
    m.countdownLabel      = m.top.FindNode("countdownLabel")
    m.paidQrPoster        = m.top.FindNode("paidQrPoster")
    m.paidUrlLabel        = m.top.FindNode("paidUrlLabel")

    ' State
    m.noLiveState         = m.top.FindNode("noLiveState")
    m.blockState          = m.top.FindNode("blockState")
    m.voteState           = m.top.FindNode("voteState")
    m.voteRows            = m.top.FindNode("voteRows")
    m.tallyTask           = Invalid
    m.tallyBlockId        = ""
    m.tallyTimer = CreateObject("roSGNode", "Timer")
    m.tallyTimer.duration = 15
    m.tallyTimer.repeat   = true
    m.tallyTimer.ObserveField("fire", "FetchTally")
    m.currentFilm         = Invalid
    m.partyStatus         = "loading"
    m.scheduledStartTime  = 0   ' Unix seconds when party is scheduled
    m.actualStartTime     = 0   ' Unix seconds when party went live
    m.isPaid              = false
    m.isUnlocked          = false
    m.pollTask            = Invalid

    ' Countdown timer -- fires every second while waiting
    m.countdownTimer = CreateObject("roSGNode", "Timer")
    m.countdownTimer.duration = 1
    m.countdownTimer.repeat   = true
    m.countdownTimer.ObserveField("fire", "OnCountdownTick")

    ' Poll timer -- fires every 30s to re-check party status
    m.pollTimer = CreateObject("roSGNode", "Timer")
    m.pollTimer.duration = 30
    m.pollTimer.repeat   = true
    m.pollTimer.ObserveField("fire", "PollPartyStatus")
End Sub

' =============================================================================
' FILM SET -- entry point from MainScene
' =============================================================================
Sub OnFilmSet()
    film = m.top.film
    If film = Invalid
        ' No live party -- show a friendly holding screen
        ShowState("nolive")
        Return
    End If
    m.currentFilm = film

    ' Title
    title = ""
    If film.HasField("title") And film.title <> Invalid Then title = film.title
    m.filmTitle.text = title

    ' Backdrop
    posterUrl = ""
    If film.HasField("posterUrl") And film.posterUrl <> Invalid And film.posterUrl <> ""
        posterUrl = film.posterUrl
    Else If film.HasField("HDPosterUrl") And film.HDPosterUrl <> Invalid
        posterUrl = film.HDPosterUrl
    End If
    m.backdropPoster.uri = posterUrl

    ' isPaid from manifest
    m.isPaid = false
    If film.HasField("isWatchPartyPaid") And film.isWatchPartyPaid = true
        m.isPaid = true
    End If

    ' Scheduled start time from manifest (used for countdown if status=waiting)
    m.scheduledStartTime = 0
    If film.HasField("watchPartyStartTime") And film.watchPartyStartTime <> Invalid And film.watchPartyStartTime <> ""
        dt = CreateObject("roDateTime")
        dt.FromISO8601String(film.watchPartyStartTime)
        m.scheduledStartTime = dt.AsSeconds()
    End If

    ShowState("loading")
    FetchPartyStatus()
End Sub

' =============================================================================
' FETCH / POLL
' =============================================================================
Sub FetchPartyStatus()
    If m.currentFilm = Invalid Then Return

    movieKey = ""
    If m.currentFilm.HasField("movieKey") And m.currentFilm.movieKey <> Invalid
        movieKey = m.currentFilm.movieKey
    Else If m.currentFilm.HasField("id") And m.currentFilm.id <> Invalid
        movieKey = m.currentFilm.id
    End If
    If movieKey = "" Then Return

    task = CreateObject("roSGNode", "WatchPartyTask")
    task.movieKey  = movieKey
    task.authToken = m.top.authToken
    task.isPaid    = m.isPaid
    task.ObserveField("taskStatus", "OnPartyStatusReady")
    task.control = "RUN"
    m.pollTask = task
End Sub

Sub PollPartyStatus()
    ' Re-run every 30s to catch transitions
    FetchPartyStatus()
End Sub

Sub OnPartyStatusReady()
    task = m.pollTask
    If task = Invalid Then Return
    If task.taskStatus <> "success" Then Return

    partyStatus    = task.partyStatus
    isPlaying      = task.isPlaying
    actualStart    = task.actualStartTime
    isQALive       = task.isQALive
    isUnlocked     = task.isUnlocked

    m.partyStatus  = partyStatus
    m.isUnlocked   = isUnlocked
    If actualStart > 0 Then m.actualStartTime = actualStart

    ' Update QA overlay regardless of main state
    If m.qaOverlay <> Invalid Then m.qaOverlay.visible = isQALive

    ' Festival blocks (several films back to back) aren't supported on Roku
    ' yet -- this player can only follow one film. Send viewers to the web
    ' player instead of playing the wrong film from the wrong point.
    If task.partyType = "block" And partyStatus <> "ended"
        StopTimers()
        ShowState("block")
        StartTally()          ' switches to the vote screen if voting is open
        Return
    End If
    If task.partyType = "block" And partyStatus = "ended" Then StartTally()

    If partyStatus = "live" And isPlaying
        If m.isPaid And Not isUnlocked
            ' Paid party -- user doesn't have access -- show QR
            ShowPaidScreen()
        Else
            ' Free party or unlocked paid party -- join!
            JoinLiveParty()
        End If

    Else If partyStatus = "waiting"
        ShowState("waiting")
        ' Start countdown using scheduled time (or actual if available)
        startRef = m.scheduledStartTime
        If m.actualStartTime > 0 Then startRef = m.actualStartTime
        m.countdownTarget = startRef
        m.countdownTimer.control = "start"
        m.pollTimer.control = "start"

    Else If partyStatus = "ended"
        StopTimers()
        ShowState("ended")

    Else
        ' Unknown / waiting with no scheduled time
        ShowState("waiting")
        m.pollTimer.control = "start"
    End If
End Sub

' =============================================================================
' JOIN LIVE PARTY -- seek video to wall-clock offset
' =============================================================================
Sub JoinLiveParty()
    StopTimers()
    If m.currentFilm = Invalid Then Return
    If m.actualStartTime = 0 Then Return

    ' Calculate current offset: how many seconds into the film we should be
    now = CreateObject("roDateTime")
    currentSecs = now.AsSeconds()
    offset = currentSecs - m.actualStartTime

    If offset < 0 Then offset = 0

    ' Clone the film node and inject actualStartTime as a string field
    ' CrateVideoPlayer reads this and seeks on first play state
    film = m.currentFilm
    If Not film.HasField("actualStartTime")
        film.AddField("actualStartTime", "string", false)
    End If
    ' Store as ISO-like string the video player can parse (seconds since epoch)
    ' We pass it differently -- as an integer field for direct use
    If Not film.HasField("watchPartyOffset")
        film.AddField("watchPartyOffset", "integer", false)
    End If
    film.watchPartyOffset = offset

    Print "CrateTV [WatchParty]: Joining live party at offset " + Str(offset).Trim() + "s"

    ' Signal MainScene to launch video player
    m.top.playContent = film
End Sub

' =============================================================================
' PAID SCREEN -- QR code to webapp
' =============================================================================
Sub ShowPaidScreen()
    StopTimers()
    ShowState("paid")

    movieKey = ""
    If m.currentFilm <> Invalid And m.currentFilm.HasField("movieKey")
        movieKey = m.currentFilm.movieKey
    End If

    watchPartyUrl = "https://cratetv.net/watchparty"
    If movieKey <> "" Then watchPartyUrl = "https://cratetv.net/watchparty/" + movieKey

    ' Generate QR via api.qrserver.com (same pattern as NowStreamingScene)
    encoded = watchPartyUrl.Replace(":", "%3A").Replace("/", "%2F")
    qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=236x236&margin=0&data=" + encoded
    If m.paidQrPoster <> Invalid Then m.paidQrPoster.uri = qrUrl
    ' Show the address without "https://" (easier to read and type)
    If m.paidUrlLabel <> Invalid Then m.paidUrlLabel.text = watchPartyUrl.Replace("https://", "")
End Sub

' =============================================================================
' COUNTDOWN TICK -- fires every second while waiting
' =============================================================================
Sub OnCountdownTick()
    If m.countdownLabel = Invalid Then Return

    now = CreateObject("roDateTime")
    currentSecs = now.AsSeconds()
    remaining   = m.countdownTarget - currentSecs

    If remaining <= 0
        ' Time's up -- re-poll immediately to get live status
        m.countdownTimer.control = "stop"
        m.countdownLabel.text = "Starting..."
        FetchPartyStatus()
        Return
    End If

    hours = Int(remaining / 3600)
    mins  = Int((remaining Mod 3600) / 60)
    secs  = remaining Mod 60

    hStr = Right("0" + Str(hours).Trim(), 2)
    mStr = Right("0" + Str(mins).Trim(), 2)
    sStr = Right("0" + Str(secs).Trim(), 2)

    m.countdownLabel.text = hStr + ":" + mStr + ":" + sStr
End Sub

' =============================================================================
' STATE SWITCHING
' =============================================================================
Sub ShowState(state as String)
    If m.loadingState <> Invalid Then m.loadingState.visible = (state = "loading")
    If m.waitingState <> Invalid Then m.waitingState.visible = (state = "waiting")
    If m.paidState    <> Invalid Then m.paidState.visible    = (state = "paid")
    If m.endedState   <> Invalid Then m.endedState.visible   = (state = "ended")
    If m.noLiveState  <> Invalid Then m.noLiveState.visible  = (state = "nolive")
    If m.blockState   <> Invalid Then m.blockState.visible   = (state = "block")
    If m.voteState    <> Invalid Then m.voteState.visible    = (state = "vote")
End Sub

' =============================================================================
' VOTE FROM THE COUCH (festival blocks with Audience Choice)
' =============================================================================
' Every 15 s, asks cratetv.net/api/audience?tally=<blockId> for the counts.
' If the block has voting (2+ films) and it's open, or closed with votes,
' this screen shows the QR to vote on a phone and live bars per film.
Sub StartTally()
    key = ""
    If m.currentFilm <> Invalid And m.currentFilm.HasField("movieKey") Then key = m.currentFilm.movieKey
    If key = "" And m.currentFilm <> Invalid Then key = m.currentFilm.id
    If key = "" Then Return
    m.tallyBlockId = key
    encoder = CreateObject("roUrlTransfer")
    m.top.FindNode("voteQr").uri = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=" + encoder.Escape("https://cratetv.net/watchparty/" + key)
    m.top.FindNode("voteUrl").text = "cratetv.net/watchparty/" + key
    FetchTally()
    m.tallyTimer.control = "start"
End Sub

Sub FetchTally()
    If m.tallyTask <> Invalid Or m.tallyBlockId = "" Then Return
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "getJson"
    task.feedUrl = "https://cratetv.net/api/audience?tally=" + m.tallyBlockId
    task.ObserveField("taskStatus", "OnTally")
    task.control = "run"
    m.tallyTask = task
End Sub

Sub OnTally()
    task = m.tallyTask
    If task = Invalid Or (task.taskStatus <> "success" And task.taskStatus <> "error") Then Return
    m.tallyTask = Invalid
    If task.taskStatus <> "success" Then Return
    t = ParseJson(task.actorResults)
    If t = Invalid Or t.state = Invalid Then Return
    total = 0
    If t.total <> Invalid Then total = t.total
    If t.state = "open"
        m.top.FindNode("voteHeading").text = "Vote for Audience Choice"
        m.top.FindNode("voteSub").text = "Scan with your phone to join the screening and vote for your favourite film."
    Else If t.state = "closed" And total > 0
        m.top.FindNode("voteHeading").text = "Audience Choice: the results"
        m.top.FindNode("voteSub").text = "Voting has closed. Thank you for voting!"
        m.top.FindNode("voteQrGroup").visible = false
    Else
        m.tallyTimer.control = "stop"      ' no voting for this block
        Return
    End If
    If Type(t.results) = "roArray" Then DrawTally(t.results, total)
    If total = 1 Then m.top.FindNode("voteTotal").text = "1 vote so far" Else m.top.FindNode("voteTotal").text = Str(total).Trim() + " votes so far"
    ShowState("vote")
End Sub

' One row per film: title, a red bar sized by its share, and the percentage.
Sub DrawTally(results as Object, total as Integer)
    m.voteRows.RemoveChildrenIndex(m.voteRows.GetChildCount(), 0)
    BAR = 760
    y = 0
    For Each r in results
        row = m.voteRows.CreateChild("Group")
        row.translation = [0, y]
        title = row.CreateChild("Label")
        title.text = r.title : title.font = CrateFontLocal("Inter-SemiBold", 24) : title.color = "#FFFFFF"
        title.width = BAR - 100 : title.maxLines = 1
        pct = row.CreateChild("Label")
        share = 0
        If r.share <> Invalid Then share = r.share
        pct.text = Str(Int(share + 0.5)).Trim() + "%" : pct.font = CrateFontLocal("Inter-Bold", 24) : pct.color = "#FFFFFF"
        pct.width = 100 : pct.horizAlign = "right" : pct.translation = [BAR - 100, 0]
        track = row.CreateChild("Poster")
        track.uri = "pkg:/images/ui/bar_track.9.png" : track.width = BAR : track.height = 10 : track.translation = [0, 38]
        fill = row.CreateChild("Poster")
        fill.uri = "pkg:/images/ui/bar_fill.9.png" : fill.height = 10 : fill.translation = [0, 38]
        fill.width = Int(BAR * share / 100)
        If fill.width < 10 And share > 0 Then fill.width = 10
        fill.visible = (share > 0)
        y = y + 64
    End For
End Sub

Function CrateFontLocal(face as String, size as Integer) as Object
    f = CreateObject("roSGNode", "Font")
    f.uri = "pkg:/fonts/" + face + ".ttf"
    f.size = size
    Return f
End Function

Sub StopTimers()
    If m.countdownTimer <> Invalid Then m.countdownTimer.control = "stop"
    If m.pollTimer      <> Invalid Then m.pollTimer.control      = "stop"
End Sub

' =============================================================================
' KEY HANDLING
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false

    If key = "back"
        StopTimers()
        m.tallyTimer.control = "stop"
        m.top.exitRequested = true
        Return true
    End If

    If key = "OK"
        If m.partyStatus = "ended" And m.currentFilm <> Invalid
            ' Watch from the beginning -- no offset
            m.top.playContent = m.currentFilm
            Return true
        End If
        If m.partyStatus = "live" And Not m.isPaid
            JoinLiveParty()
            Return true
        End If
    End If

    Return false
End Function
