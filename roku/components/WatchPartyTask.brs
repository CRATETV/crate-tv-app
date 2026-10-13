' ##############################################################################
' CRATE TV - Watch Party Status Task
'
' Polls GET https://cratetv.net/api/get-watch-party-status?movieKey=...
' Returns status, isPlaying, actualStartTime (as Unix seconds), isQALive.
'
' Also calls /api/check-roku-link-status to verify if user has unlocked
' a paid watch party (checks unlockedWatchPartyKeys on their account).
'
' actualStartTime from Firestore comes as { _seconds: N, _nanoseconds: N }
' This task unpacks that and returns plain integer Unix seconds.
' ##############################################################################

Sub Main()
    movieKey = m.top.movieKey
    baseUrl  = "https://cratetv.net/api"

    ' -------------------------------------------------------------------------
    ' 1. Fetch watch party status
    ' If movieKey is empty, call without it -- returns any currently live party
    ' -------------------------------------------------------------------------
    statusUrl = baseUrl + "/get-watch-party-status"
    If movieKey <> Invalid And movieKey <> ""
        statusUrl = statusUrl + "?movieKey=" + movieKey
    End If
    Print "CrateTV [WatchParty]: Fetching status: " + statusUrl

    http = CreateObject("roUrlTransfer")
    http.SetUrl(statusUrl)
    http.SetConnectTimeout(10000)
    http.SetSendTimeout(10000)
    http.SetReceiveTimeout(10000)
    http.SetCertificatesFile("common:/certs/ca-bundle.crt")
    http.AddHeader("Content-Type", "application/json")

    authToken = m.top.authToken
    If authToken <> Invalid And authToken <> ""
        http.AddHeader("Authorization", "Bearer " + authToken)
    End If

    response = http.GetToString()

    If response = Invalid Or response = ""
        m.top.taskStatus   = "error"
        m.top.errorMessage = "Status request failed"
        Return
    End If

    json = ParseJson(response)
    If json = Invalid
        m.top.taskStatus   = "error"
        m.top.errorMessage = "Invalid JSON response"
        Return
    End If

    ' Parse status fields
    partyStatus = "waiting"
    If json.status <> Invalid And json.status <> "" Then partyStatus = json.status
    m.top.partyStatus = partyStatus

    isPlaying = false
    If json.isPlaying <> Invalid Then isPlaying = json.isPlaying
    m.top.isPlaying = isPlaying

    isQALive = false
    If json.isQALive <> Invalid Then isQALive = json.isQALive
    m.top.isQALive = isQALive

    ' Parse actualStartTime -- Firestore returns { _seconds: N, _nanoseconds: N }
    actualStartSecs = 0
    If json.actualStartTime <> Invalid
        ast = json.actualStartTime
        If Type(ast) = "roAssociativeArray"
            ' Firestore Timestamp object
            If ast._seconds <> Invalid
                actualStartSecs = ast._seconds
            Else If ast.seconds <> Invalid
                actualStartSecs = ast.seconds
            End If
        Else If Type(ast) = "roInteger" Or Type(ast) = "Integer" Or Type(ast) = "roFloat" Or Type(ast) = "Float"
            actualStartSecs = Int(ast)
        End If
    End If
    ' FIX (Oct 2026): the API sends actualStartTime as an ISO string, which
    ' none of the branches above handled -- so this was always 0 and the
    ' Roku never actually joined a live party. Prefer the whole-seconds
    ' fields the API now sends; fall back to parsing the ISO string.
    If json.filmStartTimeSeconds <> Invalid And json.filmStartTimeSeconds > 0
        actualStartSecs = Int(json.filmStartTimeSeconds)
    Else If json.actualStartTimeSeconds <> Invalid And json.actualStartTimeSeconds > 0
        actualStartSecs = Int(json.actualStartTimeSeconds)
    Else If actualStartSecs = 0 And (Type(json.actualStartTime) = "roString" Or Type(json.actualStartTime) = "String")
        dt = CreateObject("roDateTime")
        dt.FromISO8601String(json.actualStartTime)
        actualStartSecs = dt.AsSeconds()
    End If
    m.top.actualStartTime = actualStartSecs

    partyType = "movie"
    If json.type <> Invalid And json.type <> "" Then partyType = json.type
    m.top.partyType = partyType

    ' isPaid comes from the movie manifest field, passed in by the scene.
    ' FIX (Oct 2026): this used to be overwritten with json.isPaid, which the
    ' API never sends -- so paid parties never checked the user's unlock and
    ' ticket holders always saw the paywall QR.
    isPaid = m.top.isPaid
    If json.isPaid <> Invalid And json.isPaid = true Then isPaid = true
    m.top.isPaid = isPaid

    ' -------------------------------------------------------------------------
    ' 2. If paid party, check if this user has it unlocked
    ' -------------------------------------------------------------------------
    isUnlocked = false
    If isPaid And authToken <> Invalid And authToken <> ""
        checkUrl = baseUrl + "/check-roku-link-status?movieKey=" + movieKey
        http2 = CreateObject("roUrlTransfer")
        http2.SetUrl(checkUrl)
    http2.SetConnectTimeout(10000)
    http2.SetSendTimeout(10000)
    http2.SetReceiveTimeout(10000)
        http2.SetCertificatesFile("common:/certs/ca-bundle.crt")
        http2.AddHeader("Content-Type", "application/json")
        http2.AddHeader("Authorization", "Bearer " + authToken)

        checkResponse = http2.GetToString()
        If checkResponse <> Invalid And checkResponse <> ""
            checkJson = ParseJson(checkResponse)
            If checkJson <> Invalid
                If checkJson.unlockedWatchParty <> Invalid Then isUnlocked = checkJson.unlockedWatchParty
                If checkJson.hasAccess <> Invalid Then isUnlocked = checkJson.hasAccess
            End If
        End If
    End If
    m.top.isUnlocked = isUnlocked

    m.top.taskStatus = "success"
    Print "CrateTV [WatchParty]: status=" + partyStatus + " isPlaying=" + Box(isPlaying).ToStr() + " startTime=" + Str(actualStartSecs).Trim()
End Sub
