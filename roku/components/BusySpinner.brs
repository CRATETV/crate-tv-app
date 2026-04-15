' ##############################################################################
' CRATE TV - Busy Spinner Controller
' Animated loading indicator with rotation
' ##############################################################################

Sub Init()
    m.poster = m.top.FindNode("spinnerPoster")
    
    ' Create rotation animation
    m.rotationAnimation = m.top.CreateChild("Animation")
    m.rotationAnimation.duration = 1
    m.rotationAnimation.repeat = true
    m.rotationAnimation.easeFunction = "linear"
    
    m.rotationInterpolator = m.rotationAnimation.CreateChild("FloatFieldInterpolator")
    m.rotationInterpolator.fieldToInterp = "spinnerPoster.rotation"
    
    If m.top.clockwise
        m.rotationInterpolator.keyValue = [0, 6.28318] ' 0 to 2*PI
    Else
        m.rotationInterpolator.keyValue = [6.28318, 0]
    End If
    m.rotationInterpolator.key = [0, 1]
    
    ' Start animation
    m.rotationAnimation.control = "start"
    
    ' Set poster if specified
    If m.top.poster <> ""
        m.poster.uri = m.top.poster
    End If
End Sub

Sub OnPosterChange()
    m.poster.uri = m.top.poster
End Sub
