sub init()
    m.video = m.top.findNode("video")
    m.overlay = m.top.findNode("overlay")
    m.title = m.top.findNode("title")
    m.actorList = m.top.findNode("actorList")
    
    m.video.observeField("state", "onState")
end sub

sub onContentSet()
    item = m.top.content
    content = CreateObject("roSGNode", "ContentNode")
    content.url = item.url
    m.video.content = content
    m.video.control = "play"
    
    m.title.text = item.title
    
    actors = ""
    if item.actors <> invalid
        for each actor in item.actors
            actors = actors + actor.name + ", "
        end for
    end if
    m.actorList.text = actors
end sub

sub onState()
    if m.video.state = "paused"
        m.overlay.visible = true
    else if m.video.state = "playing"
        m.overlay.visible = false
    else if m.video.state = "finished"
        m.top.getScene().removeChild(m.top)
    end if
end sub

function onKeyEvent(key, press)
    if press and key = "back"
        m.video.control = "stop"
        m.top.getScene().removeChild(m.top)
        return true
    end if
    return false
end function