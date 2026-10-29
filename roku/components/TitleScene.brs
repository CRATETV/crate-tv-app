' ##############################################################################
' CRATE TV - Title page logic (layout and button rules are in TitleScene.xml)
' ##############################################################################
'
' KEYS
'   Left / Right  move between buttons
'   OK            press the highlighted button
'   Back          not handled here on purpose: MainScene receives it and
'                 returns to the previous screen (PopScene)
' ##############################################################################

Sub Init()
    m.BUTTON_GAP = 20
    m.RESUME_MIN_SECONDS = 30     ' offer "Resume" only if they watched at least this much

    m.art        = m.top.FindNode("art")
    m.fadeLeft   = m.top.FindNode("fadeLeft")
    m.eyebrow    = m.top.FindNode("eyebrow")
    m.titleLabel = m.top.FindNode("title")
    m.meta       = m.top.FindNode("meta")
    m.award      = m.top.FindNode("award")
    m.synopsis   = m.top.FindNode("synopsis")
    m.cast       = m.top.FindNode("cast")
    m.director   = m.top.FindNode("director")
    m.buttonsGroup = m.top.FindNode("buttons")
    m.unlockCard = m.top.FindNode("unlockCard")
    m.unlockPrice = m.top.FindNode("unlockPrice")
    m.unlockUrl  = m.top.FindNode("unlockUrl")
    m.qrCode     = m.top.FindNode("qrCode")

    m.unlockNote = m.top.FindNode("unlockNote")
    m.buttons = []
    m.focusIndex = 0
    m.artWide = false

    ' Trailer preview (see TitleScene.xml / TrailerPreview.xml)
    m.trailer = m.top.FindNode("trailer")
    m.trailer.ObserveField("isPlaying", "OnTrailerPlayingChange")
    m.trailer.ObserveField("finished", "OnTrailerPlayingChange")
    m.previewTimer = m.top.FindNode("previewTimer")
    m.previewTimer.ObserveField("fire", "OnPreviewTimerFire")

    ' Automatic unlock check for locked films
    m.MAX_UNLOCK_CHECKS = 40           ' 40 x 15 seconds = 10 minutes
    m.unlockChecks = 0
    m.unlockTask = Invalid
    m.unlockTimer = m.top.FindNode("unlockTimer")
    m.unlockTimer.ObserveField("fire", "CheckForUnlock")

    ' Series episode list
    m.EP_ROW_H = 96
    m.EP_VISIBLE = 3
    m.EP_WIDTH = 1240
    m.episodesGroup = m.top.FindNode("episodesGroup")
    m.episodeRows = m.top.FindNode("episodeRows")
    m.episodesCount = m.top.FindNode("episodesCount")
    m.episodesMore = m.top.FindNode("episodesMore")
    m.episodes = []
    m.epFocus = 0
    m.epOffset = 0
    m.zone = "buttons"           ' "buttons" or "episodes"
    m.playingEpisode = -1
    m.playingContent = Invalid   ' the copy of the series that is playing an episode
    m.autoNextIndex = -1
    m.autoNextTimer = m.top.FindNode("autoNextTimer")
    m.autoNextTimer.ObserveField("fire", "OnAutoNextFire")

    ' Stop the trailer / unlock checks when the viewer leaves; resume on return.
    m.top.ObserveField("focusedChild", "OnFocusChange")

    m.art.ObserveField("loadStatus", "OnArtLoaded")
    m.artFade = m.top.CreateChild("Animation")
    m.artFade.duration = 0.45
    m.artFade.easeFunction = "outQuad"
    fade = m.artFade.CreateChild("FloatFieldInterpolator")
    fade.fieldToInterp = "art.opacity"
    fade.key = [0.0, 1.0]
    fade.keyValue = [0.0, 1.0]
End Sub

Sub OnContentChange()
    film = m.top.content
    If film = Invalid Then Return
    locked = (film.HasField("isUnlocked") And Not film.isUnlocked)
    watchParty = (film.HasField("isWatchPartyEnabled") And film.isWatchPartyEnabled)

    ' --- Text ---
    eyebrow = "CRATE TV"
    If watchParty Then eyebrow = "●  WATCH PARTY"
    If locked Then eyebrow = "PREMIERE"
    m.eyebrow.text = eyebrow
    m.titleLabel.text = Txt(film, "title")
    m.meta.text = MetaLine(film, locked)
    awardText = Txt(film, "awardName")
    If awardText <> ""
        If Txt(film, "awardYear") <> "" Then awardText = awardText + " " + Txt(film, "awardYear")
        awardText = "★  " + awardText
    End If
    m.award.text = awardText
    m.synopsis.text = Txt(film, "description")
    If Txt(film, "cast") <> "" Then m.cast.text = "Starring " + Txt(film, "cast") Else m.cast.text = ""
    If Txt(film, "director") <> "" Then m.director.text = "Directed by " + Txt(film, "director") Else m.director.text = ""

    ' Series: shorter text on top so the episode list fits underneath
    m.episodes = []
    If film.HasField("episodes") And film.episodes <> Invalid Then m.episodes = film.episodes
    isSeries = (m.episodes.Count() > 0)
    If isSeries
        m.titleLabel.maxLines = 1
        m.synopsis.maxLines = 2
        m.cast.text = ""
        m.award.text = ""
        If Txt(film, "runtime") = "" Then m.meta.text = SeriesMeta(film, locked)
        m.buttonsGroup.translation = [96, 560]
    Else
        m.titleLabel.maxLines = 2
        m.synopsis.maxLines = 4
        m.buttonsGroup.translation = [96, 860]
    End If
    LayoutInfo()

    ' --- Artwork: wide image full screen, portrait poster on the right ---
    wide = (film.HasField("hasWideArt") And film.hasWideArt)
    m.artWide = wide
    url = ""
    If wide Then url = Txt(film, "backdropUrl")
    If url = "" Then url = Txt(film, "posterUrl")
    If wide
        m.art.translation = [0, 0] : m.art.width = 1920 : m.art.loadWidth = 1920
    Else
        m.art.translation = [880, 0] : m.art.width = 1040 : m.art.loadWidth = 1040
    End If
    OnTrailerPlayingChange()      ' sets the left fade for this artwork
    m.art.opacity = 0.0
    m.art.uri = url

    ' --- Unlock card (locked films) ---
    m.unlockCard.visible = locked
    If locked
        key = Txt(film, "movieKey")
        If key = "" Then key = Txt(film, "id")
        pageUrl = "https://cratetv.net/movie/" + key
        m.unlockUrl.text = "cratetv.net/movie/" + key
        If film.HasField("salePrice") And film.salePrice > 0
            m.unlockPrice.text = "$" + PriceText(film.salePrice) + "  ·  yours to watch on any screen"
        Else
            m.unlockPrice.text = "Watch on any screen once unlocked"
        End If
        ' Same free QR service the Now Streaming tab already uses.
        encoder = CreateObject("roUrlTransfer")
        m.qrCode.uri = "https://api.qrserver.com/v1/create-qr-code/?size=216x216&margin=0&data=" + encoder.Escape(pageUrl)
        If IsDeviceLinked()
            m.unlockNote.text = "This page updates by itself once you've paid."
        Else
            m.unlockNote.text = "First link this Roku: Account tab, then Link."
        End If
    End If

    BuildButtons(film, locked, watchParty)
    BuildEpisodes(locked)

    ' Trailer after a short pause; unlock checks for locked films
    StopPreview()
    m.previewTimer.control = "start"
    m.unlockChecks = 0
    m.unlockTimer.control = "stop"
    If locked And IsDeviceLinked() Then m.unlockTimer.control = "start"
End Sub

' ---- Trailer preview ----------------------------------------------------------
Sub OnPreviewTimerFire()
    If Not m.top.IsInFocusChain() Then Return
    film = m.top.content
    ' Trailer, or a minute from the middle of the film (source/Preview.brs)
    src = PreviewSourceFor(film)
    If src.url = "" Then Return
    m.trailer.url = src.url
    m.trailer.startPercent = src.startPercent
    m.trailer.maxSeconds = src.maxSeconds
    m.trailer.control = "play"
End Sub

Sub StopPreview()
    m.previewTimer.control = "stop"
    m.trailer.control = "stop"
End Sub

' Trailers are 16:9 and fill the screen: use the full-screen fade while one plays.
Sub OnTrailerPlayingChange()
    If m.trailer.isPlaying Or m.artWide
        m.fadeLeft.translation = [0, 0] : m.fadeLeft.width = 1400
    Else
        m.fadeLeft.translation = [508, 0] : m.fadeLeft.width = 840
    End If
End Sub

Sub OnFocusChange()
    If m.top.IsInFocusChain() And m.playingEpisode >= 0
        ' Back from an episode. If it was watched to the end (its saved place
        ' is cleared), highlight the next one so a single OK plays it.
        film = m.top.content
        epKey = SeriesKey(film) + "_ep" + Str(m.playingEpisode + 1).Trim()
        If GetLastWatchPosition(epKey) < 10 And m.playingEpisode + 1 < m.episodes.Count()
            m.zone = "episodes"
            m.epFocus = m.playingEpisode + 1
            RegistryWrite("lastEp_" + SeriesKey(film), Str(m.epFocus).Trim(), GetRegistryConfig().SECTION)
            ' The player's "Up next" card ran out (or OK was pressed): carry on
            ' with the next episode by itself, like Netflix.
            If m.playingContent <> Invalid And m.playingContent.HasField("autoPlayNext") And m.playingContent.autoPlayNext
                m.autoNextIndex = m.epFocus
                m.autoNextTimer.control = "start"
            End If
        Else
            m.zone = "episodes"
            m.epFocus = m.playingEpisode
        End If
        m.playingEpisode = -1
        m.playingContent = Invalid
        UpdateButtonFocus()
        UpdateEpisodeFocus()
    End If
    If m.top.IsInFocusChain()
        ' Back on this page (e.g. after the trailer or film): resume
        If Not m.trailer.isPlaying Then m.previewTimer.control = "start"
        If IsLocked() And IsDeviceLinked() And m.unlockChecks < m.MAX_UNLOCK_CHECKS Then m.unlockTimer.control = "start"
    Else
        StopPreview()
        m.unlockTimer.control = "stop"
    End If
End Sub

' ---- Unlocking while the page is open -----------------------------------------
Function IsLocked() as Boolean
    film = m.top.content
    Return film <> Invalid And film.HasField("isUnlocked") And Not film.isUnlocked
End Function

' Every 15 s: download this Roku's catalogue again (it knows what the linked
' account owns) and look for this film.
Sub CheckForUnlock()
    If Not IsLocked() Then m.unlockTimer.control = "stop" : Return
    If m.unlockTask <> Invalid Then Return              ' previous check still running
    m.unlockChecks = m.unlockChecks + 1
    If m.unlockChecks > m.MAX_UNLOCK_CHECKS Then m.unlockTimer.control = "stop" : Return
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "fetchFeed"
    If m.global.HasField("deviceId") Then task.deviceId = m.global.deviceId
    task.ObserveField("taskStatus", "OnUnlockCheckDone")
    task.control = "run"
    m.unlockTask = task
End Sub

Sub OnUnlockCheckDone()
    task = m.unlockTask
    If task = Invalid Or (task.taskStatus <> "success" And task.taskStatus <> "error") Then Return
    m.unlockTask = Invalid
    If task.taskStatus <> "success" Or task.feedData = Invalid Then Return

    film = m.top.content
    key = Txt(film, "movieKey")
    If key = "" Then key = Txt(film, "id")
    fresh = FindFilm(task.feedData, key)
    If fresh = Invalid Or Not fresh.HasField("isUnlocked") Or Not fresh.isUnlocked Then Return

    ' Paid! Copy the real stream onto this film (it's the same node Home shows).
    For Each f in ["streamUrl", "url", "streamFormat"]
        If fresh.HasField(f)
            If Not film.HasField(f) Then film.AddField(f, "string", false)
            film[f] = fresh[f]
        End If
    End For
    film.isUnlocked = true
    ' Series: the fresh catalogue now includes the episode videos
    If fresh.HasField("episodes") And fresh.episodes <> Invalid
        If Not film.HasField("episodes") Then film.AddField("episodes", "array", false)
        film.episodes = fresh.episodes
        m.episodes = fresh.episodes
    End If
    m.unlockTimer.control = "stop"

    m.unlockCard.visible = false
    m.eyebrow.text = "UNLOCKED  ·  ENJOY THE FILM"
    m.meta.text = MetaLine(film, false)
    LayoutInfo()
    watchParty = (film.HasField("isWatchPartyEnabled") And film.isWatchPartyEnabled)
    BuildButtons(film, false, watchParty)
    BuildEpisodes(false)
End Sub

Function FindFilm(tree as Object, key as String) as Object
    If key = "" Then Return Invalid
    For i = 0 To tree.GetChildCount() - 1
        row = tree.GetChild(i)
        For j = 0 To row.GetChildCount() - 1
            item = row.GetChild(j)
            If item <> Invalid And (Txt(item, "movieKey") = key Or Txt(item, "id") = key) Then Return item
        End For
    End For
    Return Invalid
End Function

' Stacks the info lines, skipping empty ones.
Sub LayoutInfo()
    gaps = { eyebrow: 10, title: 16, meta: 10, award: 18, synopsis: 18, cast: 8, director: 0 }
    y = 0
    For Each name in ["eyebrow", "title", "meta", "award", "synopsis", "cast", "director"]
        If name = "title" Then label = m.titleLabel Else label = m[name]
        hasText = (label.text <> "")
        label.visible = hasText
        If hasText
            label.translation = [0, y]
            y = y + label.boundingRect().height + gaps[name]
        End If
    End For
End Sub

' Decides which buttons to show (see the table in TitleScene.xml).
Sub BuildButtons(film as Object, locked as Boolean, watchParty as Boolean)
    m.buttonsGroup.RemoveChildrenIndex(m.buttonsGroup.GetChildCount(), 0)
    m.buttons = []
    hasTrailer = (Txt(film, "trailerUrl") <> "")

    If locked
        If hasTrailer Then AddButton("▶  Watch trailer", "trailer")
    Else If watchParty
        AddButton("▶  Join watch party", "play")
        If hasTrailer Then AddButton("Trailer", "trailer")
    Else If m.episodes.Count() > 0
        ' Series: play episode 1, or carry on from the last one they played
        lastEp = LastEpisodeIndex(film)
        If lastEp > 0
            AddButton("▶  Continue episode " + Str(lastEp + 1).Trim(), "playEpisode:" + Str(lastEp).Trim())
            AddButton("Episode 1", "playEpisode:0")
        Else
            AddButton("▶  Play episode 1", "playEpisode:0")
        End If
        If hasTrailer Then AddButton("Trailer", "trailer")
    Else
        key = Txt(film, "movieKey")
        If key = "" Then key = Txt(film, "id")
        saved = 0
        If key <> "" Then saved = GetLastWatchPosition(key)
        If saved >= m.RESUME_MIN_SECONDS
            AddButton("▶  Resume", "play")
            AddButton("Start over", "startOver")
        Else
            AddButton("▶  Play", "play")
        End If
        If hasTrailer Then AddButton("Trailer", "trailer")
    End If

    ' Position left to right
    x = 0
    For Each b in m.buttons
        b.translation = [x, 0]
        x = x + b.buttonWidth + m.BUTTON_GAP
    End For
    m.focusIndex = 0
    UpdateButtonFocus()
End Sub

Sub AddButton(text as String, action as String)
    b = m.buttonsGroup.CreateChild("CrateButton")
    b.text = text
    b.action = action
    m.buttons.Push(b)
End Sub

Sub UpdateButtonFocus()
    For i = 0 To m.buttons.Count() - 1
        m.buttons[i].focused = (i = m.focusIndex And m.zone = "buttons")
    End For
End Sub

' ---- Series: episode list -------------------------------------------------------
Sub BuildEpisodes(locked as Boolean)
    m.episodeRows.RemoveChildrenIndex(m.episodeRows.GetChildCount(), 0)
    m.zone = "buttons"
    m.epFocus = 0
    m.epOffset = 0
    count = m.episodes.Count()
    m.episodesGroup.visible = (count > 0)
    If count = 0 Then Return
    If count = 1 Then m.episodesCount.text = "1 episode" Else m.episodesCount.text = Str(count).Trim() + " episodes"
    If locked Then m.episodesCount.text = m.episodesCount.text + "  ·  unlock to watch"

    For i = 0 To count - 1
        ep = m.episodes[i]
        row = m.episodeRows.CreateChild("Group")
        bg = row.CreateChild("Poster")
        bg.id = "bg" : bg.width = m.EP_WIDTH : bg.height = m.EP_ROW_H - 8 : bg.uri = ""
        num = row.CreateChild("Label")
        num.text = Str(i + 1).Trim() : num.font = CrateFont("display", 40) : num.color = "#8C8C8C"
        num.width = 70 : num.height = m.EP_ROW_H - 8 : num.horizAlign = "center" : num.vertAlign = "center"
        num.translation = [8, 0]
        t = row.CreateChild("Label")
        t.text = ep.title : t.font = CrateFont("semibold", 27) : t.color = "#FFFFFF"
        t.width = 900 : t.maxLines = 1 : t.translation = [100, 12]
        d = row.CreateChild("Label")
        d.text = EpisodeLength(ep) : d.font = CrateFont("medium", 22) : d.color = "#8C8C8C"
        d.width = 200 : d.horizAlign = "right" : d.translation = [m.EP_WIDTH - 224, 16]
        syn = row.CreateChild("Label")
        syn.text = ep.synopsis : syn.font = CrateFont("regular", 22) : syn.color = "#B3B3B3"
        syn.width = 1100 : syn.maxLines = 1 : syn.translation = [100, 50]
        If locked Then row.opacity = 0.55
    End For
    LayoutEpisodes()
End Sub

' Shows 3 rows at a time; the highlighted one gets the card background.
Sub LayoutEpisodes()
    count = m.episodeRows.GetChildCount()
    If m.epFocus < m.epOffset Then m.epOffset = m.epFocus
    If m.epFocus > m.epOffset + m.EP_VISIBLE - 1 Then m.epOffset = m.epFocus - m.EP_VISIBLE + 1
    For i = 0 To count - 1
        row = m.episodeRows.GetChild(i)
        shown = (i >= m.epOffset And i < m.epOffset + m.EP_VISIBLE)
        row.visible = shown
        row.translation = [0, (i - m.epOffset) * m.EP_ROW_H]
        bg = row.FindNode("bg")
        If m.zone = "episodes" And i = m.epFocus
            bg.uri = "pkg:/images/ui/card.9.png"
        Else
            bg.uri = ""
        End If
    End For
    below = count - (m.epOffset + m.EP_VISIBLE)
    If below > 0 Then m.episodesMore.text = "▼  " + Str(below).Trim() + " more" Else m.episodesMore.text = ""
    m.episodesMore.translation = [0, 52 + m.EP_VISIBLE * m.EP_ROW_H]
End Sub

Sub UpdateEpisodeFocus()
    LayoutEpisodes()
End Sub

Function EpisodesPlayable() as Boolean
    If m.episodes.Count() = 0 Then Return false
    Return m.episodes[0].url <> ""          ' urls are only sent when the viewer has access
End Function

' Plays one episode: a copy of the series with that episode's video, and its
' own key so each episode remembers its own place.
Sub PlayEpisode(index as Integer)
    If index < 0 Or index >= m.episodes.Count() Then Return
    ep = m.episodes[index]
    If ep.url = "" Then Return
    film = m.top.content
    StopPreview()
    key = SeriesKey(film)
    epKey = key + "_ep" + Str(index + 1).Trim()
    copy = film.Clone(false)
    SetText(copy, "streamUrl", ep.url)
    SetText(copy, "url", ep.url)
    If Instr(1, LCase(ep.url), ".m3u8") > 0 Then fmt = "hls" Else fmt = "mp4"
    SetText(copy, "streamFormat", fmt)
    SetText(copy, "title", Txt(film, "title") + "  ·  Episode " + Str(index + 1).Trim() + ": " + ep.title)
    SetText(copy, "id", epKey)
    SetText(copy, "movieKey", epKey)
    SetText(copy, "contentId", epKey)
    If copy.HasField("isWatchPartyEnabled") Then copy.isWatchPartyEnabled = false
    ' Tells the player there is a next episode, so it can show "Up next" when this one ends.
    nextTitle = ""
    If index + 1 < m.episodes.Count()
        nextEp = m.episodes[index + 1]
        If nextEp.url <> "" Then nextTitle = "Episode " + Str(index + 2).Trim() + ": " + nextEp.title
    End If
    SetText(copy, "nextEpisodeTitle", nextTitle)
    ' Skip intro: seconds, as text ("0" = none). The player shows the button in that window.
    SetText(copy, "introStart", Str(ep.introStart).Trim())
    SetText(copy, "introEnd", Str(ep.introEnd).Trim())
    RegistryWrite("lastEp_" + key, Str(index).Trim(), GetRegistryConfig().SECTION)
    m.playingEpisode = index
    m.playingContent = copy
    m.top.playContent = copy
End Sub

' The close of the previous episode has finished: play the next one.
Sub OnAutoNextFire()
    i = m.autoNextIndex
    m.autoNextIndex = -1
    If i < 0 Then Return
    If Not m.top.IsInFocusChain() Then Return     ' the viewer already went elsewhere
    PlayEpisode(i)
End Sub

Function SeriesKey(film as Object) as String
    key = Txt(film, "movieKey")
    If key = "" Then key = Txt(film, "id")
    Return key
End Function

Function LastEpisodeIndex(film as Object) as Integer
    v = RegistryRead("lastEp_" + SeriesKey(film), GetRegistryConfig().SECTION)
    If v = Invalid Or v = "" Then Return 0
    i = Val(v)
    If i < 0 Or i >= m.episodes.Count() Then Return 0
    Return i
End Function

' "24 min". Lengths over 3 hours' worth of minutes are taken as seconds.
Function EpisodeLength(ep as Object) as String
    d = ep.duration
    If d = Invalid Or d <= 0 Then Return ""
    If d > 180 Then d = Int((d + 30) / 60)
    Return Str(d).Trim() + " min"
End Function

Function SeriesMeta(film as Object, locked as Boolean) as String
    n = m.episodes.Count()
    If n = 1 Then text = "Series  ·  1 episode" Else text = "Series  ·  " + Str(n).Trim() + " episodes"
    If Txt(film, "genres") <> "" Then text = text + "  ·  " + Txt(film, "genres")
    If locked And film.HasField("salePrice") And film.salePrice > 0 Then text = text + "  ·  $" + PriceText(film.salePrice) + " to unlock"
    Return text
End Function

Sub OnButtonPressed(action as String)
    film = m.top.content
    If film = Invalid Then Return

    StopPreview()          ' only one video can play at a time

    If Left(action, 12) = "playEpisode:"
        PlayEpisode(Val(Mid(action, 13)))
        Return
    End If

    If action = "play"
        m.top.playContent = film

    Else If action = "startOver"
        key = Txt(film, "movieKey")
        If key = "" Then key = Txt(film, "id")
        If key <> "" Then ClearWatchPosition(key)
        m.top.playContent = film

    Else If action = "trailer"
        ' A copy of the film that points at the trailer and has no id, so the
        ' player doesn't save progress or mark the film as watched.
        trailer = film.Clone(false)
        SetText(trailer, "streamUrl", Txt(film, "trailerUrl"))
        SetText(trailer, "url", Txt(film, "trailerUrl"))
        SetText(trailer, "title", "Trailer: " + Txt(film, "title"))
        SetText(trailer, "id", "")
        SetText(trailer, "movieKey", "")
        SetText(trailer, "contentId", "")
        If trailer.HasField("isWatchPartyEnabled") Then trailer.isWatchPartyEnabled = false
        m.top.playContent = trailer
    End If
End Sub

Sub OnArtLoaded()
    If m.art.loadStatus = "ready" Then m.artFade.control = "start"
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false

    ' --- In the episode list ---
    If m.zone = "episodes"
        If key = "up"
            If m.epFocus = 0
                m.zone = "buttons" : UpdateButtonFocus() : UpdateEpisodeFocus()
            Else
                m.epFocus = m.epFocus - 1 : UpdateEpisodeFocus()
            End If
            Return true
        End If
        If key = "down"
            If m.epFocus < m.episodes.Count() - 1 Then m.epFocus = m.epFocus + 1 : UpdateEpisodeFocus()
            Return true
        End If
        If key = "OK" Or key = "play"
            PlayEpisode(m.epFocus)
            Return true
        End If
        If key = "left" Or key = "right" Then Return true
        Return false      ' Back -> MainScene
    End If

    ' --- On the buttons: Down goes into the episodes (if they can be played) ---
    If key = "down" And EpisodesPlayable()
        m.zone = "episodes"
        UpdateButtonFocus()
        UpdateEpisodeFocus()
        Return true
    End If
    If m.buttons.Count() = 0 Then Return false

    If key = "left"
        If m.focusIndex > 0 Then m.focusIndex = m.focusIndex - 1 : UpdateButtonFocus()
        Return true
    End If
    If key = "right"
        If m.focusIndex < m.buttons.Count() - 1 Then m.focusIndex = m.focusIndex + 1 : UpdateButtonFocus()
        Return true
    End If
    If key = "OK" Or key = "play"
        OnButtonPressed(m.buttons[m.focusIndex].action)
        Return true
    End If
    Return false      ' Back etc. go to MainScene
End Function

' ---- helpers -----------------------------------------------------------------

Function MetaLine(film as Object, locked as Boolean) as String
    parts = []
    If Txt(film, "runtime") <> "" Then parts.Push(Txt(film, "runtime"))
    If Txt(film, "genres") <> "" Then parts.Push(Txt(film, "genres"))
    If locked
        If film.HasField("salePrice") And film.salePrice > 0
            parts.Push("$" + PriceText(film.salePrice) + " to unlock")
        Else
            parts.Push("Unlock at cratetv.net")
        End If
    End If
    result = ""
    For i = 0 To parts.Count() - 1
        If i > 0 Then result = result + "  ·  "
        result = result + parts[i]
    End For
    Return result
End Function

Function Txt(node as Object, fieldName as String) as String
    If node = Invalid Or Not node.HasField(fieldName) Then Return ""
    value = node[fieldName]
    If value = Invalid Then Return ""
    If Type(value) = "roString" Or Type(value) = "String" Then Return value
    Return ""
End Function

Sub SetText(node as Object, fieldName as String, value as String)
    If Not node.HasField(fieldName) Then node.AddField(fieldName, "string", false)
    node[fieldName] = value
End Sub

Function PriceText(amount as Float) as String
    cents = Int(amount * 100 + 0.5)
    dollars = Int(cents / 100)
    rest = cents - dollars * 100
    If rest = 0 Then Return Str(dollars).Trim()
    restStr = Str(rest).Trim()
    If rest < 10 Then restStr = "0" + restStr
    Return Str(dollars).Trim() + "." + restStr
End Function

' "Send to TV" asked for a particular episode (MainScene.OpenFilmFromPhone)
Sub OnPlayEpisodeRequested()
    i = m.top.playEpisodeIndex
    If i >= 0 Then PlayEpisode(i)
End Sub
