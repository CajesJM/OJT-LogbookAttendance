import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, FilePlus2, Search, Trash2, X } from "lucide-react";
import { createEmptyRecord } from "../lib/defaults";
import { calculateHours, formatDate, formatHours } from "../lib/format";
import type { DailyRecord } from "../types";
import { SignaturePad } from "./SignaturePad";

type Props = {
  records: DailyRecord[];
  initialRecord: DailyRecord | null;
  onInitialRecordHandled: () => void;
  onSave: (record: DailyRecord, editingId: string | null) => Promise<boolean>;
  onDelete: (record: DailyRecord) => Promise<void>;
  onValidationError: (message: string) => void;
};

const REFLECTION_LIMIT = 250;
const RECORDS_PER_PAGE = 5;

function normalizeRecord(record: DailyRecord): DailyRecord {
  return {
    ...record,
    reflection: (record.reflection || "").slice(0, REFLECTION_LIMIT),
  };
}

export function DailyRecords({
  records,
  initialRecord,
  onInitialRecordHandled,
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
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    if (!initialRecord) return;
    scrollPositionRef.current = window.scrollY;
    setDraft(normalizeRecord(initialRecord));
    setEditingId(initialRecord.id);
    onInitialRecordHandled();
  }, [initialRecord, onInitialRecordHandled]);

  useEffect(() => {
    if (!editingId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") resetForm();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingId]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...records]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((record) => {
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
  }, [records, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const displayedPage = Math.min(currentPage, pageCount);
  const paginatedRecords = filteredRecords.slice(
    (displayedPage - 1) * RECORDS_PER_PAGE,
    displayedPage * RECORDS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

  function resetForm() {
    const scrollPosition = scrollPositionRef.current;
    setDraft(createEmptyRecord());
    setEditingId(null);
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
    if (saved) resetForm();
  }

  function beginEdit(record: DailyRecord) {
    scrollPositionRef.current = window.scrollY;
    setDraft(normalizeRecord(record));
    setEditingId(record.id);
  }

  const formSurface = (
      <section
        className={`surface record-form-surface${editingId ? " edit-record-modal" : ""}`}
        role={editingId ? "dialog" : undefined}
        aria-modal={editingId ? "true" : undefined}
        aria-labelledby={editingId ? "edit-record-title" : undefined}
      >
        <div className="section-head">
          <div>
            <p className="section-kicker">Attendance + logbook</p>
            <h2 id={editingId ? "edit-record-title" : undefined}>
              {editingId ? "Edit daily record" : "New daily record"}
            </h2>
          </div>
          {editingId && (
            <button className="icon-button labeled" onClick={resetForm}>
              <X size={18} /> Cancel
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
      {editingId && (
        <div
          className="modal-backdrop edit-record-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) resetForm();
          }}
        >
          {formSurface}
        </div>
      )}
      <main className="page-content records-layout">
      {!editingId && formSurface}

      <section className="surface records-surface">
        <div className="section-head records-head">
          <div>
            <p className="section-kicker">Your history</p>
            <h2>
              Saved records{" "}
              <span className="count-badge">{records.length}</span>
            </h2>
          </div>
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
        <div className="record-list">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">
              <Search size={28} />
              <h3>
                {records.length ? "No matching records" : "No records yet"}
              </h3>
              <p>
                {records.length
                  ? "Try a different search term."
                  : "Complete the form to add your first entry."}
              </p>
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <article key={record.id} className="record-card">
                <div className="record-card-head">
                  <div>
                    <p className="record-date">{formatDate(record.date)}</p>
                    <h3>{record.taskTitle}</h3>
                    <span>
                      {record.timeIn}–{record.timeOut} ·{" "}
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
              </article>
            ))
          )}
        </div>
        {pageCount > 1 && (
          <nav className="records-pagination" aria-label="Saved records pages">
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
            <span>Page <b>{displayedPage}</b> of {pageCount}</span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
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
          <img src={record.signature} alt="Saved signature" />
        </div>
      )}
    </div>
  );
}
