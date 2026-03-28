function GetScene(node as Object) as Object
    while node <> invalid and node.subtype() <> "Scene"
        node = node.getParent()
    end while
    return node
end function

function FormatTime(seconds as Integer) as String
    m = int(seconds / 60)
    s = seconds mod 60
    return m.toStr() + ":" + s.toStr().padLeft(2, "0")
end function
