const clueValues = watch("clues");interface HuntFormProps {
  hunt: HuntDraft;
  onUpdate: (field: string, value: string | number | undefined) => void;
  onRemove: () => void;
  huntId?: number;
  onCluesSaved?: (count: number) => void;
  onImageUploadStateChange?: (state: CoverImageUploadState) => void;
  /** Called after a clue reorder so the parent can trigger draft auto-save. */
  onClueReorder?: () => void;
}"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpDown, Eye, EyeOff, Minus, Plus, Trash2 } from "lucide-react";
import React, { ChangeEvent, useCallback, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
...