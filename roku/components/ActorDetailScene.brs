' ##############################################################################
' CRATE TV - Actor Detail Scene
' Displays actor photo, bio, and filmography
' ##############################################################################

Sub Init()
    Print "CrateTV [ActorDetail]: Initializing..."
    
    m.header = m.top.FindNode("header")
    m.loadingSpinner = m.top.FindNode("loadingSpinner")
    m.contentGroup = m.top.FindNode("contentGroup")
    m.actorPhoto = m.top.FindNode("actorPhoto")
    m.actorName = m.top.FindNode("actorName")
    m.actorBio = m.top.FindNode("actorBio")
    m.filmographyLabel = m.top.FindNode("filmographyLabel")
    m.moviesGrid = m.top.FindNode("moviesGrid")
    m.errorLabel = m.top.FindNode("errorLabel")
    
    m.actorData = Invalid
    m.movies = []
    
    ' Observe field to trigger loading
    m.top.ObserveField("actorSlug", "OnActorSlugSet")
    
    ' Grid selection
    m.moviesGrid.ObserveField("itemSelected", "OnMovieSelected")
    
    ' Set initial focus to grid when content loads
    m.moviesGrid.SetFocus(true)
End Sub

Sub OnActorSlugSet()
    slug = m.top.actorSlug
    If slug <> Invalid And slug <> ""
        Print "CrateTV [ActorDetail]: Loading actor slug = " + slug
        LoadActorData(slug)
    End If
End Sub

Sub LoadActorData(slug as String)
    ShowLoading(true)
    
    ' Call API endpoint
    url = "https://cratetv.net/api/actor-profile?slug=" + slug
    Print "CrateTV [ActorDetail]: GET " + url
    
    request = CreateObject("roUrlTransfer")
    request.SetUrl(url)
    request.SetCertificatesFile("common:/certs/ca-bundle.crt")
    request.InitClientCertificates()
    
    port = CreateObject("roMessagePort")
    request.SetPort(port)
    request.AsyncGetToString()
    
    While True
        msg = Wait(5000, port)
        If msg = Invalid
            Print "CrateTV [ActorDetail]: Request timeout"
            ShowError("Request timeout. Please try again.")
            ShowLoading(false)
            Exit While
        Else If Type(msg) = "roUrlEvent"
            code = msg.GetResponseCode()
            Print "CrateTV [ActorDetail]: HTTP " + Str(code)
            
            If code = 200
                responseStr = msg.GetString()
                json = ParseJson(responseStr)
                
                If json <> Invalid And json.profile <> Invalid
                    m.actorData = json.profile
                    m.movies = json.films
                    DisplayActorInfo()
                Else
                    ShowError("Invalid response format")
                End If
            Else
                ShowError("Failed to load actor data (HTTP " + Str(code) + ")")
            End If
            
            ShowLoading(false)
            Exit While
        End If
    End While
End Sub

Sub DisplayActorInfo()
    If m.actorData = Invalid Then Return
    
    ' Set actor name
    m.actorName.text = m.actorData.name
    
    ' Set actor photo (prefer high res)
    photoUrl = ""
    If m.actorData.highResPhoto <> Invalid And m.actorData.highResPhoto <> ""
        photoUrl = m.actorData.highResPhoto
    Else If m.actorData.photo <> Invalid And m.actorData.photo <> ""
        photoUrl = m.actorData.photo
    End If
    
    If photoUrl <> ""
        m.actorPhoto.uri = photoUrl
    End If
    
    ' Set bio
    bio = ""
    If m.actorData.bio <> Invalid
        bio = m.actorData.bio
    End If
    m.actorBio.text = bio
    
    ' Build filmography grid
    BuildFilmographyGrid()
    
    ' Show content
    m.contentGroup.visible = true
    m.moviesGrid.SetFocus(true)
End Sub

Sub BuildFilmographyGrid()
    content = CreateObject("roSGNode", "ContentNode")
    
    If m.movies <> Invalid
        For i = 0 To m.movies.Count() - 1
            movie = m.movies[i]
            child = CreateObject("roSGNode", "ContentNode")
            
            If movie.title <> Invalid
                child.title = movie.title
            Else
                child.title = "Untitled"
            End If
            
            ' Get poster URL
            posterUrl = ""
            If movie.poster <> Invalid And movie.poster <> ""
                posterUrl = movie.poster
            Else If movie.hdPosterUrl <> Invalid And movie.hdPosterUrl <> ""
                posterUrl = movie.hdPosterUrl
            End If
            
            child.HDPosterUrl = posterUrl
            child.SDPosterUrl = posterUrl
            
            content.AppendChild(child)
        End For
    End If
    
    m.moviesGrid.content = content
    
    If m.movies.Count() = 0
        m.filmographyLabel.text = "No films available"
    Else
        m.filmographyLabel.text = "Filmography (" + Str(m.movies.Count()).Trim() + " films)"
    End If
End Sub

Sub OnMovieSelected()
    index = m.moviesGrid.itemSelected
    If index >= 0 And index < m.movies.Count()
        movie = m.movies[index]
        Print "CrateTV [ActorDetail]: Selected movie - " + movie.title
        
        ' Create video content node - match your Movie schema
        videoContent = CreateObject("roSGNode", "ContentNode")
        
        ' Title
        If movie.title <> Invalid
            videoContent.title = movie.title
        Else
            videoContent.title = "Untitled"
        End If
        
        ' Description
        If movie.description <> Invalid
            videoContent.description = movie.description
        End If
        
        ' Stream URL - try multiple field names
        streamUrl = ""
        If movie.streamUrl <> Invalid And movie.streamUrl <> ""
            streamUrl = movie.streamUrl
        Else If movie.fullMovie <> Invalid And movie.fullMovie <> ""
            streamUrl = movie.fullMovie
        Else If movie.url <> Invalid And movie.url <> ""
            streamUrl = movie.url
        End If
        
        If streamUrl <> ""
            videoContent.url = streamUrl
            videoContent.streamUrl = streamUrl
        End If
        
        ' Poster - try multiple field names
        posterUrl = ""
        If movie.poster <> Invalid And movie.poster <> ""
            posterUrl = movie.poster
        Else If movie.hdPosterUrl <> Invalid And movie.hdPosterUrl <> ""
            posterUrl = movie.hdPosterUrl
        End If
        
        If posterUrl <> ""
            videoContent.HDPosterUrl = posterUrl
            videoContent.SDPosterUrl = posterUrl
        End If
        
        Print "CrateTV [ActorDetail]: Playing - url=" + streamUrl
        
        ' Signal to MainScene to play video
        m.top.videoContent = videoContent
    End If
End Sub

Sub ShowLoading(visible as Boolean)
    m.loadingSpinner.visible = visible
    m.contentGroup.visible = Not visible
    m.errorLabel.visible = false
End Sub

Sub ShowError(message as String)
    m.errorLabel.text = message
    m.errorLabel.visible = true
    m.contentGroup.visible = false
End Sub

Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    
    If key = "back"
        Print "CrateTV [ActorDetail]: Back pressed - returning to search"
        m.top.exitToSearch = true
        Return true
    End If
    
    Return false
End Function
