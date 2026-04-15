' CRATE TV - Resolution Manager
' Detects display size, stores scale + tier on m.global.
' SD(720x480)=0.375, HD(1280x720)=0.667, FHD=1.0, 4K=1.0(OS upscales)
Function InitResolution() as Void
    scale = 1.0
    tier  = "FHD"
    try
        di = CreateObject("roDeviceInfo")
        if di <> Invalid
            sz = di.GetDisplaySize()
            if sz <> Invalid
                w = sz.w
                if w <= 720
                    scale = 0.375 : tier = "SD"
                else if w <= 1280
                    scale = CDbl(w) / 1920.0 : tier = "HD"
                else if w <= 1920
                    scale = CDbl(w) / 1920.0 : tier = "FHD"
                else
                    scale = 1.0 : tier = "4K"
                end if
            end if
        end if
    catch e
    end try
    m.global.AddField("resolutionScale", "float",  false)
    m.global.AddField("resolutionTier",  "string", false)
    m.global.resolutionScale = scale
    m.global.resolutionTier  = tier
    Print "CrateTV [Init]: Resolution " + tier + " scale=" + Str(scale).Trim()
End Function
