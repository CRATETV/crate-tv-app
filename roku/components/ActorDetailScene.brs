' ##############################################################################
' CRATE TV - Actor page logic (layout and history are in ActorDetailScene.xml)
' ##############################################################################
'
' KEYS: Left/Right move along the films (the RowList handles it), OK opens
' the film page, Back returns to Search.
' ##############################################################################

Sub Init()
    m.contentGroup = m.top.FindNode("contentGroup")
    m.actorPhoto   = m.top.FindNode("actorPhoto")
    m.actorName    = m.top.FindNode("actorName")
    m.actorBio     = m.top.FindNode("actorBio")
    m.filmsRow     = m.top.FindNode("filmsRow")
    m.noFilmsLabel = m.top.FindNode("noFilmsLabel")
    m.statusLabel  = m.top.FindNode("statusLabel")
    m.task = Invalid

    m.filmsRow.itemComponentName = "MoviePosterItem"
    m.filmsRow.ObserveField("rowItemSelected", "OnFilmSelected")
    ' Coming back from a film page: put focus back on the films
    m.top.ObserveField("focusedChild", "OnFocusChange")
End Sub

' Download the profile in the background (never on the drawing thread).
Sub OnActorSlugSet()
    slug = m.top.actorSlug
    If slug = Invalid Or slug = "" Then Return
    m.statusLabel.text = "Loading..."
    m.statusLabel.visible = true
    m.contentGroup.visible = false

    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "fetchActorProfile"
    task.searchQuery = slug
    task.ObserveField("taskStatus", "OnProfileLoaded")
    task.control = "run"
    m.task = task
End Sub

Sub OnProfileLoaded()
    task = m.task
    If task = Invalid Or (task.taskStatus <> "success" And task.taskStatus <> "error") Then Return
    m.task = Invalid

    data = Invalid
    If task.taskStatus = "success" Then data = ParseJson(task.actorResults)
    If data = Invalid Or data.profile = Invalid
        m.statusLabel.text = "This profile couldn't load. Press Back to return to Search."
        Return
    End If

    profile = data.profile
    m.actorName.text = TextOf(profile.name)
    bio = TextOf(profile.bio)
    If bio = "" Then bio = "No biography yet."
    m.actorBio.text = bio

    photo = TextOf(profile.highResPhoto)
    If photo = "" Then photo = TextOf(profile.photo)
    ' S3 photos go through the site's image proxy (same as Search)
    If photo <> "" And (Instr(1, photo, ".s3.") > 0 Or Instr(1, photo, ".amazonaws.com") > 0)
        photo = "https://cratetv.net/api/proxy-image?url=" + photo
    End If
    m.actorPhoto.uri = photo

    ' Their films, taken from the catalogue so price/unlock info is right
    row = CreateObject("roSGNode", "ContentNode")
    row.title = "Films on Crate TV"
    films = data.films
    If films <> Invalid
        For Each f in films
            key = TextOf(f.key)
            node = FindInFeed(key)
            If node <> Invalid
                copy = node.Clone(false)
                If copy.HasField("rankNumber") Then copy.rankNumber = 0
                row.AppendChild(copy)
            End If
        End For
    End If

    m.statusLabel.visible = false
    m.contentGroup.visible = true
    If row.GetChildCount() > 0
        content = CreateObject("roSGNode", "ContentNode")
        content.AppendChild(row)
        m.filmsRow.content = content
        m.filmsRow.visible = true
        m.noFilmsLabel.visible = false
        m.filmsRow.SetFocus(true)
    Else
        m.filmsRow.visible = false
        m.noFilmsLabel.visible = true
    End If
End Sub

Function FindInFeed(key as String) as Object
    feed = m.top.feedData
    If feed = Invalid Or key = "" Then Return Invalid
    For i = 0 To feed.GetChildCount() - 1
        r = feed.GetChild(i)
        For j = 0 To r.GetChildCount() - 1
            item = r.GetChild(j)
            If item <> Invalid
                If item.HasField("movieKey") And item.movieKey = key Then Return item
                If item.id = key Then Return item
            End If
        End For
    End For
    Return Invalid
End Function

Function TextOf(value as Dynamic) as String
    If value = Invalid Then Return ""
    If Type(value) = "roString" Or Type(value) = "String" Then Return value
    Return ""
End Function

Sub OnFilmSelected()
    sel = m.filmsRow.rowItemSelected
    content = m.filmsRow.content
    If sel = Invalid Or content = Invalid Then Return
    film = content.GetChild(sel[0]).GetChild(sel[1])
    If film <> Invalid Then m.top.playContent = film     ' MainScene opens the film page
End Sub

Sub OnFocusChange()
    If m.top.IsInFocusChain() And m.filmsRow.visible And m.contentGroup.visible And Not m.filmsRow.HasFocus()
        m.filmsRow.SetFocus(true)
    End If
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    If key = "back"
        m.top.exitToSearch = true
        Return true
    End If
    Return false
End Function
