import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { GameState, CountsFinal, HollandCode } from '@/types/identity';
import logoKinneret from '@/assets/logo_kinneret.png';
import bannerSummary from '@/assets/banner_summary.webp';
import { Disclaimer } from './Disclaimer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SummaryScreenProps {
  state: GameState;
  countsFinal: CountsFinal;
  leaders: HollandCode[];
  resultText: string | null;
}

/** Shared ReactMarkdown component map */
const MD_COMPONENTS = {
  h1: ({ children }: any) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
  p: ({ children }: any) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-r-4 border-gray-300 pr-4 my-3 italic text-gray-600">
      {children}
    </blockquote>
  ),
};

interface ParsedSection {
  title: string;
  subtitle: string; // first line of content as short description
  content: string;  // full content (markdown)
}

function parseResultText(text: string): { intro: string; sections: ParsedSection[] } {
  // Split on lines starting with ## or ###
  const parts = text.split(/\n(?=#{2,3} )/);

  const intro = parts[0]?.trim() || '';
  const sections: ParsedSection[] = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const lines = part.split('\n');
    const titleLine = lines[0].replace(/^#{2,3}\s*/, '').trim();

    const contentLines = lines.slice(1).join('\n').trim();

    // Check if this section has ### sub-sections (programs)
    const subParts = contentLines.split(/\n(?=### )/);
    
    if (subParts.length > 1) {
      // This ## section contains ### sub-programs — extract each as a separate card
      // First part before any ### is intro text for this section (skip or add to intro)
      const sectionIntro = subParts[0]?.trim();
      if (sectionIntro) {
        // Treat the parent ## as a non-accordion intro paragraph
        // We'll prepend it to the main intro
      }
      
      for (let j = 1; j < subParts.length; j++) {
        const sub = subParts[j].trim();
        if (!sub) continue;
        const subLines = sub.split('\n');
        const subTitle = subLines[0].replace(/^###\s*/, '').trim();
        const subContent = subLines.slice(1).join('\n').trim();
        const firstContentLine = subContent.split('\n').find(l => l.trim().length > 0) || '';
        const subtitle = firstContentLine
          .replace(/^[#*\->\s]+/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim()
          .substring(0, 120);
        sections.push({ title: subTitle, subtitle, content: subContent });
      }
    } else {
      // No sub-sections — this ## is a standalone card
      const firstContentLine = contentLines.split('\n').find(l => l.trim().length > 0) || '';
      const subtitle = firstContentLine
        .replace(/^[#*\->\s]+/, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim()
        .substring(0, 120);
      sections.push({ title: titleLine, subtitle, content: contentLines });
    }
  }

  return { intro, sections };
}

export function SummaryScreen({ state, countsFinal, leaders, resultText }: SummaryScreenProps) {
  const firstName = useMemo(() => {
    const full = state.leadForm?.fullName || '';
    return full.split(' ')[0] || '';
  }, [state.leadForm?.fullName]);

  const parsed = useMemo(() => {
    if (!resultText) return null;
    return parseResultText(resultText);
  }, [resultText]);

  return (
    <div className="summary-screen-overlay" style={{ direction: 'rtl' }}>
      <div className="summary-screen-scroller">
        {/* Logo */}
        <div
          className="flex justify-end py-4 px-4 md:px-8"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <img src={logoKinneret} alt="Kinneret Academy" className="h-16 md:h-20 object-contain" />
        </div>

        {/* Content */}
        <div
          className="flex flex-col gap-4 animate-fade-in w-full items-center"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
        >
          {/* Banner - full width edge-to-edge */}
          <div className="w-full">
            <img
              src={bannerSummary}
              alt="החותמת האישית שלך"
              className="w-full object-cover"
            />
          </div>

          {/* Main card */}
          <div
            className="p-5 md:p-8 w-full"
            style={{
              maxWidth: 'min(800px, 96vw)',
            }}
          >
            {/* Title */}
            <h1
              className="text-2xl md:text-3xl font-bold mb-2 text-center"
              style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
            >
              החותמת האישית שלך
            </h1>

            {/* Greeting */}
            {firstName && (
              <p
                className="text-base mb-4 text-right"
                style={{ color: '#333', fontFamily: "'Rubik', sans-serif" }}
              >
                היי {firstName},
              </p>
            )}

            {parsed ? (
              <div
                className="text-base leading-relaxed"
                style={{
                  color: '#333',
                  fontFamily: "'Rubik', sans-serif",
                  direction: 'rtl',
                  textAlign: 'right',
                }}
              >
                {/* Intro paragraphs */}
                {parsed.intro && (
                  <div className="prose prose-base max-w-none mb-6" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    <ReactMarkdown components={MD_COMPONENTS}>{parsed.intro}</ReactMarkdown>
                  </div>
                )}

                {/* Section header */}
                {parsed.sections.length > 0 && (
                  <h2
                    className="text-xl md:text-2xl font-bold mt-6 mb-4 text-right"
                    style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
                  >
                    תוכניות הלימודים שלך
                  </h2>
                )}

                {/* Program accordions - each in its own card */}
                {parsed.sections.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsed.sections.map((section, idx) => (
                      <Accordion key={idx} type="multiple">
                        <AccordionItem
                          value={`program-${idx}`}
                          className="border rounded-xl px-4 bg-white shadow-sm"
                        >
                          <AccordionTrigger className="text-right hover:no-underline py-4">
                            <div className="flex flex-col items-start gap-1 text-right w-full">
                              <span className="font-bold text-base" style={{ color: '#222' }}>
                                {section.title}
                              </span>
                              <span className="text-sm text-gray-500 line-clamp-1">
                                {section.subtitle}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="prose prose-sm max-w-none" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              <ReactMarkdown components={MD_COMPONENTS}>
                                {section.content}
                              </ReactMarkdown>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm" style={{ color: '#666', fontFamily: "'Rubik', sans-serif" }}>
                  הניתוח יישלח אליך בקרוב
                </p>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mt-6">
            <Disclaimer className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
