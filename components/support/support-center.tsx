"use client";

import { ChevronDown, CreditCard, HelpCircle, Search, UserRound, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { supportFaqs, type SupportCategoryId } from "@/lib/support/knowledge";
import { cn } from "@/lib/utils";

const categories = [
  { id: "general" as const, label: "General", detail: "Using Scripted Fox", icon: HelpCircle },
  { id: "account" as const, label: "Account", detail: "Login and YouTube", icon: UserRound },
  { id: "billing" as const, label: "Billing", detail: "Plans and payments", icon: CreditCard },
  { id: "technical" as const, label: "Technical", detail: "Errors and exports", icon: Wrench },
];

export function SupportCenter({ initialCategory, initialFaq }: { initialCategory?: string; initialFaq?: string; initialView?: string }) {
  const validCategory = categories.some((item) => item.id === initialCategory) ? initialCategory as SupportCategoryId : "general";
  const [category, setCategory] = useState<SupportCategoryId>(validCategory);
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(supportFaqs.some((item) => item.id === initialFaq) ? initialFaq ?? null : null);

  const visibleFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return supportFaqs.filter((faq) => normalized
      ? `${faq.question} ${faq.answer}`.toLowerCase().includes(normalized)
      : faq.category === category);
  }, [category, query]);

  return <div className="dashboard-page support-center">
    <header className="support-hero">
      <div><h1>How can we <span className="support-hero__accent">help</span><span className="support-hero__accent">?</span></h1><p className="support-hero__subtitle">Search for an answer, or continue a conversation without starting over.</p></div>
      <label className="support-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Search help</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search account, billing, YouTube…" /></label>
    </header>

    <div className="support-answer-layout support-answer-layout--complete">
      <nav className="support-categories" aria-label="Help categories">
        {categories.map(({ id, label, detail, icon: Icon }) => <button key={id} className={cn(category === id && !query && "is-active")} onClick={() => { setCategory(id); setQuery(""); }}><Icon size={19} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span></button>)}
      </nav>
      <section className="support-faqs" aria-labelledby="faq-heading">
        <div className="support-section-heading"><div><p>{query ? "Search results" : categories.find((item) => item.id === category)?.label}</p><h2 id="faq-heading">{query ? `Answers for “${query}”` : "Frequently asked questions"}</h2></div><span>{visibleFaqs.length} {visibleFaqs.length === 1 ? "answer" : "answers"}</span></div>
        {visibleFaqs.length ? <div className="support-accordion">{visibleFaqs.map((faq) => {
          const expanded = openFaq === faq.id;
          return <article className={cn("support-faq", expanded && "is-open")} key={faq.id}>
            <button aria-expanded={expanded} aria-controls={`${faq.id}-answer`} onClick={() => setOpenFaq(expanded ? null : faq.id)}><span>{faq.question}</span><ChevronDown size={19} aria-hidden="true" /></button>
            {expanded ? <div className="support-faq__answer" id={`${faq.id}-answer`}><p>{faq.answer}</p></div> : null}
          </article>;
        })}</div> : <div className="support-empty"><Search size={24} /><h3>No matching answers</h3><p>Try a shorter phrase or browse a category.</p></div>}
      </section>
    </div>
  </div>;
}
