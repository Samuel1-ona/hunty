"use client";

import * as React from "react";
import {
  useFormContext,
  Controller,
  FormProvider,
  type FieldValues,
  type ControllerProps,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

const Form = FormProvider;

interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  if (!fieldContext) throw new Error("useFormField must be used within <FormField>");
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  return { name: fieldContext.name, ...fieldState };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { error, name } = useFormField();
  return (
    <label
      htmlFor={name}
      className={cn(
        "text-sm font-medium leading-none",
        error && "text-destructive",
        className
      )}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Input>) {
  const { error, name } = useFormField();
  return (
    <Input
      id={name}
      aria-invalid={!!error}
      aria-describedby={error ? `${name}-error` : undefined}
      className={cn(error && "border-destructive focus-visible:ring-destructive/30")}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, name } = useFormField();
  if (!error?.message) return null;
  return (
    <p
      id={`${name}-error`}
      role="alert"
      aria-live="polite"
      className={cn("flex items-center gap-1.5 text-sm text-destructive", className)}
      {...props}
    >
      <AlertCircle className="size-3.5 shrink-0" />
      {error.message}
    </p>
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { name } = useFormField();
  return (
    <p
      id={`${name}-desc`}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

interface FormErrorSummaryProps {
  errors: Record<string, { message?: string }>;
  className?: string;
}

function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const entries = Object.entries(errors).filter(([, v]) => v?.message);
  if (entries.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive",
        className
      )}
    >
      <p className="font-medium mb-1">Please fix the following errors:</p>
      <ul className="list-disc pl-5 space-y-0.5">
        {entries.map(([field, err]) => (
          <li key={field}>{err.message}</li>
        ))}
      </ul>
    </div>
  );
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  FormErrorSummary,
  useFormField,
};
