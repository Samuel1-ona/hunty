interface HuntFormProps {
  hunt: HuntDraft;
  onUpdate: (field: string, value: string | number | undefined) => void;
  onRemove: () => void;
  huntId?: number;
  onCluesSaved?: (count: number) => void;
  onImageUploadStateChange?: (state: CoverImageUploadState) => void;
  /** Called after a clue reorder so the parent can trigger draft auto-save. */
  onClueReorder?: () => void;
}onChange={(e: ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.value.trim();
  onUpdate("maxParticipants", raw === "" ? undefined : Number(raw));
}}