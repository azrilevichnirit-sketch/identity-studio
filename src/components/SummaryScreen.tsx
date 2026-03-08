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
  p: ({ children }: any) => <p className="mb-1.5 last:mb-0">{children}</p>,
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

function toSubtitle(content: string): string {
  const firstContentLine = content.split('\n').find((l) => l.trim().length > 0) || '';
  return firstContentLine
    .replace(/^[#*\->\s]+/, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim()
    .substring(0, 120);
}

function splitByBoldHeadings(content: string): ParsedSection[] {
  const lines = content.split('\n');
  const blocks: ParsedSection[] = [];

  let currentTitle = '';
  let currentContent: string[] = [];

  const pushCurrent = () => {
    if (!currentTitle) return;
    const blockContent = currentContent.join('\n').trim();
    blocks.push({
      title: currentTitle,
      subtitle: toSubtitle(blockContent),
      content: blockContent,
    });
  };

  for (const line of lines) {
    const match = line.trim().match(/^\*\*(.+?)\*\*$/);
    if (match) {
      pushCurrent();
      currentTitle = match[1].trim();
      currentContent = [];
      continue;
    }

    if (currentTitle) {
      currentContent.push(line);
    }
  }

  pushCurrent();
  return blocks.filter((b) => b.title && b.content);
}

function parseResultText(text: string): { intro: string; sectionHeader: string; sections: ParsedSection[]; outro: string } {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const parts = normalized.split(/\n(?=##\s+(?!#))/);

  const intro = parts[0]?.startsWith('## ') ? '' : (parts[0]?.trim() || '');
  const headingParts = parts[0]?.startsWith('## ') ? parts : parts.slice(1);

  let sectionHeader = '';
  const sections: ParsedSection[] = [];
  let outro = '';

  for (let i = 0; i < headingParts.length; i++) {
    const part = headingParts[i].trim();
    if (!part) continue;

    const lines = part.split('\n');
    if (!lines[0]?.startsWith('## ')) continue;

    const titleLine = lines[0].replace(/^##\s*/, '').trim();
    const contentLines = lines.slice(1).join('\n').trim();

    if (!sectionHeader) {
      sectionHeader = titleLine;
    }

    // 1) Preferred: ### headings
    const subParts = contentLines ? contentLines.split(/\n(?=###\s+)/) : [];
    const h3Sections = subParts
      .map((sub) => sub.trim())
      .filter((sub) => sub.startsWith('### '))
      .map((sub) => {
        const subLines = sub.split('\n');
        const subTitle = subLines[0].replace(/^###\s*/, '').trim();
        const subContent = subLines.slice(1).join('\n').trim();
        return {
          title: subTitle,
          subtitle: toSubtitle(subContent),
          content: subContent,
        };
      })
      .filter((s) => s.title && s.content);

    if (h3Sections.length > 0) {
      // Check if there's trailing content after the last ### section (outro)
      const lastH3End = contentLines.lastIndexOf(h3Sections[h3Sections.length - 1].content) + h3Sections[h3Sections.length - 1].content.length;
      const trailing = contentLines.substring(lastH3End).trim();
      if (trailing) {
        outro = trailing;
      }
      sections.push(...h3Sections);
      continue;
    }

    // 2) Fallback: bold program headings (**...**)
    const boldSections = splitByBoldHeadings(contentLines);
    if (boldSections.length > 1) {
      // Check for trailing content after the last bold section
      const lastBoldContent = boldSections[boldSections.length - 1].content;
      const lastBoldEnd = contentLines.lastIndexOf(lastBoldContent) + lastBoldContent.length;
      const trailing = contentLines.substring(lastBoldEnd).trim();
      if (trailing) {
        outro = trailing;
      }
      sections.push(...boldSections);
      continue;
    }

    // 3) Multiple ## blocks => blocks after the first are programs
    if (headingParts.length > 1 && i === 0 && !contentLines) {
      continue;
    }
    if (headingParts.length > 1 && i > 0) {
      sections.push({ title: titleLine, subtitle: toSubtitle(contentLines), content: contentLines });
      continue;
    }

    // 4) Single block fallback
    if (contentLines) {
      sections.push({ title: titleLine, subtitle: toSubtitle(contentLines), content: contentLines });
    }
  }

  // Also check: if the last section's content ends with a standalone paragraph
  // that looks like a closing statement, extract it as outro
  if (!outro && sections.length > 0) {
    const lastSection = sections[sections.length - 1];
    const contentLines = lastSection.content.split('\n');
    // Find last non-empty paragraph block (separated by blank lines)
    const paragraphs: string[][] = [];
    let current: string[] = [];
    for (const line of contentLines) {
      if (line.trim() === '') {
        if (current.length > 0) {
          paragraphs.push(current);
          current = [];
        }
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) paragraphs.push(current);

    // If the last paragraph doesn't contain list items or headers, and the section has multiple paragraphs
    if (paragraphs.length >= 2) {
      const lastParagraph = paragraphs[paragraphs.length - 1].join('\n').trim();
      const isClosing = !lastParagraph.startsWith('-') && !lastParagraph.startsWith('*') && !lastParagraph.startsWith('#');
      if (isClosing && lastParagraph.length > 20 && lastParagraph.length < 200) {
        outro = lastParagraph;
        // Remove the outro from the last section's content
        const outroStart = lastSection.content.lastIndexOf(lastParagraph);
        lastSection.content = lastSection.content.substring(0, outroStart).trim();
      }
    }
  }

  return { intro, sectionHeader, sections, outro };
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
        {/* Banner - always first, edge-to-edge */}
        <div className="w-full">
          <img
            src={bannerSummary}
            alt="החותמת האישית שלך"
            className="block w-full object-cover"
          />
        </div>

        {/* Content */}
        <div
          className="flex flex-col gap-4 animate-fade-in w-full items-center"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
        >
          {/* Logo */}
          <div className="flex justify-start pt-2 px-4 md:px-8 w-full">
            <img src={logoKinneret} alt="Kinneret Academy" className="h-24 md:h-28 object-contain" />
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
              style={{ color: '#111', fontFamily: "'Rubik', sans-serif", marginTop: '0' }}
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

                {/* Section header - from ## in content, or fallback */}
                {parsed.sections.length > 0 && (
                  <h2
                    className="text-xl md:text-2xl font-bold mt-6 mb-4 text-right"
                    style={{ color: '#111', fontFamily: "'Rubik', sans-serif" }}
                  >
                    {parsed.sectionHeader || 'כיווני הלימוד שמתאימים לך'}
                  </h2>
                )}

                {/* Program accordions - each in its own card */}
                {parsed.sections.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsed.sections.map((section, idx) => {
                      // If section title equals the section header, use subtitle as the display title
                      const isSameAsHeader = section.title === parsed.sectionHeader;
                      const displayTitle = isSameAsHeader ? section.subtitle : section.title;
                      const displaySubtitle = isSameAsHeader ? '' : section.subtitle;

                      return (
                        <Accordion key={idx} type="multiple">
                          <AccordionItem
                            value={`program-${idx}`}
                            className="border rounded-xl px-4 bg-white shadow-sm"
                          >
                            <AccordionTrigger className="text-right hover:no-underline py-4">
                              <div className="flex flex-col items-start gap-1 text-right w-full">
                                <span className="font-bold text-base" style={{ color: '#222' }}>
                                  {displayTitle}
                                </span>
                                {displaySubtitle && (
                                  <span className="text-sm text-gray-500 line-clamp-1">
                                    {displaySubtitle}
                                  </span>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="prose prose-sm max-w-none" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                <ReactMarkdown components={MD_COMPONENTS}>
                                  {/* Remove duplicate first line that matches subtitle */}
                                  {(() => {
                                    const lines = section.content.split('\n');
                                    const firstContentIdx = lines.findIndex((l) => l.trim().length > 0);
                                    if (firstContentIdx >= 0 && displaySubtitle) {
                                      const firstLine = lines[firstContentIdx]
                                        .replace(/^[#*\->\s]+/, '')
                                        .replace(/\*\*/g, '')
                                        .replace(/\*/g, '')
                                        .trim();
                                      if (displaySubtitle.startsWith(firstLine.substring(0, 40)) || firstLine.startsWith(displaySubtitle.substring(0, 40))) {
                                        const filtered = [...lines];
                                        filtered.splice(firstContentIdx, 1);
                                        return filtered.join('\n').trim();
                                      }
                                    }
                                    return section.content;
                                  })()}
                                </ReactMarkdown>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      );
                    })}
                  </div>
                )}

                {/* Outro / closing statement */}
                {parsed.outro && (
                  <div className="prose prose-base max-w-none mt-6" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    <ReactMarkdown components={MD_COMPONENTS}>{parsed.outro}</ReactMarkdown>
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
