' ##############################################################################
' CRATE TV - Screensaver logic (what it looks like: CrateScreensaver.xml)
' ##############################################################################
'
' 1. Download the catalogue (ContentTask, same as Home) and make a shuffled
'    list of artwork: wide hero images where a film has one, else its poster.
' 2. Every slideTimer tick: load the next image into the hidden slide; when
'    it has downloaded, cross-fade to it and start a slow zoom.
' If the catalogue can't load, the screen simply stays black.
' ##############################################################################

Sub Init()
    m.FADE_SECONDS = 1.6
    m.ZOOM_SECONDS = 12
    m.ZOOM_TO = 1.08          ' how far each image slowly zooms in
    m.MAX_SLIDES = 40

    m.slides = []
    m.index = -1
    m.showingA = false

    m.A = { group: m.top.FindNode("slideA"), art: m.top.FindNode("artA"), fade: m.top.FindNode("fadeLeftA"), title: m.top.FindNode("titleA") }
    m.B = { group: m.top.FindNode("slideB"), art: m.top.FindNode("artB"), fade: m.top.FindNode("fadeLeftB"), title: m.top.FindNode("titleB") }
    m.A.art.ObserveField("loadStatus", "OnArtLoaded")
    m.B.art.ObserveField("loadStatus", "OnArtLoaded")

    m.crossFade = MakeCrossFade()
    m.zoom = MakeZoom()

    m.timer = m.top.FindNode("slideTimer")
    m.timer.ObserveField("fire", "NextSlide")
    m.timer.control = "start"
    task = CreateObject("roSGNode", "ContentTask")
    task.taskType = "fetchFeed"
    task.ObserveField("taskStatus", "OnFeedLoaded")
    task.control = "run"
    m.task = task
End Sub

Sub OnFeedLoaded()
    If m.task.taskStatus <> "success" Or m.task.feedData = Invalid Then Return
    feed = m.task.feedData
    seen = {}
    list = []
    For i = 0 To feed.GetChildCount() - 1
        row = feed.GetChild(i)
        For j = 0 To row.GetChildCount() - 1
            film = row.GetChild(j)
            key = Field(film, "movieKey")
            If key = "" Then key = Field(film, "id")
            If key <> "" And Not seen.DoesExist(key)
                seen[key] = true
                wide = (film.HasField("hasWideArt") And film.hasWideArt And Field(film, "backdropUrl") <> "")
                url = Field(film, "posterUrl")
                If wide Then url = Field(film, "backdropUrl")
                If url <> "" Then list.Push({ url: url, wide: wide, title: Field(film, "title") })
            End If
        End For
    End For
    ' Shuffle, so it's different every time
    For i = list.Count() - 1 To 1 Step -1
        k = Rnd(i + 1) - 1
        t = list[i] : list[i] = list[k] : list[k] = t
    End For
    While list.Count() > m.MAX_SLIDES
        list.Pop()
    End While
    m.slides = list
    NextSlide()
End Sub

' Load the next image into whichever slide is hidden.
Sub NextSlide()
    If m.slides.Count() = 0 Then Return
    m.index = (m.index + 1) Mod m.slides.Count()
    s = m.slides[m.index]
    If m.showingA Then target = m.B Else target = m.A
    target.title.text = s.title
    If s.wide
        target.art.translation = [0, 0] : target.art.width = 1920 : target.art.loadWidth = 1920
        target.fade.translation = [0, 0] : target.fade.width = 1400
    Else
        target.art.translation = [880, 0] : target.art.width = 1040 : target.art.loadWidth = 1040
        target.fade.translation = [508, 0] : target.fade.width = 840
    End If
    target.art.loadHeight = 1080
    target.art.scale = [1.0, 1.0]
    target.art.scaleRotateCenter = [target.art.width / 2, 540]
    If target.art.uri = s.url
        ShowLoaded(target)          ' same image (only one film): no reload needed
    Else
        target.art.uri = s.url
    End If
End Sub

Sub OnArtLoaded()
    If m.showingA Then target = m.B Else target = m.A
    If target.art.loadStatus = "ready" Then ShowLoaded(target)
End Sub

' Cross-fade to the slide that just loaded, and start its slow zoom.
Sub ShowLoaded(target as Object)
    If m.showingA Then current = m.A Else current = m.B
    m.crossFade.control = "stop"
    m.fadeIn.fieldToInterp = target.group.id + ".opacity"
    m.fadeOut.fieldToInterp = current.group.id + ".opacity"
    m.crossFade.control = "start"
    m.zoom.control = "stop"
    m.zoomInterp.fieldToInterp = target.art.id + ".scale"
    m.zoom.control = "start"
    m.showingA = Not m.showingA
End Sub

Function MakeCrossFade() as Object
    anim = m.top.CreateChild("ParallelAnimation")
    a = anim.CreateChild("Animation")
    a.duration = m.FADE_SECONDS : a.easeFunction = "inOutQuad"
    m.fadeIn = a.CreateChild("FloatFieldInterpolator")
    m.fadeIn.key = [0.0, 1.0] : m.fadeIn.keyValue = [0.0, 1.0]
    m.fadeIn.fieldToInterp = "slideA.opacity"
    b = anim.CreateChild("Animation")
    b.duration = m.FADE_SECONDS : b.easeFunction = "inOutQuad"
    m.fadeOut = b.CreateChild("FloatFieldInterpolator")
    m.fadeOut.key = [0.0, 1.0] : m.fadeOut.keyValue = [1.0, 0.0]
    m.fadeOut.fieldToInterp = "slideB.opacity"
    Return anim
End Function

Function MakeZoom() as Object
    anim = m.top.CreateChild("Animation")
    anim.duration = m.ZOOM_SECONDS
    anim.easeFunction = "linear"
    m.zoomInterp = anim.CreateChild("Vector2DFieldInterpolator")
    m.zoomInterp.key = [0.0, 1.0]
    m.zoomInterp.keyValue = [[1.0, 1.0], [m.ZOOM_TO, m.ZOOM_TO]]
    m.zoomInterp.fieldToInterp = "artA.scale"
    Return anim
End Function

Function Field(node as Object, name as String) as String
    If node = Invalid Or Not node.HasField(name) Then Return ""
    v = node[name]
    If Type(v) = "roString" Or Type(v) = "String" Then Return v
    Return ""
End Function
