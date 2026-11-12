; Override the Tauri 2.12.3 macros included before installerHooks.
; Register Open With support without changing extension defaults or UserChoice.
!include LogicLib.nsh
!macroundef APP_ASSOCIATE
!macro APP_ASSOCIATE EXT FILECLASS DESCRIPTION ICON COMMANDTEXT COMMAND
  WriteRegStr SHCTX "Software\Classes\${FILECLASS}" "" `${DESCRIPTION}`
  WriteRegStr SHCTX "Software\Classes\${FILECLASS}\DefaultIcon" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr SHCTX "Software\Classes\${FILECLASS}\shell" "" "open"
  WriteRegStr SHCTX "Software\Classes\${FILECLASS}\shell\open" "" `${COMMANDTEXT}`
  WriteRegStr SHCTX "Software\Classes\${FILECLASS}\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "${FILECLASS}" ""
  !insertmacro UPDATEFILEASSOC
!macroend
!macroundef APP_UNASSOCIATE
!macro APP_UNASSOCIATE EXT FILECLASS
  Push $R0
  ReadRegStr $R0 SHCTX "Software\Classes\${FILECLASS}\shell\open\command" ""
  ${If} $R0 == '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
    DeleteRegValue SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "${FILECLASS}"
    DeleteRegKey /ifempty SHCTX "Software\Classes\.${EXT}\OpenWithProgids"
    ReadRegStr $R0 SHCTX "Software\Classes\.${EXT}" ""
    ${If} $R0 == "${FILECLASS}"
      DeleteRegValue SHCTX "Software\Classes\.${EXT}" ""
    ${EndIf}
    DeleteRegKey /ifempty SHCTX "Software\Classes\.${EXT}"
    DeleteRegKey SHCTX "Software\Classes\${FILECLASS}"
  ${EndIf}
  Pop $R0
  !insertmacro UPDATEFILEASSOC
!macroend
