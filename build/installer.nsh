!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER

Var /GLOBAL ExistingUninstallString
Var /GLOBAL MaintenanceDialog
Var /GLOBAL BtnRepair
Var /GLOBAL BtnUninstall

!macro customInit
  ; Kiem tra registry xem ung dung da duoc cai dat chua
  ReadRegStr $ExistingUninstallString HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${If} $ExistingUninstallString == ""
    ReadRegStr $ExistingUninstallString HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${EndIf}
  ${If} $ExistingUninstallString == ""
    ReadRegStr $ExistingUninstallString HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "UninstallString"
  ${EndIf}
  ${If} $ExistingUninstallString == ""
    ReadRegStr $ExistingUninstallString HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "UninstallString"
  ${EndIf}
!macroend

Function MaintenancePageCreate
  ; Neu chua tung cai dat, bo qua trang bao tri nay
  ${If} $ExistingUninstallString == ""
    Abort
  ${EndIf}

  !ifmacrodef MUI_HEADER_TEXT
    !insertmacro MUI_HEADER_TEXT "Tùy chọn Bảo trì / Cài đặt" "Pears Music / YouTube Music đã được cài đặt trên máy tính"
  !endif

  nsDialogs::Create 1018
  Pop $MaintenanceDialog
  ${If} $MaintenanceDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Hệ thống phát hiện phiên bản Pears Music / YouTube Music đã có sẵn trên máy.$\r$\nVui lòng chọn thao tác bạn muốn thực hiện:"
  Pop $0

  ${NSD_CreateButton} 25u 32u 105u 26u "🛠️ Repair"
  Pop $BtnRepair
  ${NSD_OnClick} $BtnRepair OnRepairClick

  ${NSD_CreateButton} 150u 32u 105u 26u "🗑️ Uninstall"
  Pop $BtnUninstall
  ${NSD_OnClick} $BtnUninstall OnUninstallClick

  ${NSD_CreateLabel} 20u 70u 90% 45u "• Repair: Sửa chữa, cập nhật tệp tin và khôi phục lối tắt ứng dụng.$\r$\n• Uninstall: Khởi chạy trình gỡ cài đặt để xóa ứng dụng khỏi máy tính.$\r$\n• Cancel: Đóng trình cài đặt nếu không muốn thay đổi."
  Pop $0

  ; An nut Next o trang nay de nguoi dung chon truc tiep Repair hoac Uninstall
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 0

  nsDialogs::Show
FunctionEnd

Function OnRepairClick
  ; Bat lai nut Next va chuyen sang trang tiep theo de Repair / Cai de
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
  SendMessage $HWNDPARENT 0x408 1 0 ; Chuyen trang tiep theo
FunctionEnd

Function OnUninstallClick
  Exec '$ExistingUninstallString'
  Quit
FunctionEnd

Function MaintenancePageLeave
  ; Dam bao nut Next duoc kich hoat lai cho cac trang sau
  GetDlgItem $0 $HWNDPARENT 1
  EnableWindow $0 1
FunctionEnd

!macro customWelcomePage
  Page custom MaintenancePageCreate MaintenancePageLeave
!macroend

!endif
