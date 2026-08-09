import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, Download, Printer } from "lucide-react";
import { AppNavigation } from "./components/AppNavigation";
import { DailyRecords } from "./components/DailyRecords";
import { Dashboard } from "./components/Dashboard";
import { LoginScreen } from "./components/LoginScreen";
import { PrintReport } from "./components/PrintReport";
import { Profile } from "./components/Profile";
import { ProfileAvatar } from "./components/ProfileAvatar";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { ToastViewport } from "./components/ui/ToastViewport";
import { useConfirm } from "./hooks/useConfirm";
import { useObjectUrl } from "./hooks/useObjectUrl";
import { useToast } from "./hooks/useToast";
import { emptyProfile } from "./lib/defaults";
import { parseBackup } from "./lib/backup";
import { blobToDataUrl, dataUrlToBlob } from "./lib/files";
import { downloadOjtReportPdf } from "./lib/pdf";
import { getStoredValue, setStoredValue, setStoredValues, STORAGE_KEYS } from "./lib/storage";
import type { BackupData, DailyRecord, StudentProfile, Tab, UserAccount } from "./types";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [recordToEdit, setRecordToEdit] = useState<DailyRecord | null>(null);
  const [profileImage, setProfileImage] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, dismissToast } = useToast();
  const { dialog, confirm, accept, cancel } = useConfirm();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const profileImageUrl = useObjectUrl(profileImage);

  useEffect(() => {
    Promise.all([
      getStoredValue<UserAccount | null>(STORAGE_KEYS.user, null),
      getStoredValue<StudentProfile>(STORAGE_KEYS.profile, emptyProfile),
      getStoredValue<DailyRecord[]>(STORAGE_KEYS.records, []),
      getStoredValue<Blob | null>(STORAGE_KEYS.profileImage, null),
    ])
      .then(([savedUser, savedProfile, savedRecords, savedProfileImage]) => {
        setUser(savedUser);
        setProfile(savedProfile);
        setRecords(savedRecords);
        setProfileImage(savedProfileImage);
      })
      .catch(() => showToast("Your saved browser data could not be loaded.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleLogin = useCallback(async (account: UserAccount) => {
    const savedProfile = await getStoredValue<StudentProfile>(STORAGE_KEYS.profile, emptyProfile);
    const nextProfile = {
      ...savedProfile,
      fullName: savedProfile.fullName || account.name,
      email: account.email,
    };
    await Promise.all([
      setStoredValue(STORAGE_KEYS.user, account),
      setStoredValue(STORAGE_KEYS.profile, nextProfile),
    ]);
    setUser(account);
    setProfile(nextProfile);
    showToast("Welcome back. Your logbook is ready.", "success");
  }, [showToast]);

  const handleLoginError = useCallback((message: string) => showToast(message, "error"), [showToast]);
  const clearRecordToEdit = useCallback(() => setRecordToEdit(null), []);

  async function saveRecord(record: DailyRecord, editingId: string | null): Promise<boolean> {
    const approved = await confirm({
      title: editingId ? "Update this daily record?" : "Save this daily record?",
      description: editingId
        ? "The previous information for this date will be replaced with your changes."
        : "Please confirm that the attendance time and activity details are correct.",
      confirmLabel: editingId ? "Update record" : "Save record",
    });
    if (!approved) return false;

    const nextRecords = editingId
      ? records.map((item) => item.id === editingId ? record : item)
      : [record, ...records];
    try {
      await setStoredValue(STORAGE_KEYS.records, nextRecords);
      setRecords(nextRecords);
      showToast(editingId ? "Daily record updated." : "Daily record saved.", "success");
      return true;
    } catch {
      showToast("The record could not be saved. Please try again.", "error");
      return false;
    }
  }

  async function deleteRecord(record: DailyRecord) {
    const approved = await confirm({
      title: "Delete this daily record?",
      description: `“${record.taskTitle}” will be permanently removed from this browser. This action cannot be undone.`,
      confirmLabel: "Delete record",
      tone: "danger",
    });
    if (!approved) return;
    const nextRecords = records.filter((item) => item.id !== record.id);
    await setStoredValue(STORAGE_KEYS.records, nextRecords);
    setRecords(nextRecords);
    setRecordToEdit(null);
    showToast("Daily record deleted.", "success");
  }

  async function saveProfile(): Promise<boolean> {
    const approved = await confirm({
      title: "Save profile changes?",
      description: "These details will be used in your dashboard and printed OJT report.",
      confirmLabel: "Save changes",
    });
    if (!approved) return false;
    await setStoredValue(STORAGE_KEYS.profile, profile);
    showToast("Profile changes saved.", "success");
    return true;
  }

  async function signOut() {
    const approved = await confirm({
      title: "Sign out from this browser?",
      description: "Your OJT records will remain stored on this device, but you will need to sign in again to view them.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (!approved) return;
    await setStoredValue(STORAGE_KEYS.user, null);
    setUser(null);
    setActiveTab("dashboard");
    showToast("You have been signed out.", "info");
  }

  async function exportBackup() {
    try {
      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        user,
        profile,
        records,
        profileImage: profileImage ? { type: profileImage.type, dataUrl: await blobToDataUrl(profileImage) } : null,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `ojt-logbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Backup file exported.", "success");
    } catch {
      showToast("The backup file could not be exported.", "error");
    }
  }

  async function importBackup(file: File): Promise<boolean> {
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Backup too large");
      const backup = parseBackup(await file.text());
      const approved = await confirm({
        title: "Replace data with this backup?",
        description: `This file contains ${backup.records.length} daily record${backup.records.length === 1 ? "" : "s"}. Your current profile and records on this device will be replaced.`,
        confirmLabel: "Import backup",
        tone: "danger",
      });
      if (!approved) return false;
      const importedUser = backup.user || user;
      const importedImage = backup.profileImage?.dataUrl ? dataUrlToBlob(backup.profileImage.dataUrl) : null;
      await setStoredValues([
        [STORAGE_KEYS.user, importedUser],
        [STORAGE_KEYS.profile, backup.profile],
        [STORAGE_KEYS.records, backup.records],
        [STORAGE_KEYS.profileImage, importedImage],
      ]);
      setUser(importedUser);
      setProfile(backup.profile);
      setRecords(backup.records);
      setProfileImage(importedImage);
      showToast("Backup imported successfully.", "success");
      return true;
    } catch {
      showToast("The selected file is not a valid OJT backup.", "error");
      return false;
    }
  }

  async function updateProfileImage(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Choose a JPG, PNG, or WebP image.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Profile images must be smaller than 2 MB.", "error");
      return;
    }
    const approved = await confirm({
      title: profileImage ? "Replace your profile photo?" : "Use this profile photo?",
      description: "The image will be stored only in this browser using IndexedDB and included in future backup files.",
      confirmLabel: profileImage ? "Replace photo" : "Save photo",
    });
    if (!approved) return;
    await setStoredValue(STORAGE_KEYS.profileImage, file);
    setProfileImage(file);
    showToast("Profile photo saved on this device.", "success");
  }

  async function removeProfileImage() {
    const approved = await confirm({
      title: "Remove your profile photo?",
      description: "The saved image will be removed from this browser.",
      confirmLabel: "Remove photo",
      tone: "danger",
    });
    if (!approved) return;
    await setStoredValue(STORAGE_KEYS.profileImage, null);
    setProfileImage(null);
    showToast("Profile photo removed.", "success");
  }

  async function downloadPdf() {
    try {
      await downloadOjtReportPdf({ user: user!, profile, records });
      showToast("PDF report downloaded.", "success");
    } catch {
      showToast("The PDF report could not be created.", "error");
    }
  }

  function editFromDashboard(record: DailyRecord) {
    setRecordToEdit(record);
    setActiveTab("records");
  }

  if (loading) {
    return <main className="loading-screen"><BookOpenCheck size={34} /><p>Opening your logbook…</p></main>;
  }

  return (
    <>
      {!user ? (
        <LoginScreen googleClientId={googleClientId} onLogin={handleLogin} onError={handleLoginError} />
      ) : (
        <div className="app-shell">
          {activeTab === "dashboard" && (
            <header className="topbar print-hide">
              <div className="brand-lockup">
                <ProfileAvatar imageUrl={profileImageUrl} name={profile.fullName || user.name} onSelect={updateProfileImage} />
                <div><p>Personal OJT Logbook</p><h1>{profile.fullName || user.name}</h1></div>
              </div>
              <div className="topbar-actions">
                <button className="icon-button labeled" onClick={downloadPdf} aria-label="Download PDF report" title="Download PDF">
                  <Download size={18} /><span>Download PDF</span>
                </button>
                <button className="icon-button labeled" onClick={() => window.print()} aria-label="Print report" title="Print report">
                  <Printer size={18} /><span>Print</span>
                </button>
              </div>
            </header>
          )}
          <PrintReport user={user} profile={profile} records={records} />
          {activeTab === "dashboard" && <Dashboard records={records} profile={profile} onOpenRecords={() => setActiveTab("records")} onEditRecord={editFromDashboard} />}
          {activeTab === "records" && <DailyRecords records={records} initialRecord={recordToEdit} onInitialRecordHandled={clearRecordToEdit} onSave={saveRecord} onDelete={deleteRecord} onValidationError={(message) => showToast(message, "error")} />}
          {activeTab === "profile" && <Profile profile={profile} onChange={setProfile} onSave={saveProfile} onSignOut={signOut} onExport={exportBackup} onImport={importBackup} onPrint={() => window.print()} profileImageUrl={profileImageUrl} onProfileImageSelect={updateProfileImage} onProfileImageRemove={removeProfileImage} />}
          <AppNavigation activeTab={activeTab} onChange={setActiveTab} />
        </div>
      )}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal dialog={dialog} onCancel={cancel} onConfirm={accept} />
    </>
  );
}

export default App;
