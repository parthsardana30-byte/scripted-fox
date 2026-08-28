"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ideaSchema, type IdeaInput } from "@/lib/landing-schema";

type LandingIntentResponse = { destination?: string; error?: string };

export function IdeaComposer({ id = "idea" }: { id?: string }) {
  const router = useRouter();
  const [characterCount, setCharacterCount] = useState(0);
  const [handoffError, setHandoffError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IdeaInput>({ resolver: zodResolver(ideaSchema), mode: "onBlur", defaultValues: { idea: "" } });

  const ideaField = register("idea");

  const onSubmit = async ({ idea }: IdeaInput) => {
    setHandoffError("");
    try {
      const response = await fetch("/api/landing-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await response.json() as LandingIntentResponse;

      if (!response.ok || !data.destination) {
        setHandoffError(data.error ?? "We could not save your idea. Please try again.");
        return;
      }

      router.push(data.destination);
    } catch {
      setHandoffError("We could not save your idea. Check your connection and try again.");
    }
  };

  return (
    <form className="idea-composer" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="idea-composer__intro">
        <label htmlFor={id}>Start with your video idea</label>
        <p>Share the topic, angle, and who it is for. You can shape every detail in the editor.</p>
      </div>
      <textarea
        id={id}
        placeholder="Example: Compare five free editing tools by using each one on the same short video"
        aria-invalid={Boolean(errors.idea)}
        aria-describedby={`${id}-helper`}
        maxLength={280}
        {...ideaField}
        onChange={(event) => {
          ideaField.onChange(event);
          setCharacterCount(event.target.value.length);
        }}
      />
      <div className="idea-composer__footer">
        <p id={`${id}-helper`} className={errors.idea || handoffError ? "field-message field-message--error" : "field-message"}>
          {errors.idea?.message || handoffError || `${characterCount}/280 characters`}
        </p>
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          <span>{isSubmitting ? "Preparing…" : "Create my script"}</span>
          <ArrowRight aria-hidden="true" size={17} />
        </Button>
      </div>
    </form>
  );
}
