function init()
    ' Get references to UI elements
    m.menuGroup = m.top.findNode("menuGroup")
    m.expandAnim = m.top.findNode("expandAnim")
    m.collapseAnim = m.top.findNode("collapseAnim")
    
    ' Get references to buttons
    m.navSearch = m.top.findNode("navSearch")
    m.navHome = m.top.findNode("navHome")
    m.navClassics = m.top.findNode("navClassics")
    m.navAccount = m.top.findNode("navAccount")

    ' Observer to handle when focus enters this component
    m.top.observeField("focusedChild", "onFocusChange")
end function

' This function runs whenever the SideBar gains or loses focus
function onFocusChange()
    if m.top.hasFocus()
        ' 1. Expand the sidebar
        m.top.isExpanded = true
        
        ' 2. Ensure the specific button gets focus
        ' If no button is currently focused, default to Search
        if not m.navSearch.hasFocus() and not m.navHome.hasFocus() and not m.navClassics.hasFocus() and not m.navAccount.hasFocus()
            m.navSearch.setFocus(true)
        end if
    else
        ' Focus left the sidebar (went to the main content area)
        m.top.isExpanded = false
    end if
end function

' Handles the animations based on isExpanded
function onStateChange()
    if m.top.isExpanded
        m.collapseAnim.control = "stop"
        m.expandAnim.control = "start"
    else
        m.expandAnim.control = "stop"
        m.collapseAnim.control = "start"
    end if
end function

' Handle Remote Control Key Presses
function onKeyEvent(key as String, press as Boolean) as Boolean
    if press
        if key = "right"
            ' If user presses RIGHT, we want to leave the Sidebar.
            ' We return FALSE so the event bubbles up to MainScene.
            ' MainScene should then focus the RowList/Grid.
            return false 
        else if key = "up" or key = "down"
            ' If user presses UP/DOWN, we want to navigate the buttons.
            ' Since the buttons are standard Roku nodes, they often handle this themselves
            ' if they are in a LayoutGroup. But returning FALSE ensures standard behavior works.
            return false 
        end if
    end if
    return false
end function