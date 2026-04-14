sub init()
    m.top.setFocus(true)
    m.titleLabel    = m.top.findNode("titleLabel")
    m.genresLabel   = m.top.findNode("genresLabel")
    m.synopsisLabel = m.top.findNode("synopsisLabel")
    m.metaLabel     = m.top.findNode("metaLabel")
    m.castLabel     = m.top.findNode("castLabel")
    m.awardLabel    = m.top.findNode("awardLabel")
    m.itemPoster    = m.top.findNode("itemPoster")
    m.heroBg        = m.top.findNode("heroBg")
    m.laurelImage   = m.top.findNode("laurelImage")
    m.playBtn       = m.top.findNode("playBtn")
    m.trailerBtn    = m.top.findNode("trailerBtn")
    m.paywallGroup  = m.top.findNode("paywallGroup")
    m.qrCode        = m.top.findNode("qrCode")
    m.focusedButton = "play"
end sub

sub onContentChange()
    content = m.top.content
    if content = invalid then return

    ' ── POSTER & BACKGROUND ──────────────────────────────────────
    m.itemPoster.uri = content.hdPosterUrl
    ' Background uses wide hero if available
    heroBgUrl = content.heroImage
    if heroBgUrl = invalid or heroBgUrl = "" then heroBgUrl = content.hdPosterUrl
    m.heroBg.uri = heroBgUrl

    ' ── TITLE ────────────────────────────────────────────────────
    m.titleLabel.text = content.title

    ' ── GENRES ───────────────────────────────────────────────────
    genres = content.genres
    if genres <> invalid and genres.count() > 0
        genreText = ""
        for i = 0 to genres.count() - 1
            genreText = genreText + genres[i].toUpper()
            if i < genres.count() - 1 then genreText = genreText + "  ·  "
        end for
        m.genresLabel.text = genreText
    else
        m.genresLabel.text = ""
    end if

    ' ── META ROW: year · runtime · director ──────────────────────
    metaParts = []
    if content.year <> invalid and content.year <> "" then metaParts.push(content.year)
    if content.runtime <> invalid and content.runtime <> "" then metaParts.push(content.runtime)
    if content.director <> invalid and content.director <> ""
        metaParts.push("Dir. " + content.director)
    end if
    m.metaLabel.text = metaParts.join("   ·   ")

    ' ── SYNOPSIS ─────────────────────────────────────────────────
    m.synopsisLabel.text = content.description

    ' ── CAST ─────────────────────────────────────────────────────
    cast = content.cast
    if cast <> invalid and cast.count() > 0
        castNames = []
        for i = 0 to min(cast.count() - 1, 4)
            castNames.push(cast[i])
        end for
        m.castLabel.text = "Starring: " + castNames.join(", ")
    else
        m.castLabel.text = ""
    end if

    ' ── AWARD ────────────────────────────────────────────────────
    awardName = content.awardName
    if awardName <> invalid and awardName <> ""
        awardYear = content.awardYear
        if awardYear <> invalid and awardYear <> ""
            m.awardLabel.text = "🏆  " + awardName + " — " + awardYear
        else
            m.awardLabel.text = "🏆  " + awardName
        end if
        m.awardLabel.visible = true
    else
        m.awardLabel.visible = false
    end if

    ' ── LAUREL ───────────────────────────────────────────────────
    laurelUrl = content.customLaurelUrl
    if laurelUrl <> invalid and laurelUrl <> ""
        m.laurelImage.uri = laurelUrl
        m.laurelImage.visible = true
    else
        m.laurelImage.visible = false
    end if

    ' ── PAYWALL / BUTTONS ────────────────────────────────────────
    isLocked = (content.isUnlocked = false and content.isFree = false)
    if not isLocked
        m.playBtn.visible      = true
        m.paywallGroup.visible = false
        m.focusedButton        = "play"
    else
        m.playBtn.visible      = false
        m.paywallGroup.visible = true
        m.focusedButton        = "trailer"
        ShowPaywall(content)
    end if

    ' Trailer button
    if content.trailerUrl <> invalid and content.trailerUrl <> ""
        m.trailerBtn.visible = true
    else
        m.trailerBtn.visible = false
    end if

    UpdateFocus()
end sub

sub UpdateFocus()
    if m.focusedButton = "play"
        m.playBtn.color    = "0xFFFFFFFF"
        m.trailerBtn.color = "0x1A1A1AFF"
    else if m.focusedButton = "trailer"
        m.trailerBtn.color = "0xEF4444FF"
        m.playBtn.color    = "0xFFFFFFFF"
    end if
end sub

sub ShowPaywall(content)
    purchaseUrl = content.purchaseUrl
    if purchaseUrl = invalid or purchaseUrl = ""
        purchaseUrl = "https://cratetv.net/movie/" + content.id + "?action=buy"
    end if
    ut = CreateObject("roUrlTransfer")
    encodedUrl = ut.Escape(purchaseUrl)
    m.qrCode.uri = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodedUrl
end sub

function min(a, b)
    if a < b then return a
    return b
end function

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "up" or key = "down"
            if m.playBtn.visible and m.trailerBtn.visible
                if m.focusedButton = "play"
                    m.focusedButton = "trailer"
                else
                    m.focusedButton = "play"
                end if
                UpdateFocus()
                return true
            end if
        else if key = "OK"
            if m.focusedButton = "play" and m.playBtn.visible
                m.top.command = { action: "play", content: m.top.content }
            else if m.focusedButton = "trailer" and m.trailerBtn.visible
                trailerContent = CreateObject("roSGNode", "ContentNode")
                trailerContent.url   = m.top.content.trailerUrl
                trailerContent.title = m.top.content.title + " (Trailer)"
                trailerContent.streamFormat = "mp4"
                m.top.command = { action: "play", content: trailerContent }
            end if
            return true
        else if key = "back"
            m.top.command = { action: "close" }
            return true
        end if
    end if
    return false
end function
