' ##############################################################################
' CRATE TV - Ranked Movie Poster (V4 Studio)
' Massive numeric outlines behind poster. No title. 1.1x focus scale.
' ##############################################################################

Sub Init()
    m.itemContainer = m.top.FindNode("itemContainer")
    m.posterContainer = m.top.FindNode("posterContainer")
    m.posterImage = m.top.FindNode("posterImage")
    m.lockOverlay = m.top.FindNode("lockOverlay")
    m.focusBorder = m.top.FindNode("focusBorder")
    m.shadow = m.top.FindNode("shadow")
    m.rankNumberStroke = m.top.FindNode("rankNumberStroke")
    m.rankNumberShadow = m.top.FindNode("rankNumberShadow")
    
    m.scaleAnim = m.top.CreateChild("Animation")
    m.scaleAnim.duration = 0.1
    m.scaleAnim.easeFunction = "outCubic"
    m.scaleInterp = m.scaleAnim.CreateChild("Vector2DFieldInterpolator")
    m.scaleInterp.fieldToInterp = "itemContainer.scale"
    m.scaleInterp.key = [0.0, 1.0]

    ' Shimmer
    m.shimmerBase = m.top.FindNode("shimmerBase")
    m.shimmerBar  = m.top.FindNode("shimmerBar")
    m.posterImage.opacity = 0.0
    m.posterImage.ObserveField("loadStatus", "OnPosterLoadStatus")

    m.shimmerAnim = m.top.CreateChild("Animation")
    m.shimmerAnim.duration = 1.1
    m.shimmerAnim.repeat = true
    m.shimmerAnim.easeFunction = "inOutSine"
    shimInterp = m.shimmerAnim.CreateChild("FloatFieldInterpolator")
    shimInterp.fieldToInterp = "shimmerBar.opacity"
    shimInterp.key = [0.0, 0.5, 1.0]
    shimInterp.keyValue = [0.0, 1.0, 0.0]
    m.shimmerAnim.control = "start"

    m.fadeAnim = m.top.CreateChild("Animation")
    m.fadeAnim.duration = 0.3
    m.fadeAnim.easeFunction = "outCubic"
    fadeInterp = m.fadeAnim.CreateChild("FloatFieldInterpolator")
    fadeInterp.fieldToInterp = "posterImage.opacity"
    fadeInterp.key = [0.0, 1.0]
    fadeInterp.keyValue = [0.0, 1.0]
End Sub

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

Sub OnIndexChange()
    rank = m.top.itemIndex + 1
    content = m.top.itemContent
    If content <> Invalid And content.HasField("rank") And content.rank > 0
        rank = content.rank
    End If
    If rank < 10
        rankStr = "0" + Str(rank).Trim()
    Else
        rankStr = Str(rank).Trim()
    End If
    m.rankNumberStroke.text = rankStr
    m.rankNumberShadow.text = rankStr
End Sub

Sub OnContentChange()
    content = m.top.itemContent
    If content = Invalid
        m.posterImage.uri = ""
        m.lockOverlay.visible = false
        m.rankNumberStroke.text = ""
        m.rankNumberShadow.text = ""
        Return
    End If
    OnIndexChange()

    ' Reset shimmer for new image
    m.posterImage.opacity = 0.0
    If m.fadeAnim   <> Invalid Then m.fadeAnim.control   = "stop"
    If m.shimmerBase <> Invalid Then m.shimmerBase.visible = true
    If m.shimmerBar  <> Invalid Then m.shimmerBar.opacity  = 0.0
    If m.shimmerAnim <> Invalid Then m.shimmerAnim.control = "start"

    ' Try every known poster field name
    posterUrl = ""
    If posterUrl = "" And content.HasField("posterUrl")    And content.posterUrl    <> Invalid And content.posterUrl    <> "" Then posterUrl = content.posterUrl
    If posterUrl = "" And content.HasField("HDPosterUrl")  And content.HDPosterUrl  <> Invalid And content.HDPosterUrl  <> "" Then posterUrl = content.HDPosterUrl
    If posterUrl = "" And content.HasField("hdPosterUrl")  And content.hdPosterUrl  <> Invalid And content.hdPosterUrl  <> "" Then posterUrl = content.hdPosterUrl
    If posterUrl = "" And content.HasField("SDPosterUrl")  And content.SDPosterUrl  <> Invalid And content.SDPosterUrl  <> "" Then posterUrl = content.SDPosterUrl
    If posterUrl = "" And content.HasField("tvPoster")     And content.tvPoster     <> Invalid And content.tvPoster     <> "" Then posterUrl = content.tvPoster
    If posterUrl = "" And content.HasField("poster")       And content.poster       <> Invalid And content.poster       <> "" Then posterUrl = content.poster
    If posterUrl = "" And content.HasField("thumbnailUrl") And content.thumbnailUrl <> Invalid And content.thumbnailUrl <> "" Then posterUrl = content.thumbnailUrl
    If posterUrl = "" And content.HasField("thumbnail")    And content.thumbnail    <> Invalid And content.thumbnail    <> "" Then posterUrl = content.thumbnail
    If posterUrl <> ""
        m.posterImage.uri = posterUrl
    Else
        If m.shimmerAnim <> Invalid Then m.shimmerAnim.control = "stop"
        If m.shimmerBase <> Invalid Then m.shimmerBase.visible = false
        m.posterImage.uri = "pkg:/images/poster_placeholder.png"
        m.posterImage.opacity = 1.0
    End If
    
    isUnlocked = true
    If content.HasField("isUnlocked") Then isUnlocked = content.isUnlocked
    m.lockOverlay.visible = Not isUnlocked
End Sub

Sub OnFocusChange()
    focusPercent = m.top.focusPercent
    If focusPercent > 0.5
        targetScale = [1.1, 1.1]
        m.focusBorder.visible = true
        m.shadow.opacity = 0.7
        m.rankNumberStroke.color = "#EF4444"
    Else
        targetScale = [1.0, 1.0]
        m.focusBorder.visible = false
        m.shadow.opacity = 0.4
        m.rankNumberStroke.color = "#333333"
    End If
    m.scaleInterp.keyValue = [m.itemContainer.scale, targetScale]
    m.scaleAnim.control = "start"
End Sub
