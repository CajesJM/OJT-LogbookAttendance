import { ChangeEvent, useRef } from "react";
import { Camera, UserRound } from "lucide-react";

type Props = {
  imageUrl: string | null;
  name: string;
  onSelect: (file: File) => void;
  size?: "small" | "large";
  disabled?: boolean;
};

export function ProfileAvatar({
  imageUrl,
  name,
  onSelect,
  size = "small",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    event.target.value = "";
  }

  return (
    <div className={`profile-avatar ${size}`}>
      <button
        type="button"
        className="avatar-button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label={disabled ? "Profile photo" : "Upload profile photo"}
        title={
          disabled ? "Select Edit to change photo" : "Upload profile photo"
        }
      >
        {imageUrl ? (
          <img src={imageUrl} alt={`${name}'s profile`} loading="lazy" />
        ) : (
          <UserRound size={size === "large" ? 34 : 22} aria-hidden="true" />
        )}
        <span className="avatar-camera">
          <Camera size={size === "large" ? 17 : 13} aria-hidden="true" />
        </span>
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={selectFile}
        disabled={disabled}
      />
    </div>
  );
}
