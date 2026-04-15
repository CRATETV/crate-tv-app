' ##############################################################################
' CRATE TV - Movie Poster Item (V4 Studio)
'
' CRATE STANDARD: Poster [240, 360] / Focus Ring [248, 368] @ [-4, -4]
' CLEAN UI: Zero text overlays. No "Press OK" labels. Just the poster art.
' FOCUS: 10px Crate Red border with 4px offset + 1.1x scale transformation.
' SMART SIZING: Dynamically adjusts all elements based on width/height fields.
' Used as RowList itemComponentName for all rows.
' ##############################################################################

Sub Init()
    m.posterImage = m.top.FindNode("posterImage")
    m.lockOverlay = m.top.FindNode("lockOverlay")
    m.progressGroup = m.top.FindNode("progressGroup")
    m.progressFill = m.top.FindNode("progressFill")
    m.focusBorder = m.top.FindNode("focusBorder")
    m.posterContainer = m.top.FindNode("posterContainer")
    m.shadow = m.top.FindNode("shadow")
    m.posterBg = m.top.FindNode("posterBg")
    m.shimmerBase = m.top.FindNode("shimmerBase")
    m.shimmerBar  = m.top.FindNode("shimmerBar")
    m.cornerMask = m.top.FindNode("cornerMask")
    m.rankBadge = m.top.FindNode("rankBadge")
    m.rankBadgeBg = m.top.FindNode("rankBadgeBg")
    m.rankBadgeLabel = m.top.FindNode("rankBadgeLabel")
    
    ' focusBorder is now a Poster PNG -- no child rectangles needed
    m.focusBorderTop    = Invalid
    m.focusBorderBottom = Invalid
    m.focusBorderLeft   = Invalid
    m.focusBorderRight  = Invalid
    
    ' Observe width/height changes to update sizes
    m.top.ObserveField("width", "UpdateSizes")
    m.top.ObserveField("height", "UpdateSizes")
    
    ' Initialize sizes
    UpdateSizes()
    
    ' Start poster invisible — shimmer shows while loading
    m.posterImage.opacity = 0.0

    ' Shimmer pulse animation
    m.shimmerAnim = m.top.CreateChild("Animation")
    m.shimmerAnim.duration = 1.6
    m.shimmerAnim.repeat = true
    m.shimmerAnim.easeFunction = "inOutSine"
    shimInterp = m.shimmerAnim.CreateChild("FloatFieldInterpolator")
    shimInterp.fieldToInterp = "shimmerBar.opacity"
    shimInterp.key = [0.0, 0.5, 1.0]
    shimInterp.keyValue = [0.0, 1.0, 0.0]
    m.shimmerAnim.control = "start"

    ' Observe poster load status for fade-in
    m.posterImage.ObserveField("loadStatus", "OnPosterLoadStatus")
    
    ' Fade-in animation
    m.fadeAnim = m.top.CreateChild("Animation")
    m.fadeAnim.duration = 0.15
    m.fadeAnim.easeFunction = "outCubic"
    m.fadeInterp = m.fadeAnim.CreateChild("FloatFieldInterpolator")
    m.fadeInterp.fieldToInterp = "posterImage.opacity"
    m.fadeInterp.key = [0.0, 1.0]
    m.fadeInterp.keyValue = [0.0, 1.0]
    
    ' Focus scale animation
    m.scaleAnim = m.top.CreateChild("Animation")
    m.scaleAnim.duration = 0.1
    m.scaleAnim.easeFunction = "outCubic"
    m.scaleInterp = m.scaleAnim.CreateChild("Vector2DFieldInterpolator")
    m.scaleInterp.fieldToInterp = "posterContainer.scale"
    m.scaleInterp.key = [0.0, 1.0]
End Sub

' =============================================================================
' DYNAMIC SIZING -- Update all elements based on width/height
' =============================================================================
Sub UpdateSizes()
    w = m.top.width
    h = m.top.height
    borderThickness = 10  ' Focus border thickness
    borderOffset = 4      ' 4px offset for perfect fit (240+8=248, 360+8=368)
    
    ' Update poster and background
    If m.posterImage <> Invalid
        m.posterImage.width = w
        m.posterImage.height = h
        m.posterImage.loadWidth = w
        m.posterImage.loadHeight = h
        m.posterImage.loadDisplayMode = "limitSize"
    End If
    
    If m.posterBg <> Invalid
        m.posterBg.width = w
        m.posterBg.height = h
    End If
    
    ' Update shadow (slightly bigger)
    If m.shadow <> Invalid
        m.shadow.width = w + 4
        m.shadow.height = h + 4
    End If
    
    ' Update lock overlay
    lockOverlayRect = m.top.FindNode("lockOverlayRect")
    If lockOverlayRect <> Invalid
        lockOverlayRect.width = w
        lockOverlayRect.height = h
    End If
    
    lockOverlayLabel = m.top.FindNode("lockOverlayLabel")
    If lockOverlayLabel <> Invalid
        lockOverlayLabel.width = w
        lockOverlayLabel.height = h
    End If
    
    ' Update progress bar
    If m.progressGroup <> Invalid
        m.progressGroup.translation = [0, h - 8]
    End If
    
    progressBg = m.top.FindNode("progressBg")
    If progressBg <> Invalid
        progressBg.width = w
    End If
    
    ' Update focus border (Poster PNG) -- scale proportionally
    borderWidth = w + (borderOffset * 2)
    borderHeight = h + (borderOffset * 2)
    
    If m.focusBorder <> Invalid
        m.focusBorder.width = borderWidth
        m.focusBorder.height = borderHeight
        m.focusBorder.translation = [-borderOffset, -borderOffset]
    End If
    
    ' Update corner mask to match poster size
    If m.cornerMask <> Invalid
        m.cornerMask.width = w
        m.cornerMask.height = h
    End If
    
    ' Old border child nodes no longer used (now PNG-based)
    If m.focusBorderTop    <> Invalid Then m.focusBorderTop.width    = borderWidth
    If m.focusBorderBottom <> Invalid
        m.focusBorderBottom.width = borderWidth
        m.focusBorderBottom.translation = [0, borderHeight - borderThickness]
    End If
    If m.focusBorderLeft  <> Invalid Then m.focusBorderLeft.height  = borderHeight
    If m.focusBorderRight <> Invalid
        m.focusBorderRight.height = borderHeight
        m.focusBorderRight.translation = [borderWidth - borderThickness, 0]
    End If
End Sub

' =============================================================================
' POSTER LOAD STATUS -- fade in when ready
' =============================================================================
Sub OnPosterLoadStatus()
    status = m.posterImage.loadStatus
    If status = "ready"
        m.shimmerAnim.control = "stop"
        If m.shimmerBase <> Invalid Then m.shimmerBase.visible = false
        If m.shimmerBar  <> Invalid Then m.shimmerBar.opacity  = 0.0
        m.fadeAnim.control = "start"
    Else If status = "failed"
        m.shimmerAnim.control = "stop"
        If m.shimmerBase <> Invalid Then m.shimmerBase.visible = false
        If m.shimmerBar  <> Invalid Then m.shimmerBar.opacity  = 0.0
        m.posterImage.uri = "pkg:/images/poster_placeholder.png"
        m.posterImage.opacity = 1.0
    End If
End Sub

' =============================================================================
' CONTENT BINDING -- RowList calls this when item data changes
' =============================================================================
Sub OnContentChange()
    content = m.top.itemContent
    If content = Invalid
        ClearPoster()
        Return
    End If
    
    ' Reset poster, restart shimmer for new image
    m.posterImage.opacity = 0.0
    m.fadeAnim.control = "stop"
    If m.shimmerBase <> Invalid Then m.shimmerBase.visible = true
    If m.shimmerBar  <> Invalid Then m.shimmerBar.opacity  = 0.0
    If m.shimmerAnim <> Invalid Then m.shimmerAnim.control = "start"
    
    ' --- POSTER IMAGE — try every known field name ---
    posterUrl = ""
    If posterUrl = "" And content.HasField("posterUrl")     And content.posterUrl     <> Invalid And content.posterUrl     <> "" Then posterUrl = content.posterUrl
    If posterUrl = "" And content.HasField("HDPosterUrl")   And content.HDPosterUrl   <> Invalid And content.HDPosterUrl   <> "" Then posterUrl = content.HDPosterUrl
    If posterUrl = "" And content.HasField("hdPosterUrl")   And content.hdPosterUrl   <> Invalid And content.hdPosterUrl   <> "" Then posterUrl = content.hdPosterUrl
    If posterUrl = "" And content.HasField("SDPosterUrl")   And content.SDPosterUrl   <> Invalid And content.SDPosterUrl   <> "" Then posterUrl = content.SDPosterUrl
    If posterUrl = "" And content.HasField("tvPoster")      And content.tvPoster      <> Invalid And content.tvPoster      <> "" Then posterUrl = content.tvPoster
    If posterUrl = "" And content.HasField("poster")        And content.poster        <> Invalid And content.poster        <> "" Then posterUrl = content.poster
    If posterUrl = "" And content.HasField("thumbnailUrl")  And content.thumbnailUrl  <> Invalid And content.thumbnailUrl  <> "" Then posterUrl = content.thumbnailUrl
    If posterUrl = "" And content.HasField("thumbnail")     And content.thumbnail     <> Invalid And content.thumbnail     <> "" Then posterUrl = content.thumbnail

    If posterUrl <> ""
        m.posterImage.uri = posterUrl
        ' poster will fade in via OnPosterLoadStatus when ready
    Else
        m.shimmerAnim.control = "stop"
        If m.shimmerBase <> Invalid Then m.shimmerBase.visible = false
        m.posterImage.uri = "pkg:/images/poster_placeholder.png"
        m.posterImage.opacity = 1.0
    End If
    
    ' --- LOCK STATUS ---
    isUnlocked = true
    If content.HasField("isUnlocked") Then isUnlocked = content.isUnlocked
    If Not isUnlocked And content.HasField("isFree") Then isUnlocked = content.isFree
    If m.lockOverlay <> Invalid Then m.lockOverlay.visible = Not isUnlocked
    
    ' --- WATCH PROGRESS ---
    If m.progressGroup <> Invalid
        progress = 0
        duration = 0
        If content.HasField("watchProgress") Then progress = content.watchProgress
        If content.HasField("duration") Then duration = content.duration
        If progress > 0 And duration > 0
            m.progressFill.width = Int(m.top.width * (progress / duration))
            m.progressGroup.visible = true
        Else
            m.progressGroup.visible = false
        End If
    End If
    
    ' --- RANK BADGE (Top Ten rows) ---
    If m.rankBadge <> Invalid
        rankNum = 0
        If content.HasField("rankNumber") Then rankNum = content.rankNumber
        If rankNum > 0
            m.rankBadgeLabel.text = Str(rankNum).Trim()
            badgeY = m.top.height - 56
            If m.rankBadgeBg <> Invalid Then m.rankBadgeBg.translation = [0, badgeY]
            If m.rankBadgeLabel <> Invalid Then m.rankBadgeLabel.translation = [0, badgeY]
            m.rankBadge.visible = true
        Else
            m.rankBadge.visible = false
        End If
    End If
End Sub

Sub ClearPoster()
    m.posterImage.uri = ""
    If m.lockOverlay <> Invalid Then m.lockOverlay.visible = false
    If m.progressGroup <> Invalid Then m.progressGroup.visible = false
End Sub

' =============================================================================
' FOCUS -- Red border + scale (scale only for large posters to prevent overlap)
' =============================================================================
Sub OnFocusChange()
    focusPercent = m.top.focusPercent

    ' Only scale up if poster is large enough (>=360px tall).
    ' Smaller posters (Public Square uses 300px) skip scale to prevent
    ' overlapping into adjacent rows.
    allowScale = (m.top.height >= 360)

    If focusPercent > 0.5
        ' FOCUSED: show red border, deepen shadow
        targetScale = [1.1, 1.1]
        If Not allowScale Then targetScale = [1.0, 1.0]
        If m.focusBorder <> Invalid Then m.focusBorder.visible = true
        If m.shadow <> Invalid Then m.shadow.opacity = 0.7
    Else
        ' UNFOCUSED: normal scale, hide border
        targetScale = [1.0, 1.0]
        If m.focusBorder <> Invalid Then m.focusBorder.visible = false
        If m.shadow <> Invalid Then m.shadow.opacity = 0.4
    End If

    ' Animate the scale transition
    If m.posterContainer <> Invalid
        m.scaleInterp.keyValue = [m.posterContainer.scale, targetScale]
        m.scaleAnim.control = "start"
    End If
End Sub
