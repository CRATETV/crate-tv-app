' ##############################################################################
' CRATE TV - Hero Item Controller
' 16:9 featured content banner
' ##############################################################################

Sub Init()
    m.heroImage = m.top.FindNode("heroImage")
    m.theme = GetThemeConfig()
End Sub

Sub OnContentChange()
    content = m.top.itemContent
    If content = Invalid
        m.heroImage.uri = "pkg:/images/hero_placeholder.png"
        return
    End If
    
    ' Set hero image - prefer backdrop/hero, fall back to poster
    imageUrl = ""
    
    If content.HasField("heroImageUrl") And content.heroImageUrl <> ""
        imageUrl = content.heroImageUrl
    Else If content.HasField("backdropUrl") And content.backdropUrl <> ""
        imageUrl = content.backdropUrl
    Else If content.HasField("posterUrl") And content.posterUrl <> ""
        imageUrl = content.posterUrl
    End If
    
    If imageUrl <> ""
        m.heroImage.uri = imageUrl
    Else
        m.heroImage.uri = "pkg:/images/hero_placeholder.png"
    End If
End Sub
