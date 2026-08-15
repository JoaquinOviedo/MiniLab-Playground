Option Explicit

Dim shell, fso, appDir, batPath
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(appDir, "iniciar_minilab.bat")

shell.CurrentDirectory = appDir
shell.Run "cmd.exe /d /c """ & batPath & """", 0, False

Set fso = Nothing
Set shell = Nothing
