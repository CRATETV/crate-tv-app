' HomeScene.brs - minimal visible Home screen

function init()
    print "HomeScene.init(): starting"

    m.bg         = m.top.findNode("bg")
    m.titleLabel = m.top.findNode("titleLabel")

    if m.bg <> invalid then
        m.bg.color = &h202020FF  ' dark gray
    else
        print "HomeScene.init(): bg node is INVALID"
    end if

    if m.titleLabel <> invalid then
        m.titleLabel.text = "Crate TV - Home (loaded)"
        m.titleLabel.color = &hFFFFFFFF
    else
        print "HomeScene.init(): titleLabel node is INVALID"
    end if
end function
