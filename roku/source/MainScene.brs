sub init()
    m.contentGrid = m.top.findNode("contentGrid")
    m.spinner = m.top.findNode("spinner")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.errorDialog = m.top.findNode("errorDialog")

    ' Event Listeners
    m.contentGrid.observeField("rowItemSelected", "onItemSelected")
    m.videoPlayer.observeField("state", "onVideoStateChanged")

    loadContent()
end sub

sub loadContent()
    m.spinner.visible = true
    m.contentTask = CreateObject("roSGNode", "APITask")
    m.contentTask.observeField("content", "onContentReady")
    m.contentTask.control = "RUN"
end sub

sub onContentReady()
    m.spinner.visible = false
    if m.contentTask.content <> invalid
        m.contentGrid.content = m.contentTask.content
        m.contentGrid.visible = true
        m.contentGrid.setFocus(true)
    else
        showError("Unable to load content.")
    end if
end sub

sub onItemSelected()
    row = m.contentGrid.content.getChild(m.contentGrid.rowItemFocused[0])
    item = row.getChild(m.contentGrid.rowItemFocused[1])
    if item <> invalid then playVideo(item)
end sub

sub playVideo(contentItem as Object)
    m.contentGrid.visible = false
    m.videoPlayer.visible = true
    
    videoContent = CreateObject("roSGNode", "ContentNode")
    videoContent.url = contentItem.url
    videoContent.title = contentItem.title
    videoContent.streamFormat = "mp4" 
    
    m.videoPlayer.content = videoContent
    m.videoPlayer.control = "play"
    m.videoPlayer.setFocus(true)
end sub

sub onVideoStateChanged()
    if m.videoPlayer.state = "finished" or m.videoPlayer.state = "error"
        closeVideoPlayer()
    end if
end sub

sub closeVideoPlayer()
    m.videoPlayer.control = "stop"
    m.videoPlayer.visible = false
    m.contentGrid.visible = true
    m.contentGrid.setFocus(true)
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "back"
            if m.videoPlayer.visible
                closeVideoPlayer()
                return true
            end if
        end if
    end if
    return false
end function

sub showError(message as String)
    m.errorDialog.message = message
    m.errorDialog.visible = true
    m.errorDialog.buttons = ["OK"]
    m.errorDialog.observeField("buttonSelected", "onErrorDialogButtonSelected")
end sub

sub onErrorDialogButtonSelected()
    m.errorDialog.visible = false
    loadContent()
end sub