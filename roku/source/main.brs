' main.brs – entry point for Crate TV

sub main()
    print "CrateTV main(): starting"

    screen = CreateObject("roSGScreen")
    port   = CreateObject("roMessagePort")
    screen.setMessagePort(port)

    ' Create your main scene (HomeScene must match components/HomeScene.xml name)
    scene = screen.CreateScene("HomeScene")
    if scene = invalid then
        print "CrateTV main(): FAILED to create HomeScene (scene is invalid!)"
    else
        print "CrateTV main(): HomeScene created successfully"
    end if

    screen.show()
    print "CrateTV main(): screen shown, entering event loop"

    ' MAIN EVENT LOOP – this keeps the app alive
    while true
        msg = wait(0, port)
        if msg <> invalid then
            msgType = type(msg)
            print "CrateTV main(): got message of type "; msgType

            if msgType = "roSGScreenEvent" then
                if msg.isScreenClosed() then
                    print "CrateTV main(): screen closed, exiting main"
                    return
                end if
            end if
        else
            print "CrateTV main(): wait() returned invalid message"
        end if
    end while
end sub
