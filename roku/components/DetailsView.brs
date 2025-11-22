sub init()
    m.video = m.top.findNode("videoPlayer")
    m.infoGroup = m.top.findNode("infoGroup")
    m.titleLabel = m.top.findNode("titleLabel")
    m.descLabel = m.top.findNode("descLabel")
    
    m.playBtn = m.top.findNode("playBtn")
    m.playBtn.observeField("buttonSelected", "onPlayPressed")
end sub

sub onContentSet()
    item = m.top.content
    if item <> invalid
        m.titleLabel.text = item.title
        m.descLabel.text = "Description placeholder..." ' Assuming content has description
        m.video.content = item
    end if
end sub

sub onPlayPressed()
    ' Hiding UI and playing video as requested
    m.infoGroup.visible = false
    m.video.visible = true
    m.video.setFocus(true)
    
    ' Enforce mp4 stream format logic
    content = m.video.content
    content.streamFormat = "mp4" 
    
    m.video.control = "play"
    
    ' Handle video finish
    m.video.observeField("state", "onVideoStateChange")
end sub

sub onVideoStateChange(event)
    state = event.getData()
    if state = "finished"
        close()
    end if
end sub

sub close()
    ' Logic to close this view and return to previous would be handled by MainScene
    ' Usually by observing a 'close' field on this component.
end sub