import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/content/landing";

export function FaqSection() {
  return (
    <section id="faq" className="faq section-shell" aria-labelledby="faq-title">
      <header className="section-heading section-heading--compact">
        <span className="section-label">Good to know</span>
        <h2 id="faq-title">Questions before you start.</h2>
      </header>
      <Accordion type="single" collapsible className="faq__list">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.question} value={`item-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent><p>{faq.answer}</p></AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
