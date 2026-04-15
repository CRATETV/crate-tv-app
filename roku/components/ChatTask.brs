' ##############################################################################
' CRATE TV - Chat Poll Task
'
' Polls GET https://cratetv.net/api/get-chat-messages?movieKey=...&limit=20
' Returns JSON array of recent chat messages:
' [{ "username": "jane", "message": "loving this film!", "timestamp": 1718924500 }]
'
' Messages are serialised as a JSON string on m.top.messages so the
' calling scene can ParseJson() them on the render thread.
' ##############################################################################

Sub Main()
    movieKey = m.top.movieKey
    If movieKey = Invalid Or movieKey = ""
        m.top.taskStatus = "error"
        Return
    End If

    ' Public endpoint -- no auth required
    url = "https://cratetv.net/api/get-chat-messages?movieKey=" + movieKey + "&limit=20"

    http = CreateObject("roUrlTransfer")
    http.SetUrl(url)
    http.SetConnectTimeout(10000)
    http.SetSendTimeout(10000)
    http.SetReceiveTimeout(10000)
    http.SetCertificatesFile("common:/certs/ca-bundle.crt")
    http.AddHeader("Content-Type", "application/json")

    response = http.GetToString()

    If response = Invalid Or response = ""
        m.top.taskStatus = "error"
        Return
    End If

    ' Validate it parses as JSON before passing back
    parsed = ParseJson(response)
    If parsed = Invalid
        m.top.taskStatus = "error"
        Return
    End If

    ' Pass raw JSON string back -- render thread will parse it
    m.top.messages   = response
    m.top.taskStatus = "success"
End Sub
