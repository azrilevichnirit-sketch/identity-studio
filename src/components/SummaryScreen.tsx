import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { GameState, CountsFinal, HollandCode } from '@/types/identity';
import logoKinneret from '@/assets/logo_kinneret.png';
import bannerSummary from '@/assets/banner_summary.webp';
import { Disclaimer } from './Disclaimer';
import { ChevronDown } from 'lucide-react';

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
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-[1.75]">{children}</p>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-r-4 pr-4 my-3 italic" style={{ borderColor: '#2D7BE5', color: '#3A4A5E' }}>
      {children}
    </blockquote>
  ),
};

interface ParsedSection {
  title: string;
  subtitle: string;
  content: string;
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
    blocks.push({ title: currentTitle, subtitle: toSubtitle(blockContent), content: blockContent });
  };

  for (const line of lines) {
    const match = line.trim().match(/^\*\*(.+?)\*\*$/);
    if (match) {
      pushCurrent();
      currentTitle = match[1].trim();
      currentContent = [];
      continue;
    }
    if (currentTitle) currentContent.push(line);
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
    if (!sectionHeader) sectionHeader = titleLine;

    const subParts = contentLines ? contentLines.split(/\n(?=###\s+)/) : [];
    const h3Sections = subParts
      .map((sub) => sub.trim())
      .filter((sub) => sub.startsWith('### '))
      .map((sub) => {
        const subLines = sub.split('\n');
        const subTitle = subLines[0].replace(/^###\s*/, '').trim();
        const subContent = subLines.slice(1).join('\n').trim();
        return { title: subTitle, subtitle: toSubtitle(subContent), content: subContent };
      })
      .filter((s) => s.title && s.content);

    if (h3Sections.length > 0) {
      const lastH3End = contentLines.lastIndexOf(h3Sections[h3Sections.length - 1].content) + h3Sections[h3Sections.length - 1].content.length;
      const trailing = contentLines.substring(lastH3End).trim();
      if (trailing) outro = trailing;
      sections.push(...h3Sections);
      continue;
    }

    const boldSections = splitByBoldHeadings(contentLines);
    if (boldSections.length > 1) {
      const lastBoldContent = boldSections[boldSections.length - 1].content;
      const lastBoldEnd = contentLines.lastIndexOf(lastBoldContent) + lastBoldContent.length;
      const trailing = contentLines.substring(lastBoldEnd).trim();
      if (trailing) outro = trailing;
      sections.push(...boldSections);
      continue;
    }

    if (headingParts.length > 1 && i === 0 && !contentLines) continue;
    if (headingParts.length > 1 && i > 0) {
      sections.push({ title: titleLine, subtitle: toSubtitle(contentLines), content: contentLines });
      continue;
    }
    if (contentLines) {
      sections.push({ title: titleLine, subtitle: toSubtitle(contentLines), content: contentLines });
    }
  }

  if (!outro && sections.length > 0) {
    const lastSection = sections[sections.length - 1];
    const cLines = lastSection.content.split('\n');
    const paragraphs: string[][] = [];
    let current: string[] = [];
    for (const line of cLines) {
      if (line.trim() === '') {
        if (current.length > 0) { paragraphs.push(current); current = []; }
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) paragraphs.push(current);

    if (paragraphs.length >= 2) {
      const lastParagraph = paragraphs[paragraphs.length - 1].join('\n').trim();
      const isClosing = !lastParagraph.startsWith('-') && !lastParagraph.startsWith('*') && !lastParagraph.startsWith('#');
      if (isClosing && lastParagraph.length > 20 && lastParagraph.length < 200) {
        outro = lastParagraph;
        const outroStart = lastSection.content.lastIndexOf(lastParagraph);
        lastSection.content = lastSection.content.substring(0, outroStart).trim();
      }
    }
  }

  return { intro, sectionHeader, sections, outro };
}

/** Expandable program card */
function ProgramCard({ section, index }: { section: ParsedSection; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden"
      style={{
        background: isOpen
          ? 'linear-gradient(135deg, #EEF4FC 0%, #E3EEFB 100%)'
          : 'linear-gradient(135deg, #F7FAFF 0%, #F0F5FC 100%)',
        border: isOpen ? '1.5px solid #2D7BE5' : '1.5px solid #D6E3F0',
        boxShadow: isOpen
          ? '0 8px 24px rgba(45, 123, 229, 0.15)'
          : '0 2px 8px rgba(0,0,0,0.04)',
      }}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 md:p-5">
        {/* Number badge */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            background: isOpen
              ? 'linear-gradient(135deg, #2D7BE5, #1A5FC4)'
              : 'linear-gradient(135deg, #D6E3F0, #C4D6EA)',
            color: isOpen ? '#FFF' : '#6B8AAE',
          }}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <h3 className="font-bold text-base md:text-lg" style={{ color: '#2D2418' }}>
            {section.title}
          </h3>
          {!isOpen && section.subtitle && (
            <p className="text-sm mt-0.5 line-clamp-1" style={{ color: '#7A8FA6' }}>
              {section.subtitle}...
            </p>
          )}
        </div>

        <ChevronDown
          className="flex-shrink-0 transition-transform duration-300"
          style={{
            color: isOpen ? '#2D7BE5' : '#9BB3CC',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            width: 20,
            height: 20,
          }}
        />
      </div>

      {/* Content */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? '1200px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-4 md:px-5 pb-5 pt-0">
          <div
            className="h-px mb-4"
            style={{ background: 'linear-gradient(to left, transparent, #2D7BE540, transparent)' }}
          />
          <div
            className="prose prose-sm max-w-none text-right"
            style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#3D3427' }}
          >
            <ReactMarkdown components={MD_COMPONENTS}>{section.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
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
        {/* Banner */}
        <div className="w-full relative">
          <img
            src={bannerSummary}
            alt="החותמת האישית שלך"
            className="block w-full object-cover"
          />
          {/* Gradient fade into content */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{ background: 'linear-gradient(to top, #F7FAFF, transparent)' }}
          />
        </div>

        {/* Content area */}
        <div
          className="flex flex-col gap-0 animate-fade-in w-full items-center"
          style={{
            background: 'linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 30%)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          }}
        >
          {/* Logo + Title row */}
          <div className="w-full px-4 md:px-8 pt-2" style={{ maxWidth: 'min(860px, 96vw)' }}>
            <div className="flex justify-start mb-2">
              <img src={logoKinneret} alt="Kinneret Academy" className="h-32 md:h-40 object-contain" />
            </div>

            {/* Title with decorative line */}
            <div className="flex flex-col items-center mb-6" style={{ marginTop: '-8px' }}>
              <h1
                className="text-2xl md:text-[32px] font-extrabold text-center leading-tight"
                style={{ color: '#2D2418', fontFamily: "'Rubik', sans-serif" }}
              >
                החותמת האישית שלך
              </h1>
              <div
                className="mt-3 h-1 rounded-full"
                style={{
                  width: '60px',
                  background: 'linear-gradient(to left, #2D7BE5, #1A5FC4)',
                }}
              />
            </div>
          </div>

          {/* Main content card */}
          <div
            className="w-full px-4 md:px-8"
            style={{ maxWidth: 'min(860px, 96vw)' }}
          >
            {/* Greeting */}
            {firstName && (
              <p
                className="text-lg mb-5 text-right font-medium"
                style={{ color: '#4A3D2E', fontFamily: "'Rubik', sans-serif" }}
              >
                היי {firstName},
              </p>
            )}

            {parsed ? (
              <div
                className="text-base leading-relaxed"
                style={{
                  color: '#3D3427',
                  fontFamily: "'Rubik', sans-serif",
                  direction: 'rtl',
                  textAlign: 'right',
                }}
              >
                {/* Intro */}
                {parsed.intro && (
                  <div
                    className="prose prose-base max-w-none mb-8"
                    style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.85' }}
                  >
                    <ReactMarkdown components={MD_COMPONENTS}>{parsed.intro}</ReactMarkdown>
                  </div>
                )}

                {/* Section header */}
                {parsed.sections.length > 0 && (
                  <div className="flex items-center gap-3 mb-5 mt-2">
                    <div
                      className="w-1 h-7 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(to bottom, #2D7BE5, #1A5FC4)' }}
                    />
                    <h2
                      className="text-xl md:text-2xl font-bold"
                      style={{ color: '#2D2418', fontFamily: "'Rubik', sans-serif" }}
                    >
                      {parsed.sectionHeader || 'כיווני הלימוד שמתאימים לך'}
                    </h2>
                  </div>
                )}

                {/* Program cards */}
                {parsed.sections.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {parsed.sections.map((section, idx) => {
                      const isSameAsHeader = section.title === parsed.sectionHeader;
                      const displaySection = isSameAsHeader
                        ? { ...section, title: section.subtitle, subtitle: '' }
                        : section;
                      return <ProgramCard key={idx} section={displaySection} index={idx} />;
                    })}
                  </div>
                )}

                {/* Outro */}
                {parsed.outro && (
                  <div
                    className="mt-8 p-5 rounded-2xl text-center"
                    style={{
                       background: 'linear-gradient(135deg, #EEF4FC 0%, #E3EEFB 100%)',
                       border: '1px solid #D6E3F0',
                    }}
                  >
                    <div className="prose prose-base max-w-none" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#4A3D2E' }}>
                      <ReactMarkdown components={MD_COMPONENTS}>{parsed.outro}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-4 animate-pulse"
                  style={{ background: 'linear-gradient(135deg, #F0E6D6, #E8DCC8)' }}
                />
                <p className="text-sm" style={{ color: '#8B7D6B', fontFamily: "'Rubik', sans-serif" }}>
                  הניתוח יישלח אליך בקרוב
                </p>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mt-10 px-4">
            <Disclaimer className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
