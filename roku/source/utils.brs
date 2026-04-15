' ##############################################################################
' CRATE TV - Shared Utility Functions
' Common functions used across multiple components
' ##############################################################################

' =============================================================================
' REGISTRY HELPER FUNCTIONS
' =============================================================================
Function RegistryRead(key as String, section as String) as Dynamic
    registry = CreateObject("roRegistrySection", section)
    If registry.Exists(key)
        return registry.Read(key)
    End If
    return Invalid
End Function

Function RegistryWrite(key as String, value as String, section as String) as Boolean
    registry = CreateObject("roRegistrySection", section)
    registry.Write(key, value)
    return registry.Flush()
End Function

Function RegistryDelete(key as String, section as String) as Boolean
    registry = CreateObject("roRegistrySection", section)
    registry.Delete(key)
    return registry.Flush()
End Function

Function IsDeviceLinked() as Boolean
    regConfig = GetRegistryConfig()
    linkedStatus = RegistryRead(regConfig.KEY_DEVICE_LINKED, regConfig.SECTION)
    return linkedStatus <> Invalid And linkedStatus = "true"
End Function

Sub SetDeviceLinked(linked as Boolean)
    regConfig = GetRegistryConfig()
    If linked
        RegistryWrite(regConfig.KEY_DEVICE_LINKED, "true", regConfig.SECTION)
    Else
        RegistryDelete(regConfig.KEY_DEVICE_LINKED, regConfig.SECTION)
    End If
End Sub

Function GetStoredAuthToken() as Dynamic
    regConfig = GetRegistryConfig()
    return RegistryRead(regConfig.KEY_AUTH_TOKEN, regConfig.SECTION)
End Function

Sub StoreAuthToken(token as String)
    regConfig = GetRegistryConfig()
    RegistryWrite(regConfig.KEY_AUTH_TOKEN, token, regConfig.SECTION)
End Sub

' =============================================================================
' WATCH POSITION MANAGEMENT
' =============================================================================
Function GetLastWatchPosition(contentId as String) as Integer
    regConfig = GetRegistryConfig()
    key = regConfig.KEY_LAST_POSITION + "_" + contentId
    position = RegistryRead(key, regConfig.SECTION)
    If position <> Invalid
        return Val(position)
    End If
    return 0
End Function

Sub SaveWatchPosition(contentId as String, position as Integer)
    regConfig = GetRegistryConfig()
    key = regConfig.KEY_LAST_POSITION + "_" + contentId
    RegistryWrite(key, Str(position), regConfig.SECTION)
End Sub

Sub ClearWatchPosition(contentId as String)
    regConfig = GetRegistryConfig()
    key = regConfig.KEY_LAST_POSITION + "_" + contentId
    RegistryDelete(key, regConfig.SECTION)
End Sub

' =============================================================================
' TIME UTILITIES
' =============================================================================
Function GetCurrentTimestamp() as LongInteger
    dateTime = CreateObject("roDateTime")
    return dateTime.AsSeconds()
End Function

Function ParseISOTimestamp(isoString as String) as LongInteger
    ' Parse ISO 8601 timestamp (e.g., "2024-01-15T20:00:00Z")
    If isoString = Invalid Or isoString = ""
        return 0
    End If
    
    dateTime = CreateObject("roDateTime")
    dateTime.FromISO8601String(isoString)
    return dateTime.AsSeconds()
End Function

Function FormatDuration(seconds as Integer) as String
    hours = Int(seconds / 3600)
    minutes = Int((seconds Mod 3600) / 60)
    secs = seconds Mod 60
    
    If hours > 0
        return Str(hours).Trim() + "h " + Str(minutes).Trim() + "m"
    Else If minutes > 0
        return Str(minutes).Trim() + "m " + Str(secs).Trim() + "s"
    Else
        return Str(secs).Trim() + "s"
    End If
End Function

' =============================================================================
' SAFE VALUE HELPERS
' =============================================================================
Function SafeString(value as Dynamic) as String
    If value = Invalid
        return ""
    End If
    If Type(value) = "roString" Or Type(value) = "String"
        return value
    End If
    return ""
End Function

Function SafeInt(value as Dynamic, defaultVal as Integer) as Integer
    If value = Invalid
        return defaultVal
    End If
    If Type(value) = "roInt" Or Type(value) = "roInteger" Or Type(value) = "Integer"
        return value
    End If
    If Type(value) = "roString" Or Type(value) = "String"
        return Val(value)
    End If
    return defaultVal
End Function

Function SafeBool(value as Dynamic, defaultVal as Boolean) as Boolean
    If value = Invalid
        return defaultVal
    End If
    If Type(value) = "roBoolean" Or Type(value) = "Boolean"
        return value
    End If
    If Type(value) = "roString" Or Type(value) = "String"
        return LCase(value) = "true"
    End If
    return defaultVal
End Function


' =============================================================================
' URL NORMALIZATION
' =============================================================================
' Roku is strict about URLs: spaces must be percent-encoded, and stray control chars
' will break image/video loading. This helper keeps it lightweight and safe.
Function NormalizeUrl(url as Dynamic) as String
    u = SafeString(url)
    If u = "" Then Return ""

    ' Trim and remove CR/LF
    u = u.Trim()
    u = u.Replace(Chr(10), "")
    u = u.Replace(Chr(13), "")

    ' CRITICAL FOR ROKU: Replace + with %20
    ' S3 URLs from the API use + to represent spaces in object keys.
    ' Web browsers treat + as space in paths, but Roku's HTTP stack sends
    ' the + character LITERALLY, causing S3 to return 404.
    ' We MUST convert + to %20 for Roku to load these resources.
    u = u.Replace("+", "%20")
    
    ' Also encode any raw spaces
    u = u.Replace(" ", "%20")
    
    ' Encode apostrophes (can cause issues in some HTTP stacks)
    u = u.Replace("'", "%27")

    ' Avoid accidental double-encoding
    u = u.Replace("%2520", "%20")

    Return u
End Function
