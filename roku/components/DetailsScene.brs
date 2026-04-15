' ##############################################################################
' CRATE TV - Details Scene Controller (V4 Studio)
'
' Displays movie details with:
' - Full metadata (cast, director, genres)
' - Play/Resume buttons for unlocked content
' - QR code paywall for locked content
' - Watch Party indicator
' ##############################################################################

Sub Init()
    Print "CrateTV [Details]: Initializing..."
    
    ' Cache UI references
    m.backdrop = m.top.FindNode("backdrop")
    m.titleLabel = m.top.FindNode("titleLabel")
    m.yearLabel = m.top.FindNode("yearLabel")
    m.ratingBadge = m.top.FindNode("ratingBadge")
    m.ratingLabel = m.top.FindNode("ratingLabel")
    m.durationLabel = m.top.FindNode("durationLabel")
    m.genresLabel = m.top.FindNode("genresLabel")
    m.descLabel = m.top.FindNode("descLabel")
    m.castLabel = m.top.FindNode("castLabel")
    m.castSection = m.top.FindNode("castSection")
    m.directorLabel = m.top.FindNode("directorLabel")
    m.directorSection = m.top.FindNode("directorSection")
    
    m.buttonGroup = m.top.FindNode("buttonGroup")
    m.playBtnBg = m.top.FindNode("playBtnBg")
    m.playBtnLabel = m.top.FindNode("playBtnLabel")
    m.resumeBtnBg = m.top.FindNode("resumeBtnBg")
    
    m.paywallGroup = m.top.FindNode("paywallGroup")
    m.qrCode = m.top.FindNode("qrCode")
    m.priceLabel = m.top.FindNode("priceLabel")
    m.urlLabel = m.top.FindNode("urlLabel")
    
    m.watchPartyBanner = m.top.FindNode("watchPartyBanner")
    
    ' State
    m.isUnlocked = true
    m.hasResume = false
    m.focusedBtn = 0
    m.movie = Invalid
End Sub

' =============================================================================
' CONTENT BINDING
' =============================================================================
Sub OnContentSet()
    movie = m.top.content
    If movie = Invalid
        Print "CrateTV [Details]: ERROR - No content provided"
        Return
    End If
    
    m.movie = movie
    
    title = ""
    If movie.title <> Invalid Then title = movie.title
    Print "CrateTV [Details]: Displaying - " + title
    
    ' ----- BACKDROP -----
    backdropUrl = ""
    If movie.HasField("backdropUrl") And movie.backdropUrl <> Invalid
        backdropUrl = movie.backdropUrl
    Else If movie.HasField("heroImageUrl") And movie.heroImageUrl <> Invalid
        backdropUrl = movie.heroImageUrl
    Else If movie.HasField("posterUrl") And movie.posterUrl <> Invalid
        backdropUrl = movie.posterUrl
    Else If movie.HDPosterUrl <> Invalid
        backdropUrl = movie.HDPosterUrl
    End If
    
    If backdropUrl <> "" And m.backdrop <> Invalid
        m.backdrop.uri = backdropUrl
    End If
    
    ' ----- TITLE -----
    If m.titleLabel <> Invalid
        m.titleLabel.text = title
    End If
    
    ' ----- YEAR -----
    If m.yearLabel <> Invalid
        ' Year hidden -- publishedAt dates are upload dates, not release years
        m.yearLabel.text = ""
    End If
    
    ' ----- RATING -----
    If m.ratingBadge <> Invalid And m.ratingLabel <> Invalid
        rating = ""
        If movie.HasField("rating") And movie.rating <> Invalid
            rating = movie.rating
        End If
        If rating <> ""
            m.ratingLabel.text = rating
            m.ratingBadge.width = Len(rating) * 10 + 16
            m.ratingBadge.visible = true
        Else
            m.ratingBadge.visible = false
        End If
    End If
    
    ' ----- DURATION -----
    If m.durationLabel <> Invalid
        duration = ""
        If movie.HasField("runtime") And movie.runtime <> Invalid
            duration = movie.runtime
        Else If movie.HasField("durationFormatted") And movie.durationFormatted <> Invalid
            duration = movie.durationFormatted
        End If
        m.durationLabel.text = duration
    End If
    
    ' ----- GENRES -----
    If m.genresLabel <> Invalid
        genres = ""
        If movie.HasField("genres") And movie.genres <> Invalid
            genres = movie.genres
        End If
        m.genresLabel.text = genres
    End If
    
    ' ----- DESCRIPTION -----
    If m.descLabel <> Invalid
        desc = ""
        If movie.description <> Invalid
            desc = movie.description
        End If
        m.descLabel.text = desc
    End If
    
    ' ----- CAST -----
    If m.castLabel <> Invalid And m.castSection <> Invalid
        cast = ""
        If movie.HasField("cast") And movie.cast <> Invalid
            cast = movie.cast
        End If
        If cast <> ""
            m.castLabel.text = cast
            m.castSection.visible = true
        Else
            m.castSection.visible = false
        End If
    End If
    
    ' ----- DIRECTOR -----
    If m.directorLabel <> Invalid And m.directorSection <> Invalid
        director = ""
        If movie.HasField("director") And movie.director <> Invalid
            director = movie.director
        End If
        If director <> ""
            m.directorLabel.text = director
            m.directorSection.visible = true
        Else
            m.directorSection.visible = false
        End If
    End If
    
    ' ----- WATCH PARTY -----
    If m.watchPartyBanner <> Invalid
        isWatchParty = false
        If movie.HasField("isWatchPartyEnabled") And movie.isWatchPartyEnabled = true
            isWatchParty = true
        Else If movie.HasField("watchPartyStartTime") And movie.watchPartyStartTime <> Invalid And movie.watchPartyStartTime <> ""
            isWatchParty = true
        End If
        m.watchPartyBanner.visible = isWatchParty
    End If
    
    ' ----- UNLOCK STATUS -----
    m.isUnlocked = true
    If movie.HasField("isUnlocked")
        m.isUnlocked = movie.isUnlocked
    Else If movie.HasField("isFree")
        m.isUnlocked = movie.isFree
    End If
    
    If m.isUnlocked
        ShowPlayButtons()
    Else
        ShowPaywall()
    End If
End Sub

' =============================================================================
' PLAY BUTTONS (Unlocked Content)
' =============================================================================
Sub ShowPlayButtons()
    If m.buttonGroup <> Invalid Then m.buttonGroup.visible = true
    If m.paywallGroup <> Invalid Then m.paywallGroup.visible = false
    
    ' Check for resume capability
    m.hasResume = false
    If m.movie <> Invalid And m.movie.HasField("watchProgress")
        If m.movie.watchProgress <> Invalid And m.movie.watchProgress > 0
            m.hasResume = true
        End If
    End If
    
    If m.resumeBtnBg <> Invalid
        m.resumeBtnBg.visible = m.hasResume
    End If
    
    m.focusedBtn = 0
    UpdateButtonFocus()
End Sub

' =============================================================================
' PAYWALL (Locked Content)
' =============================================================================
Sub ShowPaywall()
    If m.buttonGroup <> Invalid Then m.buttonGroup.visible = false
    If m.paywallGroup <> Invalid Then m.paywallGroup.visible = true
    
    ' Generate QR code URL
    purchaseUrl = ""
    If m.movie <> Invalid And m.movie.HasField("purchaseUrl")
        purchaseUrl = m.movie.purchaseUrl
    End If
    
    If purchaseUrl <> "" And m.qrCode <> Invalid
        ' Use QR code API
        qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=" + purchaseUrl
        m.qrCode.uri = qrUrl
    End If
    
    If m.urlLabel <> Invalid
        m.urlLabel.text = purchaseUrl
    End If
    
    ' Price
    If m.priceLabel <> Invalid
        price = ""
        If m.movie <> Invalid And m.movie.HasField("price")
            price = m.movie.price
        End If
        If price <> ""
            m.priceLabel.text = "$" + price
        Else
            m.priceLabel.text = "Premium Content"
        End If
    End If
End Sub

' =============================================================================
' BUTTON FOCUS
' =============================================================================
Sub UpdateButtonFocus()
    If m.playBtnBg = Invalid Then Return
    
    If m.focusedBtn = 0
        m.playBtnBg.color = "#EF4444"
        If m.resumeBtnBg <> Invalid Then m.resumeBtnBg.color = "#333333"
    Else
        m.playBtnBg.color = "#555555"
        If m.resumeBtnBg <> Invalid Then m.resumeBtnBg.color = "#EF4444"
    End If
End Sub

' =============================================================================
' KEY HANDLER
' =============================================================================
Function OnKeyEvent(key as String, press as Boolean) as Boolean
    If Not press Then Return false
    
    Print "CrateTV [Details]: Key = " + key
    
    If key = "back"
        m.top.closeRequested = true
        Return true
    End If
    
    ' Only handle other keys if unlocked
    If Not m.isUnlocked
        Return true
    End If
    
    If key = "left"
        If m.focusedBtn > 0
            m.focusedBtn = 0
            UpdateButtonFocus()
        End If
        Return true
    End If
    
    If key = "right"
        If m.hasResume And m.focusedBtn < 1
            m.focusedBtn = 1
            UpdateButtonFocus()
        End If
        Return true
    End If
    
    If key = "OK"
        m.top.playRequested = true
        Return true
    End If
    
    If key = "play"
        m.top.playRequested = true
        Return true
    End If
    
    Return false
End Function
