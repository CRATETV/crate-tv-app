' ##############################################################################
' CRATE TV - Poster tile logic (see MoviePosterItem.xml for what it looks like)
' ##############################################################################
'
' HOW A ROWLIST TILE WORKS (short version)
'   Roku re-uses a handful of tiles while the viewer scrolls. Each time a tile
'   is given a different film, `itemContent` changes and OnContentChange()
'   redraws it. `focusPercent` goes from 0 to 1 as focus arrives on the tile,
'   which drives the zoom + focus ring in OnFocusChange().
'
' FIELDS READ FROM THE FILM (set in ContentTask.brs -> CreateMovieNode)
'   posterUrl       poster image
'   title           shown as a fallback if the poster can't load
'   isUnlocked      false = show the lock pill
'   salePrice       price shown in the lock pill (e.g. 4.99)
'   watchProgress / duration   seconds watched / total, for the progress bar
'   rankNumber      1-10 on the Top 10 row (set by HomeScene.brs), else 0
' ##############################################################################

Sub Init()
    m.FOCUS_SCALE = 1.06        ' how much a focused poster grows (1.0 = no zoom)
    m.POSTER_W = 214            ' poster size inside the tile (Theme.brs tileWidth/tileHeight)
    m.POSTER_H = 321

    m.rankLabel     = m.top.FindNode("rankLabel")
    ' Two sizes for the Top 10 number: "10" is two digits, so it's drawn a bit
    ' smaller and tucked further behind the poster to fit (it used to be cut off).
    m.rankFontOneDigit = CreateObject("roSGNode", "Font")
    m.rankFontOneDigit.uri = "pkg:/fonts/InterDisplay-Black.ttf"
    m.rankFontOneDigit.size = 250
    m.rankFontTwoDigits = CreateObject("roSGNode", "Font")
    m.rankFontTwoDigits.uri = "pkg:/fonts/InterDisplay-Black.ttf"
    m.rankFontTwoDigits.size = 215
    m.posterGroup   = m.top.FindNode("posterGroup")
    m.posterBg      = m.top.FindNode("posterBg")
    m.fallbackTitle = m.top.FindNode("fallbackTitle")
    m.posterImage   = m.top.FindNode("posterImage")
    m.lockPill      = m.top.FindNode("lockPill")
    m.lockPillBg    = m.top.FindNode("lockPillBg")
    m.lockPrice     = m.top.FindNode("lockPrice")
    m.progressGroup = m.top.FindNode("progressGroup")
    m.progressFill  = m.top.FindNode("progressFill")
    m.focusRing     = m.top.FindNode("focusRing")

    ' Fade the poster in once it has downloaded, so tiles never "pop".
    m.posterImage.ObserveField("loadStatus", "OnPosterLoadStatus")
    m.fadeAnim = m.top.CreateChild("Animation")
    m.fadeAnim.duration = 0.2
    m.fadeAnim.easeFunction = "outQuad"
    fade = m.fadeAnim.CreateChild("FloatFieldInterpolator")
    fade.fieldToInterp = "posterImage.opacity"
    fade.key = [0.0, 1.0]
    fade.keyValue = [0.0, 1.0]

    ' Focus zoom
    m.zoomAnim = m.top.CreateChild("Animation")
    m.zoomAnim.duration = 0.14
    m.zoomAnim.easeFunction = "outQuad"
    m.zoomInterp = m.zoomAnim.CreateChild("Vector2DFieldInterpolator")
    m.zoomInterp.fieldToInterp = "posterGroup.scale"
    m.zoomInterp.key = [0.0, 1.0]

    m.rankNumber = 0
    Layout()
End Sub

' Positions the poster inside the tile. Normal rows: the tile IS the poster.
' Top 10 row: the tile is wider; the poster sits on the right and the big
' rank number fills the space on the left.
Sub Layout()
    w = m.top.width
    h = m.top.height
    posterX = 0
    If m.rankNumber > 0 Then posterX = w - m.POSTER_W
    If posterX < 0 Then posterX = 0

    m.posterGroup.translation = [posterX, 0]
    ' Zoom from the middle of the poster, not its top-left corner.
    m.posterGroup.scaleRotateCenter = [m.POSTER_W / 2, m.POSTER_H / 2]

    m.progressGroup.translation = [0, m.POSTER_H - 5]

    ' Rank number: right-aligned so it tucks in just behind the poster's left edge.
    ' "10" tucks in further (60 px) so both digits fit in the space.
    tuck = 30
    If m.rankNumber >= 10 Then tuck = 60
    m.rankLabel.width = posterX + tuck
    m.rankLabel.height = h + 40
    m.rankLabel.translation = [0, -40]
End Sub

Sub OnContentChange()
    film = m.top.itemContent
    If film = Invalid Then Return

    ' --- Poster ---
    url = Field(film, "posterUrl")
    If url = "" Then url = Field(film, "HDPosterUrl")
    m.fallbackTitle.text = Field(film, "title")
    m.fallbackTitle.visible = true
    m.posterImage.opacity = 0.0
    m.fadeAnim.control = "stop"
    m.posterImage.uri = url        ' "" = keep the title fallback visible

    ' --- Lock pill (locked films only) ---
    unlocked = true
    If film.HasField("isUnlocked") Then unlocked = film.isUnlocked
    If unlocked
        m.lockPill.visible = false
    Else
        price = ""
        If film.HasField("salePrice") And film.salePrice > 0
            price = "$" + FormatPrice(film.salePrice)
        End If
        m.lockPrice.text = price
        pillW = 44                                  ' lock icon only
        If price <> "" Then pillW = 38 + (Len(price) * 12) + 14
        m.lockPillBg.width = pillW
        m.lockPill.translation = [m.POSTER_W - pillW - 10, 10]
        m.lockPill.visible = true
    End If

    ' --- Progress bar ---
    watched = 0 : total = 0
    If film.HasField("watchProgress") Then watched = film.watchProgress
    If film.HasField("duration") Then total = film.duration
    If watched > 0 And total > 0
        m.progressFill.width = Int(m.POSTER_W * (watched / total))
        m.progressGroup.visible = true
    Else
        m.progressGroup.visible = false
    End If

    ' --- Top 10 number ---
    m.rankNumber = 0
    If film.HasField("rankNumber") Then m.rankNumber = film.rankNumber
    If m.rankNumber > 0
        m.rankLabel.text = Str(m.rankNumber).Trim()
        If m.rankNumber >= 10
            m.rankLabel.font = m.rankFontTwoDigits
        Else
            m.rankLabel.font = m.rankFontOneDigit
        End If
        m.rankLabel.visible = true
    Else
        m.rankLabel.visible = false
    End If
    Layout()
End Sub

Sub OnPosterLoadStatus()
    status = m.posterImage.loadStatus
    If status = "ready"
        m.fallbackTitle.visible = false
        m.fadeAnim.control = "start"
    Else If status = "failed"
        ' Leave the dark tile + film title showing; nothing else to do.
        m.posterImage.opacity = 0.0
        m.fallbackTitle.visible = true
    End If
End Sub

Sub OnFocusChange()
    focused = (m.top.focusPercent > 0.5)
    m.focusRing.visible = focused
    target = [1.0, 1.0]
    If focused Then target = [m.FOCUS_SCALE, m.FOCUS_SCALE]
    m.zoomInterp.keyValue = [m.posterGroup.scale, target]
    m.zoomAnim.control = "start"
End Sub

' ---- small helpers -----------------------------------------------------------

' Reads a text field from a film safely ("" if it's missing).
Function Field(node as Object, name as String) as String
    If node = Invalid Or Not node.HasField(name) Then Return ""
    value = node[name]
    If value = Invalid Then Return ""
    If Type(value) = "roString" Or Type(value) = "String" Then Return value
    Return ""
End Function

' 4.5 -> "4.50", 5 -> "5", 4.99 -> "4.99"
Function FormatPrice(amount as Float) as String
    cents = Int(amount * 100 + 0.5)
    dollars = Int(cents / 100)
    rest = cents - dollars * 100
    If rest = 0 Then Return Str(dollars).Trim()
    restStr = Str(rest).Trim()
    If rest < 10 Then restStr = "0" + restStr
    Return Str(dollars).Trim() + "." + restStr
End Function
