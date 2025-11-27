' DetailsScene.brs - basic stub

function init()
    m.backgroundPoster = m.top.findNode("backgroundPoster")
    m.itemPoster       = m.top.findNode("itemPoster")
    m.titleLabel       = m.top.findNode("titleLabel")
end function

sub onContentChange()
    ' TODO: map m.top.content to the labels/posters
end sub
