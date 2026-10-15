' ##############################################################################
' CRATE TV - Screensaver entry point
' ##############################################################################
'
' Roku calls RunScreenSaver() (instead of Main) when Crate TV is open and the
' TV has been idle for the time set in the Roku's Settings > Theme >
' Screensaver. It shows CrateScreensaver: a slow slideshow of film artwork.
' Any button press closes it and returns to the channel exactly where it was.
'
' The manifest has screensaver_private=1, so this screensaver only runs while
' Crate TV is open. It is not offered in the Roku's list of system-wide
' screensavers (that would need a separate Roku review).
' ##############################################################################

Sub RunScreenSaver()
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.SetMessagePort(port)
    screen.CreateScene("CrateScreensaver")
    screen.Show()
    While True
        msg = Wait(0, port)
        If Type(msg) = "roSGScreenEvent" And msg.IsScreenClosed() Then Return
    End While
End Sub
