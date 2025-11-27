' ContentTask.brs - basic content fetch task stub

function init()
    m.top.functionName = "run"
end function

sub run()
    ' TODO: perform HTTP request using m.top.url
    ' and fill m.top.content with a node tree

    ' For now, just create an empty node so things don't crash.
    contentNode = CreateObject("roSGNode", "ContentNode")
    m.top.content = contentNode
end sub
