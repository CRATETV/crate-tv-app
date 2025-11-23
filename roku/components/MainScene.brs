sub init()
    m.viewContainer = m.top.findNode("viewContainer")
    m.spinner = m.top.findNode("spinner")
    m.sideBar = m.top.findNode("sideBar")
    
    ' Start API
    m.apiTask = m.top.findNode("apiTask")
    m.apiTask.observeField("content", "onContentReady")
    m.apiTask.control = "RUN"
    
    ' Initial Focus: Sidebar
    m.sideBar.setFocus(true)
end sub

sub onContentReady(event)
    m.spinner.visible = false
    content = event.getData()
    
    ' Create Home View
    m.homeView = CreateObject("roSGNode", "HomeView")
    m.homeView.content = content
    m.viewContainer.appendChild(m.homeView)
    
if content.GetChildCount() > 0
    m.homeView.setFocus(true)
else
    m.sideBar.setFocus(true)
end if
    
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "left"
            ' Always allow going back to Sidebar
            if not m.sideBar.hasFocus()
                m.sideBar.setFocus(true)
                return true
            end if
        else if key = "right"
            ' Only allow going to content if Sidebar has focus
            if m.sideBar.hasFocus() and m.homeView <> invalid
                m.homeView.setFocus(true)
                return true
            end if
        end if
    end if
    return false
end function
