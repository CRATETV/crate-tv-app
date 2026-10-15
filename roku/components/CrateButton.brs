' ##############################################################################
' CRATE TV - Button logic (see CrateButton.xml)
' ##############################################################################
Sub Init()
    m.PADDING = 30          ' space left and right of the text
    m.MIN_WIDTH = 150
    m.bg = m.top.FindNode("bg")
    m.label = m.top.FindNode("label")
End Sub

Sub OnTextChange()
    m.label.text = m.top.text
    w = m.label.boundingRect().width + m.PADDING * 2
    If w < m.MIN_WIDTH Then w = m.MIN_WIDTH
    m.bg.width = w
    ' Centre the text if the button was widened to the minimum.
    m.label.width = w - m.PADDING * 2
    m.label.horizAlign = "center"
    m.top.buttonWidth = w
End Sub

Sub OnFocusedChange()
    If m.top.focused
        m.bg.uri = "pkg:/images/ui/btn_focus.9.png"
        m.label.color = "#000000"
    Else
        m.bg.uri = "pkg:/images/ui/btn_idle.9.png"
        m.label.color = "#FFFFFF"
    End If
End Sub
