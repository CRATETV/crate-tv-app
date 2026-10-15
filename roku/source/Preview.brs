' ##############################################################################
' CRATE TV - Which video a trailer preview plays (Home billboard + film page)
' ##############################################################################
'
' THE RULE (PreviewSourceFor)
'   1. The film has a trailer          -> play the trailer from the start.
'   2. No trailer, but the viewer can watch the film (free, or they own it)
'                                       -> play PREVIEW_CLIP_SECONDS from the
'                                          middle of the film itself. No setup.
'   3. No trailer and the film is locked -> no preview (artwork only).
'      The full film is never sent to a Roku that hasn't paid for it, so it
'      can't be used for a preview. Add a trailer in the admin to give locked
'      films a preview.
'
' TO CHANGE: the two numbers below. PREVIEW_START is a fraction of the film:
' 0.33 = a third of the way in (current), 0.5 = the middle.
'
' PREVIEWS ARE SKIPPED ENTIRELY (PreviewsAllowed) when:
'   - the viewer has turned off autoplay in their Roku's settings, or
'   - the Roku is an older/low-power model or is short on memory,
'     where a video playing behind the menus could make scrolling stutter.
'   Those viewers simply see the artwork, as before.
' ##############################################################################

Function PreviewSourceFor(film as Object) as Object
    PREVIEW_START = 0.33       ' a third of the way in (fewer spoilers than the middle)
    PREVIEW_CLIP_SECONDS = 60

    none = { url: "", startPercent: 0.0, maxSeconds: 0 }
    If film = Invalid Or Not PreviewsAllowed() Then Return none

    trailer = PreviewText(film, "trailerUrl")
    If trailer <> "" Then Return { url: trailer, startPercent: 0.0, maxSeconds: 0 }

    ' Live watch parties play in sync for everyone: never preview those.
    If film.HasField("isWatchPartyEnabled") And film.isWatchPartyEnabled Then Return none
    canWatch = true
    If film.HasField("isUnlocked") Then canWatch = film.isUnlocked
    If Not canWatch Then Return none

    full = PreviewText(film, "streamUrl")
    If full = "" Then full = PreviewText(film, "url")
    If full = "" Then Return none
    Return { url: full, startPercent: PREVIEW_START, maxSeconds: PREVIEW_CLIP_SECONDS }
End Function

Function PreviewText(node as Object, fieldName as String) as String
    If node = Invalid Or Not node.HasField(fieldName) Then Return ""
    value = node[fieldName]
    If Type(value) = "roString" Or Type(value) = "String" Then Return value
    Return ""
End Function

' True if this Roku should play previews at all (see the notes at the top).
' Each check is only made if this Roku's software has it, so older Rokus
' never crash on a missing function.
Function PreviewsAllowed() as Boolean
    di = CreateObject("roDeviceInfo")
    ' The viewer's own Roku setting for autoplaying video
    If FindMemberFunction(di, "IsAutoplayEnabled") <> Invalid
        If Not di.IsAutoplayEnabled() Then Return false
    End If
    ' Older low-power Rokus use the "directfb" graphics system
    If FindMemberFunction(di, "GetGraphicsPlatform") <> Invalid
        If LCase(di.GetGraphicsPlatform()) = "directfb" Then Return false
    End If
    ' Roku has warned the channel about memory (main.brs, HandleMemoryEvent)
    If m.global <> Invalid And m.global.memoryLow = true Then Return false
    ' Running low on memory right now
    If FindMemberFunction(di, "GetGeneralMemoryLevel") <> Invalid
        level = LCase(di.GetGeneralMemoryLevel())
        If level = "low" Or level = "critical" Then Return false
    End If
    Return true
End Function
