' ##############################################################################
' CRATE TV - THEME (the look of the whole channel in one place)
' ##############################################################################
'
' WHAT THIS FILE IS
'   Every colour, font and the main spacing values used by the redesigned
'   screens (Home, Title page, Header, poster tiles, video controls).
'   Change a value here and every screen that uses it follows.
'
' HOW SCREENS USE IT
'   1. In a component's .xml, add this line next to the other <script> tags:
'        <script type="text/brightscript" uri="pkg:/source/Theme.brs" />
'   2. In its .brs code:
'        theme = CrateTheme()
'        myLabel.color = theme.colors.textPrimary
'        myLabel.font  = CrateFont("bold", 40)
'
'   XML labels set their font directly instead, like this:
'        <Label text="Hello">
'            <Font role="font" uri="pkg:/fonts/Inter-Bold.ttf" size="40" />
'        </Label>
'
' FONTS
'   The channel uses Inter (free for commercial use, SIL Open Font License,
'   licence in roku/fonts/Inter-LICENSE.txt). The files in roku/fonts/ were
'   trimmed to Latin letters, accents (é, ñ, ü...) and a few symbols
'   (▶ ★ ✓ · — …) to keep the channel small. If a title ever shows an empty
'   box instead of a character, that character isn't in the trimmed font.
'
' SIZES
'   The channel is designed on a 1920 x 1080 canvas (FHD). Roku scales it
'   down automatically on 720p TVs (manifest: ui_resolutions=fhd,hd).
' ##############################################################################

Function CrateTheme() as Object
    return {
        colors: {
            background:     "#000000"   ' page background (pure black, like a cinema)
            surface:        "#141414"   ' cards and panels
            textPrimary:    "#FFFFFF"   ' titles
            textSecondary:  "#B3B3B3"   ' metadata line (runtime, genre)
            textBody:       "#D2D2D2"   ' synopsis
            textMuted:      "#8C8C8C"   ' credits, hints
            accent:         "#EF4444"   ' CRATE red: eyebrow labels, progress, live badges
            gold:           "#E8C15A"   ' award line
            focus:          "#FFFFFF"   ' focus ring / focused button
        }

        ' Left edge of all content. Netflix-style TV apps keep a generous margin.
        marginX: 96

        ' Poster tile size on Home (portrait 2:3).
        tileWidth:  214
        tileHeight: 321
        tileGap:    18
    }
End Function

' Returns a Font node for code-created labels.
'   style: "regular" | "medium" | "semibold" | "bold" | "display" | "black"
'   size:  pixels on the 1920x1080 canvas
Function CrateFont(style as String, size as Integer) as Object
    files = {
        regular:  "pkg:/fonts/Inter-Regular.ttf"
        medium:   "pkg:/fonts/Inter-Medium.ttf"
        semibold: "pkg:/fonts/Inter-SemiBold.ttf"
        bold:     "pkg:/fonts/Inter-Bold.ttf"
        display:  "pkg:/fonts/InterDisplay-Bold.ttf"    ' big titles
        black:    "pkg:/fonts/InterDisplay-Black.ttf"   ' Top 10 rank numbers
    }
    uri = files[LCase(style)]
    If uri = Invalid Then uri = files.regular
    font = CreateObject("roSGNode", "Font")
    font.uri = uri
    font.size = size
    return font
End Function
