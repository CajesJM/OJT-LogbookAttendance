import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FilePlus2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createEmptyRecord } from "../lib/defaults";
import {
  calculateHours,
  formatDate,
  formatDayName,
  formatHours,
  formatTime12Hour,
} from "../lib/format";
import type { DailyRecord } from "../types";
import { SignaturePad } from "./SignaturePad";

type Props = {
  records: DailyRecord[];
  initialRecord: DailyRecord | null;
  openNewRecord: boolean;
  onInitialRecordHandled: () => void;
  onNewRecordHandled: () => void;
  onSave: (record: DailyRecord, editingId: string | null) => Promise<boolean>;
  onDelete: (record: DailyRecord) => Promise<void>;
  onValidationError: (message: string) => void;
};

const REFLECTION_LIMIT = 250;
const RECORDS_PER_PAGE = 5;

type DayGroup = {
  date: string;
  totalHours: number;
  records: DailyRecord[];
};

function normalizeRecord(record: DailyRecord): DailyRecord {
  return {
    ...record,
    reflection: (record.reflection || "").slice(0, REFLECTION_LIMIT),
  };
}

export function DailyRecords({
  records,
  initialRecord,
  openNewRecord,
  onInitialRecordHandled,
  onNewRecordHandled,
  onSave,
  onDelete,
  onValidationError,
}: Props) {
  const [draft, setDraft] = useState<DailyRecord>(() =>
    initialRecord ? normalizeRecord(initialRecord) : createEmptyRecord(),
  );
  const [editingId, setEditingId] = useState<string | null>(
    initialRecord?.id || null,
  );
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const isModalOpen = Boolean(editingId || isAddingRecord);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [activeMonth, setActiveMonth] = useState("all");
  const [recordsExiting, setRecordsExiting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollPositionRef = useRef(0);
  const monthChangeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!initialRecord) return;
    scrollPositionRef.current = window.scrollY;
    setIsClosingModal(false);
    setDraft(normalizeRecord(initialRecord));
    setEditingId(initialRecord.id);
    setIsAddingRecord(false);
    onInitialRecordHandled();
  }, [initialRecord, onInitialRecordHandled]);

  useEffect(() => {
    if (!openNewRecord) return;
    scrollPositionRef.current = window.scrollY;
    setIsClosingModal(false);
    setDraft(createEmptyRecord());
    setEditingId(null);
    setIsAddingRecord(true);
    onNewRecordHandled();
  }, [openNewRecord, onNewRecordHandled]);

  useEffect(() => {
    if (!isModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isModalOpen, isClosingModal]);

  const monthOptions = useMemo(() => {
    const months = [
      ...new Set(
        records.map((record) => record.date.slice(0, 7)).filter(Boolean),
      ),
    ].sort((a, b) => b.localeCompare(a));
    return months.map((value) => ({
      value,
      label: new Date(`${value}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...records]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((record) => {
        if (activeMonth !== "all" && !record.date.startsWith(activeMonth))
          return false;
        if (!query) return true;
        return [
          record.date,
          record.taskTitle,
          record.activities,
          record.skillsLearned,
          record.challenges,
          record.reflection,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [records, search, activeMonth]);
  const groupedDays = useMemo(() => {
    const groups: DayGroup[] = [];
    const map = new Map<string, DailyRecord[]>();

    for (const record of filteredRecords) {
      const list = map.get(record.date) || [];
      list.push(record);
      map.set(record.date, list);
    }

    for (const [date, list] of map.entries()) {
      list.sort((a, b) => (a.timeIn || "").localeCompare(b.timeIn || ""));
      const totalHours = list.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      groups.push({ date, totalHours, records: list });
    }

    return groups;
  }, [filteredRecords]);

  const pageCount = Math.max(
    1,
    Math.ceil(groupedDays.length / RECORDS_PER_PAGE),
  );
  const displayedPage = Math.min(currentPage, pageCount);
  const paginatedGroups = groupedDays.slice(
    (displayedPage - 1) * RECORDS_PER_PAGE,
    displayedPage * RECORDS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeMonth]);

  useEffect(() => {
    if (
      selectedMonth !== "all" &&
      !monthOptions.some((month) => month.value === selectedMonth)
    ) {
      setSelectedMonth("all");
      setActiveMonth("all");
    }
  }, [monthOptions, selectedMonth]);

  useEffect(
    () => () => {
      if (monthChangeTimerRef.current !== null)
        window.clearTimeout(monthChangeTimerRef.current);
    },
    [],
  );

  function changeMonth(nextMonth: string) {
    if (nextMonth === selectedMonth) return;
    setSelectedMonth(nextMonth);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActiveMonth(nextMonth);
      setCurrentPage(1);
      return;
    }
    setRecordsExiting(true);
    if (monthChangeTimerRef.current !== null)
      window.clearTimeout(monthChangeTimerRef.current);
    monthChangeTimerRef.current = window.setTimeout(() => {
      setActiveMonth(nextMonth);
      setCurrentPage(1);
      setRecordsExiting(false);
      monthChangeTimerRef.current = null;
    }, 320);
  }

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  function update<K extends keyof DailyRecord>(key: K, value: DailyRecord[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "timeIn" || key === "timeOut")
        next.totalHours = calculateHours(next.timeIn, next.timeOut);
      return next;
    });
  }

  function closeModal() {
    if (isClosingModal) return;
    if (!isModalOpen) {
      resetFormState();
      return;
    }
    setIsClosingModal(true);
    setTimeout(() => {
      resetFormState();
      setIsClosingModal(false);
    }, 220);
  }

  function resetFormState() {
    const scrollPosition = scrollPositionRef.current;
    setDraft(createEmptyRecord());
    setEditingId(null);
    setIsAddingRecord(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPosition, behavior: "auto" });
      });
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !draft.date ||
      !draft.timeIn ||
      !draft.timeOut ||
      !draft.taskTitle.trim()
    ) {
      onValidationError(
        "Complete the date, time-in, time-out, and task title.",
      );
      return;
    }

    const existingRecordsOnDate = records.filter(
      (r) => r.date === draft.date && r.id !== editingId,
    );
    if (existingRecordsOnDate.length >= 2) {
      onValidationError(
        `Maximum limit of 2 attendance entries per day (Morning and Afternoon shifts) reached for ${formatDate(draft.date)}.`,
      );
      return;
    }

    const saved = await onSave(
      {
        ...draft,
        taskTitle: draft.taskTitle.trim(),
        reflection: (draft.reflection || "").trim().slice(0, REFLECTION_LIMIT),
        totalHours: calculateHours(draft.timeIn, draft.timeOut),
        updatedAt: new Date().toISOString(),
      },
      editingId,
    );
    if (saved) closeModal();
  }

  function beginEdit(record: DailyRecord) {
    scrollPositionRef.current = window.scrollY;
    setIsClosingModal(false);
    setDraft(normalizeRecord(record));
    setEditingId(record.id);
    setIsAddingRecord(false);
  }

  const formSurface = (
    <section
      className={`surface record-form-surface${isModalOpen ? " edit-record-modal" : ""}${isClosingModal ? " is-closing" : ""}`}
      role={isModalOpen ? "dialog" : undefined}
      aria-modal={isModalOpen ? "true" : undefined}
      aria-labelledby={isModalOpen ? "edit-record-title" : undefined}
    >
      <div className="section-head">
        <div>
          <p className="section-kicker">Attendance + logbook</p>
          <h2 id={isModalOpen ? "edit-record-title" : undefined}>
            {editingId ? "Edit daily record" : "New daily record"}
          </h2>
        </div>
        {isModalOpen && (
          <button
            className="icon-button labeled"
            type="button"
            onClick={closeModal}
          >
            <X size={18} />
          </button>
        )}
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>
          <span>Date</span>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => update("date", e.target.value)}
            required
          />
        </label>
        <label>
          <span>Time-in</span>
          <input
            type="time"
            value={draft.timeIn}
            onChange={(e) => update("timeIn", e.target.value)}
            required
          />
        </label>
        <label>
          <span>Time-out</span>
          <input
            type="time"
            value={draft.timeOut}
            onChange={(e) => update("timeOut", e.target.value)}
            required
          />
        </label>
        <label>
          <span>Total hours</span>
          <input
            className="calculated-field"
            value={formatHours(draft.totalHours)}
            readOnly
          />
        </label>
        <label className="full">
          <span>Task title or main activity</span>
          <input
            value={draft.taskTitle}
            onChange={(e) => update("taskTitle", e.target.value)}
            placeholder="E.g., Assisted in software testing"
            required
          />
        </label>
        <div className="record-notes-grid full">
          <label className="reflection-field">
            <span className="field-label">
              Reflection
              <small>Optional</small>
            </span>
            <textarea
              maxLength={REFLECTION_LIMIT}
              value={draft.reflection || ""}
              onChange={(event) =>
                update(
                  "reflection",
                  event.target.value.slice(0, REFLECTION_LIMIT),
                )
              }
              placeholder="Briefly reflect on what you learned today"
            />
            <small className="character-count">
              {(draft.reflection || "").length}/{REFLECTION_LIMIT}
            </small>
          </label>
          <SignaturePad
            value={draft.signature || ""}
            onChange={(value) => update("signature", value)}
          />
        </div>
        <button className="button primary full" type="submit">
          <FilePlus2 size={18} /> {editingId ? "Update" : "Save"}
        </button>
      </form>
    </section>
  );

  return (
    <>
      {isModalOpen && (
        <div
          className={`modal-backdrop edit-record-backdrop${isClosingModal ? " is-closing" : ""}`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeModal();
          }}
        >
          {formSurface}
        </div>
      )}
      <main className="page-content records-layout">
        <div className="inline-record-form">{!isModalOpen && formSurface}</div>

        <section className="surface records-surface">
          <div className="section-head records-head">
            <div className="records-title-row">
              <div>
                <p className="section-kicker">Your history</p>
                <h2>
                  Saved records{" "}
                  <span className="count-badge">{records.length}</span>
                </h2>
              </div>
            </div>
            <div className="records-filter-bar">
              {monthOptions.length > 1 && (
                <div className="month-filter">
                  <CalendarDays size={17} aria-hidden="true" />
                  <select
                    value={selectedMonth}
                    onChange={(event) => {
                      changeMonth(event.target.value);
                    }}
                    aria-label="Filter records by month"
                  >
                    <option value="all">All months</option>
                    {monthOptions.map((month) => (
                      <option value={month.value} key={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="search-box">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search records"
                  aria-label="Search records"
                />
              </div>
            </div>
          </div>
          <div
            className={`record-list records-animated${recordsExiting ? " records-exiting" : ""}`}
            key={`${activeMonth}-${displayedPage}`}
          >
            {filteredRecords.length === 0 ? (
              <div className="empty-state">
                <Search size={28} />
                <h3>
                  {records.length ? "No matching records" : "No records yet"}
                </h3>
                <p>
                  {records.length
                    ? "Try another search term or month."
                    : "Complete the form to add your first entry."}
                </p>
              </div>
            ) : (
              paginatedGroups.map((group) => (
                <article
                  key={group.date}
                  className="record-card day-group-card"
                >
                  <div className="day-group-head">
                    <div className="day-group-title">
                      <div>
                        <p className="record-date">
                          {formatDayName(group.date)}, {formatDate(group.date)}
                        </p>
                      </div>
                      <div className="day-group-metrics">
                        <span className="day-group-hours">
                          {formatHours(group.totalHours)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="day-group-shifts">
                    {group.records.map((record) => (
                      <div key={record.id} className="shift-item">
                        <div className="record-card-head shift-item-head">
                          <div>
                            <h3>{record.taskTitle}</h3>
                            <span>
                              {formatTime12Hour(record.timeIn)}–
                              {formatTime12Hour(record.timeOut)} ·{" "}
                              {formatHours(record.totalHours)}
                            </span>
                          </div>
                          <div className="record-actions print-hide">
                            <button
                              className="icon-button"
                              onClick={() => beginEdit(record)}
                              aria-label={`Edit ${record.taskTitle}`}
                              title="Edit record"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="icon-button danger-icon"
                              onClick={() => onDelete(record)}
                              aria-label={`Delete ${record.taskTitle}`}
                              title="Delete record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <RecordDetails record={record} />
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
          {pageCount > 1 && (
            <nav
              className="records-pagination"
              aria-label="Saved records pages"
            >
              <button
                className="icon-button"
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={displayedPage === 1}
                aria-label="Previous page"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page <b>{displayedPage}</b> of {pageCount}
              </span>
              <button
                className="icon-button"
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(pageCount, page + 1))
                }
                disabled={displayedPage === pageCount}
                aria-label="Next page"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </section>
      </main>
    </>
  );
}

function RecordDetails({ record }: { record: DailyRecord }) {
  const details = [
    ["Activities", record.activities],
    ["Skills learned", record.skillsLearned],
    ["Challenges", record.challenges],
    ["Reflection", record.reflection],
  ].filter(([, value]) => value);
  if (!details.length && !record.signature) return null;
  return (
    <div className="record-details">
      {details.map(([label, value]) => (
        <p key={label}>
          <strong>{label}</strong>
          <span>{value}</span>
        </p>
      ))}
      {record.signature && (
        <div className="saved-signature">
          <strong>Signature</strong>
          <img src={record.signature} alt="Saved signature" loading="lazy" />
        </div>
      )}
    </div>
  );
}
