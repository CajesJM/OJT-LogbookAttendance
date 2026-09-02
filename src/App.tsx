import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BookOpenCheck, Download, Printer } from "lucide-react";
import { AppNavigation } from "./components/AppNavigation";
import { LoginScreen } from "./components/LoginScreen";
import { ProfileAvatar } from "./components/ProfileAvatar";
import { ConfirmModal } from "./components/ui/ConfirmModal";
import { ToastViewport } from "./components/ui/ToastViewport";

// Lazy load heavy components and modals
const Dashboard = lazy(() =>
  import("./components/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const DailyRecords = lazy(() =>
  import("./components/DailyRecords").then((m) => ({
    default: m.DailyRecords,
  })),
);
const Profile = lazy(() =>
  import("./components/Profile").then((m) => ({ default: m.Profile })),
);
const PrintReport = lazy(() =>
  import("./components/PrintReport").then((m) => ({ default: m.PrintReport })),
);
const ImageCropModal = lazy(() =>
  import("./components/ui/ImageCropModal").then((m) => ({
    default: m.ImageCropModal,
  })),
);
const BackupReminderModal = lazy(() =>
  import("./components/ui/BackupReminderModal").then((m) => ({
    default: m.BackupReminderModal,
  })),
);
const ReportOptionsModal = lazy(() =>
  import("./components/ui/ReportOptionsModal").then((m) => ({
    default: m.ReportOptionsModal,
  })),
);

// Type imports only
import type {
  ReportAction,
  ReportFormat,
} from "./components/ui/ReportOptionsModal";
import { useConfirm } from "./hooks/useConfirm";
import { useObjectUrl } from "./hooks/useObjectUrl";
import { useToast } from "./hooks/useToast";
import { emptyProfile, normalizeProfile } from "./lib/defaults";
import { parseBackup } from "./lib/backup";
import { createCredentials, verifyCredentials } from "./lib/auth";
import {
  createBackupSnooze,
  EMPTY_BACKUP_REMINDER,
  getBackupReminderStatus,
} from "./lib/backupReminder";
import { blobToDataUrl, dataUrlToBlob } from "./lib/files";
import { downloadOjtReportPdf } from "./lib/pdf";
import { downloadOjtReportDocx } from "./lib/docx";
import {
  getStoredValue,
  clearStoredData,
  setStoredValue,
  setStoredValues,
  STORAGE_KEYS,
} from "./lib/storage";
import type {
  BackupData,
  BackupReminderState,
  DailyRecord,
  LoginRateLimit,
  LocalCredentials,
  PaperSizeId,
  StudentProfile,
  Tab,
  UserAccount,
  ReportTemplate,
} from "./types";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 60 * 1000;
const EMPTY_LOGIN_RATE_LIMIT: LoginRateLimit = {
  failedAttempts: 0,
  lockedUntil: null,
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const prevTabRef = useRef<Tab>("dashboard");
  const TAB_ORDER: Tab[] = ["dashboard", "records", "profile"];
  const slideDir =
    TAB_ORDER.indexOf(activeTab) > TAB_ORDER.indexOf(prevTabRef.current)
      ? "left"
      : "right";
  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [recordToEdit, setRecordToEdit] = useState<DailyRecord | null>(null);
  const [openNewRecord, setOpenNewRecord] = useState(false);
  const [profileImage, setProfileImage] = useState<Blob | null>(null);
  const [pendingProfileImage, setPendingProfileImage] = useState<File | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [hasLocalAccount, setHasLocalAccount] = useState(false);
  const [loginRateLimit, setLoginRateLimit] = useState<LoginRateLimit>(
    EMPTY_LOGIN_RATE_LIMIT,
  );
  const [backupReminder, setBackupReminder] = useState<BackupReminderState>(
    EMPTY_BACKUP_REMINDER,
  );
  const [backupClock, setBackupClock] = useState(Date.now());
  const [reportAction, setReportAction] = useState<ReportAction | null>(null);
  const [separateReportMonths, setSeparateReportMonths] = useState(false);
  const [reportFormat, setReportFormat] = useState<ReportFormat>("pdf");
  const [reportTemplate, setReportTemplate] =
    useState<ReportTemplate>("detailed");
  const [reportPaperSize, setReportPaperSize] =
    useState<PaperSizeId>("a4");
  const { toasts, showToast, dismissToast } = useToast();
  const { dialog, confirm, accept, cancel } = useConfirm();
  const profileImageUrl = useObjectUrl(profileImage);
  const backupStatus = getBackupReminderStatus(
    records,
    backupReminder,
    backupClock,
  );

  useEffect(() => {
    // Defer timer to avoid blocking main thread
    const timeout = window.setTimeout(() => {
      const interval = window.setInterval(
        () => setBackupClock(Date.now()),
        60 * 1000,
      );
      // Store cleanup for proper disposal
      return () => window.clearInterval(interval);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Defer data loading to avoid blocking initial render
    const loadData = async () => {
      try {
        const [
          savedUser,
          savedProfile,
          savedRecords,
          savedProfileImage,
          savedCredentials,
          savedLoginRateLimit,
          savedBackupReminder,
        ] = await Promise.all([
          getStoredValue<UserAccount | null>(STORAGE_KEYS.user, null),
          getStoredValue<StudentProfile>(STORAGE_KEYS.profile, emptyProfile),
          getStoredValue<DailyRecord[]>(STORAGE_KEYS.records, []),
          getStoredValue<Blob | null>(STORAGE_KEYS.profileImage, null),
          getStoredValue<LocalCredentials | null>(
            STORAGE_KEYS.credentials,
            null,
          ),
          getStoredValue<LoginRateLimit>(
            STORAGE_KEYS.loginRateLimit,
            EMPTY_LOGIN_RATE_LIMIT,
          ),
          getStoredValue<BackupReminderState>(
            STORAGE_KEYS.backupReminder,
            EMPTY_BACKUP_REMINDER,
          ),
        ]);

        setUser(savedUser);
        setProfile(normalizeProfile(savedProfile));
        setRecords(savedRecords);
        setProfileImage(savedProfileImage);
        setHasLocalAccount(Boolean(savedCredentials));
        setLoginRateLimit(savedLoginRateLimit);
        setBackupReminder(savedBackupReminder);
      } catch {
        showToast("Your saved browser data could not be loaded.", "error");
      } finally {
        setLoading(false);
      }
    };

    // Use requestIdleCallback for non-critical loading
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => loadData(), { timeout: 1000 });
    } else {
      setTimeout(loadData, 0);
    }
  }, [showToast]);

  const handleLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const [savedCredentials, savedProfile, savedLoginRateLimit] =
          await Promise.all([
            getStoredValue<LocalCredentials | null>(
              STORAGE_KEYS.credentials,
              null,
            ),
            getStoredValue<StudentProfile>(STORAGE_KEYS.profile, emptyProfile),
            getStoredValue<LoginRateLimit>(
              STORAGE_KEYS.loginRateLimit,
              EMPTY_LOGIN_RATE_LIMIT,
            ),
          ]);
        const isNewAccount = savedCredentials === null;
        const now = Date.now();
        if (
          !isNewAccount &&
          savedLoginRateLimit.lockedUntil &&
          savedLoginRateLimit.lockedUntil > now
        ) {
          setLoginRateLimit(savedLoginRateLimit);
          const seconds = Math.ceil(
            (savedLoginRateLimit.lockedUntil - now) / 1000,
          );
          showToast(
            `Too many incorrect attempts. Try again in ${Math.ceil(seconds / 60)} minute${seconds > 60 ? "s" : ""}.`,
            "error",
          );
          return false;
        }
        const activeRateLimit = savedLoginRateLimit.lockedUntil
          ? EMPTY_LOGIN_RATE_LIMIT
          : savedLoginRateLimit;
        const credentials =
          savedCredentials || (await createCredentials(username, password));
        if (
          !isNewAccount &&
          !(await verifyCredentials(credentials, username, password))
        ) {
          const failedAttempts = activeRateLimit.failedAttempts + 1;
          const attemptsRemaining = MAX_LOGIN_ATTEMPTS - failedAttempts;
          const nextRateLimit: LoginRateLimit =
            attemptsRemaining <= 0
              ? {
                  failedAttempts: MAX_LOGIN_ATTEMPTS,
                  lockedUntil: now + LOGIN_LOCK_DURATION_MS,
                }
              : { failedAttempts, lockedUntil: null };
          await setStoredValue(STORAGE_KEYS.loginRateLimit, nextRateLimit);
          setLoginRateLimit(nextRateLimit);
          showToast(
            attemptsRemaining <= 0
              ? "Too many incorrect attempts. Sign-in is paused for 60 seconds."
              : `Incorrect username or password. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
            "error",
          );
          return false;
        }

        const account: UserAccount = {
          id: credentials.username,
          name: username.trim(),
        };
        const nextProfile = {
          ...normalizeProfile(savedProfile),
          fullName: isNewAccount
            ? account.name
            : savedProfile.fullName || account.name,
        };
        await setStoredValues([
          [STORAGE_KEYS.credentials, credentials],
          [STORAGE_KEYS.user, account],
          [STORAGE_KEYS.profile, nextProfile],
          [STORAGE_KEYS.loginRateLimit, EMPTY_LOGIN_RATE_LIMIT],
        ]);
        setUser(account);
        setProfile(nextProfile);
        setHasLocalAccount(true);
        setLoginRateLimit(EMPTY_LOGIN_RATE_LIMIT);
        showToast(
          isNewAccount
            ? "Your local account is ready."
            : "Welcome back. Your logbook is ready.",
          "success",
        );
        return true;
      } catch {
        showToast("Sign in could not be completed.", "error");
        return false;
      }
    },
    [showToast],
  );

  const handleLoginError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );
  const clearRecordToEdit = useCallback(() => setRecordToEdit(null), []);
  const clearNewRecordRequest = useCallback(() => setOpenNewRecord(false), []);

  async function saveRecord(
    record: DailyRecord,
    editingId: string | null,
  ): Promise<boolean> {
    const approved = await confirm({
      title: editingId
        ? "Update this daily record?"
        : "Save this daily record?",
      description: editingId
        ? "The previous information for this date will be replaced with your changes."
        : "Please confirm that the attendance time and activity details are correct.",
      confirmLabel: editingId ? "Update record" : "Save record",
    });
    if (!approved) return false;

    const nextRecords = editingId
      ? records.map((item) => (item.id === editingId ? record : item))
      : [record, ...records];
    try {
      await setStoredValue(STORAGE_KEYS.records, nextRecords);
      setRecords(nextRecords);
      showToast(
        editingId ? "Daily record updated." : "Daily record saved.",
        "success",
      );
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
      description:
        "These details will be used in your dashboard and printed OJT report.",
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
      description:
        "Your OJT records will remain stored on this device, but you will need to sign in again to view them.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (!approved) return;
    await setStoredValue(STORAGE_KEYS.user, null);
    setUser(null);
    navigateTo("dashboard");
    showToast("You have been signed out.", "info");
  }

  async function clearLocalBrowserData(): Promise<boolean> {
    try {
      await clearStoredData();
      setUser(null);
      setProfile(emptyProfile);
      setRecords([]);
      setProfileImage(null);
      setRecordToEdit(null);
      navigateTo("dashboard");
      setHasLocalAccount(false);
      setLoginRateLimit(EMPTY_LOGIN_RATE_LIMIT);
      setBackupReminder(EMPTY_BACKUP_REMINDER);
      showToast("Local account and browser data deleted.", "success");
      return true;
    } catch {
      showToast(
        "Browser data could not be deleted. Please try again.",
        "error",
      );
      return false;
    }
  }

  async function exportBackup() {
    try {
      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        user,
        profile,
        records,
        profileImage: profileImage
          ? {
              type: profileImage.type,
              dataUrl: await blobToDataUrl(profileImage),
            }
          : null,
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `ojt-logbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const nextBackupReminder: BackupReminderState = {
        lastBackupAt: new Date().toISOString(),
        snoozedUntil: null,
      };
      await setStoredValue(STORAGE_KEYS.backupReminder, nextBackupReminder);
      setBackupReminder(nextBackupReminder);
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
      const importedImage = backup.profileImage?.dataUrl
        ? dataUrlToBlob(backup.profileImage.dataUrl)
        : null;
      const nextBackupReminder: BackupReminderState = {
        lastBackupAt: new Date().toISOString(),
        snoozedUntil: null,
      };
      await setStoredValues([
        [STORAGE_KEYS.user, importedUser],
        [STORAGE_KEYS.profile, backup.profile],
        [STORAGE_KEYS.records, backup.records],
        [STORAGE_KEYS.profileImage, importedImage],
        [STORAGE_KEYS.backupReminder, nextBackupReminder],
      ]);
      setUser(importedUser);
      setProfile(backup.profile);
      setRecords(backup.records);
      setProfileImage(importedImage);
      setBackupReminder(nextBackupReminder);
      showToast("Backup imported successfully.", "success");
      return true;
    } catch {
      showToast("The selected file is not a valid OJT backup.", "error");
      return false;
    }
  }

  async function selectProfileImage(file: File): Promise<void> {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Choose a JPG, PNG, or WebP image.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("Choose an image smaller than 10 MB.", "error");
      return;
    }
    setPendingProfileImage(file);
  }

  async function saveCroppedProfileImage(file: File) {
    const approved = await confirm({
      title: profileImage
        ? "Replace your profile photo?"
        : "Use this profile photo?",
      description:
        "The image will be stored only in this browser using IndexedDB and included in future backup files.",
      confirmLabel: profileImage ? "Replace photo" : "Save photo",
    });
    if (!approved) return;
    try {
      await setStoredValue(STORAGE_KEYS.profileImage, file);
      setProfileImage(file);
      setPendingProfileImage(null);
      showToast("Profile photo saved on this device.", "success");
    } catch {
      showToast("The profile photo could not be saved.", "error");
    }
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

  async function snoozeBackupReminder() {
    try {
      const nextBackupReminder = {
        ...backupReminder,
        snoozedUntil: createBackupSnooze(),
      };
      await setStoredValue(STORAGE_KEYS.backupReminder, nextBackupReminder);
      setBackupReminder(nextBackupReminder);
      showToast("Backup reminder snoozed for 12 hours.", "info");
    } catch {
      showToast("The backup reminder could not be snoozed.", "error");
    }
  }

  async function downloadPdf(separateByMonth = separateReportMonths) {
    try {
      await downloadOjtReportPdf({
        user: user!,
        profile,
        records,
        separateByMonth,
        template: reportTemplate,
        paperSize: reportPaperSize,
      });
      showToast("PDF report downloaded.", "success");
    } catch {
      showToast("The PDF report could not be created.", "error");
    }
  }

  function createReport() {
    const action = reportAction;
    setReportAction(null);
    if (action === "download") {
      if (reportFormat === "docx") {
        void downloadDocx(separateReportMonths);
      } else {
        void downloadPdf(separateReportMonths);
      }
      return;
    }
    if (action === "print") window.setTimeout(() => window.print(), 0);
  }

  async function downloadDocx(separateByMonth = separateReportMonths) {
    try {
      await downloadOjtReportDocx({
        user: user!,
        profile,
        records,
        separateByMonth,
        template: reportTemplate,
        paperSize: reportPaperSize,
      });
      showToast("Word report downloaded.", "success");
    } catch {
      showToast("The Word report could not be created.", "error");
    }
  }

  function navigateTo(tab: Tab) {
    prevTabRef.current = activeTab;
    setActiveTab(tab);
  }

  function editFromDashboard(record: DailyRecord) {
    setRecordToEdit(record);
    navigateTo("records");
  }

  function addDailyRecord() {
    setRecordToEdit(null);
    setOpenNewRecord(true);
    navigateTo("records");
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <BookOpenCheck size={34} />
        <p>Opening your logbook…</p>
      </main>
    );
  }

  return (
    <>
      {!user ? (
        <LoginScreen
          onLogin={handleLogin}
          onError={handleLoginError}
          hasLocalAccount={hasLocalAccount}
          lockedUntil={loginRateLimit.lockedUntil}
          onClearData={clearLocalBrowserData}
        />
      ) : (
        <div className="app-shell">
          <div className="tab-viewport">
            <div key={activeTab} className="tab-panel" data-dir={slideDir}>
              {activeTab === "dashboard" && (
                <header className="topbar print-hide">
                  <div className="brand-lockup">
                    <ProfileAvatar
                      imageUrl={profileImageUrl}
                      name={profile.fullName || user.name}
                      onSelect={selectProfileImage}
                    />
                    <div>
                      <p>Personal OJT Logbook</p>
                      <h1>{profile.fullName || user.name}</h1>
                    </div>
                  </div>
                  <div className="topbar-actions">
                    <button
                      className="icon-button labeled"
                      onClick={() => setReportAction("download")}
                      aria-label="Download report"
                      title="Download report"
                    >
                      <Download size={18} />
                      <span>Download report</span>
                    </button>
                    <button
                      className="icon-button labeled"
                      onClick={() => setReportAction("print")}
                      aria-label="Print report"
                      title="Print report"
                    >
                      <Printer size={18} />
                      <span>Print</span>
                    </button>
                  </div>
                </header>
              )}
              <Suspense
                fallback={
                  <div className="loading-fallback">Loading report...</div>
                }
              >
                <PrintReport
                  user={user}
                  profile={profile}
                  records={records}
                  separateByMonth={separateReportMonths}
                  template={reportTemplate}
                  paperSize={reportPaperSize}
                />
              </Suspense>
              {activeTab === "dashboard" && (
                <Suspense
                  fallback={
                    <div className="loading-fallback">Loading dashboard...</div>
                  }
                >
                  <Dashboard
                    records={records}
                    profile={profile}
                    onOpenRecords={() => navigateTo("records")}
                    onEditRecord={editFromDashboard}
                    showBackupReminder={backupStatus.isDue}
                    onExportBackup={exportBackup}
                    onSnoozeBackup={snoozeBackupReminder}
                  />
                </Suspense>
              )}
              {activeTab === "records" && (
                <Suspense
                  fallback={
                    <div className="loading-fallback">Loading records...</div>
                  }
                >
                  <DailyRecords
                    records={records}
                    initialRecord={recordToEdit}
                    openNewRecord={openNewRecord}
                    onInitialRecordHandled={clearRecordToEdit}
                    onNewRecordHandled={clearNewRecordRequest}
                    onSave={saveRecord}
                    onDelete={deleteRecord}
                    onValidationError={(message) => showToast(message, "error")}
                  />
                </Suspense>
              )}
              {activeTab === "profile" && (
                <Suspense
                  fallback={
                    <div className="loading-fallback">Loading profile...</div>
                  }
                >
                  <Profile
                    profile={profile}
                    onChange={setProfile}
                    onSave={saveProfile}
                    onSignOut={signOut}
                    onExport={exportBackup}
                    onImport={importBackup}
                    onPrint={() => setReportAction("print")}
                    profileImageUrl={profileImageUrl}
                    onProfileImageSelect={selectProfileImage}
                    onProfileImageRemove={removeProfileImage}
                  />
                </Suspense>
              )}
            </div>
          </div>
          <AppNavigation
            activeTab={activeTab}
            onChange={navigateTo}
            onAddRecord={addDailyRecord}
          />
          {reportAction && (
            <Suspense fallback={null}>
              <ReportOptionsModal
                action={reportAction}
                separateByMonth={separateReportMonths}
                format={reportFormat}
                template={reportTemplate}
                paperSize={reportPaperSize}
                onSeparateByMonthChange={setSeparateReportMonths}
                onFormatChange={setReportFormat}
                onTemplateChange={setReportTemplate}
                onPaperSizeChange={setReportPaperSize}
                onCancel={() => setReportAction(null)}
                onConfirm={createReport}
              />
            </Suspense>
          )}
          {pendingProfileImage && (
            <Suspense fallback={null}>
              <ImageCropModal
                file={pendingProfileImage}
                onCancel={() => setPendingProfileImage(null)}
                onApply={saveCroppedProfileImage}
              />
            </Suspense>
          )}
          {activeTab === "dashboard" && backupStatus.isSignificantlyOverdue && (
            <Suspense fallback={null}>
              <BackupReminderModal
                open={
                  activeTab === "dashboard" &&
                  backupStatus.isSignificantlyOverdue
                }
                onExport={exportBackup}
                onSnooze={snoozeBackupReminder}
              />
            </Suspense>
          )}
        </div>
      )}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal dialog={dialog} onCancel={cancel} onConfirm={accept} />
    </>
  );
}

export default App;
