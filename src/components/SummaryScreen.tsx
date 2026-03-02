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
  // Split on lines starting with ## (but not ###)
  const parts = text.split(/\n(?=## (?!#))/);

  const intro = parts[0]?.trim() || '';
  const sections: ParsedSection[] = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // First line is "## Title"
    const lines = part.split('\n');
    const titleLine = lines[0].replace(/^##\s*/, '').trim();

    // Rest is content
    const contentLines = lines.slice(1).join('\n').trim();

    // First non-empty line of content as subtitle
    const firstContentLine = contentLines.split('\n').find(l => l.trim().length > 0) || '';
    // Strip markdown formatting for subtitle display
    const subtitle = firstContentLine
      .replace(/^[#*\->\s]+/, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim()
      .substring(0, 120);

    sections.push({
      title: titleLine,
      subtitle,
      content: contentLines,
    });
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
          className="flex flex-col gap-4 animate-fade-in w-full items-center px-4 md:px-8"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
        >
          {/* Banner */}
          <div className="w-full" style={{ maxWidth: 'min(700px, 92vw)' }}>
            <img
              src={bannerSummary}
              alt="החותמת האישית שלך"
              className="w-full rounded-2xl object-cover"
            />
          </div>

          {/* Main card */}
          <div
            className="p-5 md:p-6 rounded-2xl w-full"
            style={{
              maxWidth: 'min(700px, 92vw)',
              background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            {/* Greeting */}
            {firstName && (
              <h1
                className="text-xl md:text-2xl font-bold mb-4 text-center"
                style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
              >
                היי {firstName} 👋
              </h1>
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

                {/* Program accordions */}
                {parsed.sections.length > 0 && (
                  <Accordion type="multiple" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsed.sections.map((section, idx) => (
                      <AccordionItem
                        key={idx}
                        value={`program-${idx}`}
                        className="border rounded-xl px-4 bg-gray-50/60"
                      >
                        <AccordionTrigger className="text-right hover:no-underline py-3">
                          <div className="flex flex-col items-start gap-1 text-right">
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
                    ))}
                  </Accordion>
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
