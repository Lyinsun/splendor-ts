import { CircleHelp, Sparkles, ScrollText, LayoutGrid, HelpCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Locale } from './presentation/themes';

export type HelpTab = 'quickStart' | 'rules' | 'uiGuide' | 'faq';

const TUTORIAL_SEEN_KEY = 'splendor-monsters-seen-tutorial';

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
}

export function clearTutorialSeen(): void {
  localStorage.removeItem(TUTORIAL_SEEN_KEY);
}

type AppCopy = Record<string, unknown>;

export function HelpModal(props: {
  open: boolean;
  initialTab?: HelpTab;
  locale: Locale;
  copy: AppCopy;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<HelpTab>(props.initialTab ?? 'quickStart');

  useEffect(() => {
    if (props.open) {
      setActiveTab(props.initialTab ?? 'quickStart');
    }
  }, [props.open, props.initialTab]);

  useEffect(() => {
    if (!props.open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [props.open, props.onClose]);

  if (!props.open) {
    return null;
  }

  const tabs: Array<{ id: HelpTab; label: string; icon: typeof CircleHelp }> = [
    { id: 'quickStart', label: getCopy(props.copy, 'helpTabs', 'quickStart') ?? 'Quick Start', icon: Sparkles },
    { id: 'rules', label: getCopy(props.copy, 'helpTabs', 'rules') ?? 'Game Rules', icon: ScrollText },
    { id: 'uiGuide', label: getCopy(props.copy, 'helpTabs', 'uiGuide') ?? 'UI Guide', icon: LayoutGrid },
    { id: 'faq', label: getCopy(props.copy, 'helpTabs', 'faq') ?? 'FAQ', icon: HelpCircle },
  ];

  return (
    <div className="help-overlay" onClick={props.onClose} role="dialog" aria-modal="true" aria-label={props.copy.helpTitle as string}>
      <div className="help-modal" onClick={(event) => event.stopPropagation()}>
        <div className="help-header">
          <h3>{props.copy.helpTitle as string}</h3>
          <button type="button" className="help-close icon-button" onClick={props.onClose} aria-label={props.copy.closeHelp as string}>
            <X size={18} />
          </button>
        </div>
        <div className="help-tabs" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`help-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="help-tab-content">
          {activeTab === 'quickStart' && <QuickStartContent copy={props.copy} />}
          {activeTab === 'rules' && <RulesContent copy={props.copy} />}
          {activeTab === 'uiGuide' && <UIGuideContent copy={props.copy} />}
          {activeTab === 'faq' && <FAQContent copy={props.copy} />}
        </div>
        <div className="help-footer">
          <label className="help-dont-show">
            <input
              type="checkbox"
              onChange={(event) => {
                if (event.target.checked) {
                  markTutorialSeen();
                } else {
                  clearTutorialSeen();
                }
              }}
              defaultChecked={hasSeenTutorial()}
            />
            {props.copy.dontShowAgain as string}
          </label>
        </div>
      </div>
    </div>
  );
}

function getCopy(copy: AppCopy, section: string, key: string): string | undefined {
  const sectionData = copy[section] as Record<string, string> | undefined;
  return sectionData?.[key];
}

function QuickStartContent(props: { copy: AppCopy }) {
  const qs = props.copy.quickStart as { intro: string; steps: Array<{ title: string; body: string }>; tip: string } | undefined;
  if (qs === undefined) return null;
  return (
    <div className="help-section">
      <p className="help-intro">{qs.intro}</p>
      <ol className="help-steps">
        {qs.steps.map((step, index) => (
          <li key={index}>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="help-tip">
        <Sparkles size={16} />
        <span>{qs.tip}</span>
      </div>
    </div>
  );
}

function RulesContent(props: { copy: AppCopy }) {
  const rules = props.copy.rules as { sections: Array<{ title: string; items: Array<{ name: string; desc: string }> }> } | undefined;
  if (rules === undefined) return null;
  return (
    <div className="help-section">
      {rules.sections.map((section, sIndex) => (
        <div key={sIndex} className="help-rule-block">
          <h4>{section.title}</h4>
          <ul className="help-items">
            {section.items.map((item, iIndex) => (
              <li key={iIndex}>
                <strong>{item.name}</strong>
                <span>{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function UIGuideContent(props: { copy: AppCopy }) {
  const guide = props.copy.uiGuide as { sections: Array<{ title: string; desc: string }> } | undefined;
  if (guide === undefined) return null;
  return (
    <div className="help-section">
      {guide.sections.map((section, index) => (
        <div key={index} className="help-ui-block">
          <h4>{section.title}</h4>
          <p>{section.desc}</p>
        </div>
      ))}
    </div>
  );
}

function FAQContent(props: { copy: AppCopy }) {
  const faq = props.copy.faq as { items: Array<{ q: string; a: string }> } | undefined;
  if (faq === undefined) return null;
  return (
    <div className="help-section">
      <div className="help-faq-list">
        {faq.items.map((item, index) => (
          <details key={index} className="help-faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
