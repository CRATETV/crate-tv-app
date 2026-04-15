' ##############################################################################
' CRATE TV - Actor Search Task
'
' Runs on the Task thread. Calls GET /api/search-actors?q=<query>
' Returns the first actor's name, photo URL, bio, and slug.
' SearchScene observes taskStatus to know when results are ready.
' ##############################################################################

Sub Init()
    m.top.functionName = "ExecuteTask"
End Sub

Sub ExecuteTask()
    m.top.taskStatus = "running"

    query = m.top.actorQuery
    If query = Invalid Or query = ""
        m.top.taskStatus = "error"
        Return
    End If

    url = "https://cratetv.net/api/search-actors?q=" + query
    Print "CrateTV [ActorSearchTask]: GET " + url

    request = CreateObject("roUrlTransfer")
    request.SetUrl(url)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.InitClientCertificates()
    request.AddHeader("Accept", "application/json")

    port = CreateObject("roMessagePort")
    request.SetMessagePort(port)

    If Not request.AsyncGetToString()
        Print "CrateTV [ActorSearchTask]: Failed to start request"
        m.top.taskStatus = "error"
        Return
    End If

    event = Wait(8000, port)

    If event = Invalid
        request.AsyncCancel()
        Print "CrateTV [ActorSearchTask]: Timeout"
        m.top.taskStatus = "error"
        Return
    End If

    If Type(event) <> "roUrlEvent"
        Print "CrateTV [ActorSearchTask]: Unexpected event type"
        m.top.taskStatus = "error"
        Return
    End If

    code = event.GetResponseCode()
    Print "CrateTV [ActorSearchTask]: HTTP " + Str(code)

    If code < 200 Or code >= 300
        Print "CrateTV [ActorSearchTask]: HTTP error " + Str(code)
        m.top.taskStatus = "error"
        Return
    End If

    json = ParseJson(event.GetString())
    If json = Invalid
        Print "CrateTV [ActorSearchTask]: Invalid JSON"
        m.top.taskStatus = "error"
        Return
    End If

    ' API may return an array or { actors: [...] }
    actors = Invalid
    If Type(json) = "roArray"
        actors = json
    Else If json.DoesExist("actors") And json.actors <> Invalid
        actors = json.actors
    End If

    If actors = Invalid Or actors.Count() = 0
        Print "CrateTV [ActorSearchTask]: No actors found"
        m.top.taskStatus = "notfound"
        Return
    End If

    ' Use first result
    actor = actors[0]

    name = ""
    If actor.DoesExist("name") And actor.name <> Invalid Then name = actor.name
    m.top.actorName = name

    photo = ""
    If actor.DoesExist("highResPhoto") And actor.highResPhoto <> Invalid And actor.highResPhoto <> ""
        photo = actor.highResPhoto
    Else If actor.DoesExist("photo") And actor.photo <> Invalid And actor.photo <> ""
        photo = actor.photo
    End If
    m.top.actorPhoto = photo

    bio = ""
    If actor.DoesExist("bio") And actor.bio <> Invalid Then bio = actor.bio
    If bio = "" And actor.DoesExist("biography") And actor.biography <> Invalid Then bio = actor.biography
    m.top.actorBio = bio

    slug = ""
    If actor.DoesExist("slug") And actor.slug <> Invalid Then slug = actor.slug
    m.top.actorSlug = slug

    Print "CrateTV [ActorSearchTask]: Found actor: " + name
    m.top.taskStatus = "success"
End Sub
