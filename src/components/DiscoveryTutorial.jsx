import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  MessageCircle,
  Settings,
  User,
  Eye,
} from 'lucide-react';
import { useTranslation } from '../i18n/index.js';
import {
  loadDiscoveryTutorial,
  saveDiscoveryTutorial,
  TUTORIAL_STEP_IDS,
} from '../utils/tutorialStorage';

const STEP_META = [
  { id: 'profile', icon: User, actionTab: 'profile' },
  { id: 'visibility', icon: Eye, actionTab: null },
  { id: 'grid', icon: Grid3x3, actionTab: 'grid' },
  { id: 'messages', icon: MessageCircle, actionTab: 'chat' },
  { id: 'settings', icon: Settings, actionTab: 'privacy' },
];

function stepCopy(id, t) {
  const map = {
    profile: { title: t('tutorialStepProfileTitle'), body: t('tutorialStepProfileBody') },
    visibility: { title: t('tutorialStepVisibilityTitle'), body: t('tutorialStepVisibilityBody') },
    grid: { title: t('tutorialStepGridTitle'), body: t('tutorialStepGridBody') },
    messages: { title: t('tutorialStepMessagesTitle'), body: t('tutorialStepMessagesBody') },
    settings: { title: t('tutorialStepSettingsTitle'), body: t('tutorialStepSettingsBody') },
  };
  return map[id] ?? { title: '', body: '' };
}

export default function DiscoveryTutorial({ onNavigateTab, disabled = false }) {
  const { t } = useTranslation();
  const [state, setState] = useState(() => loadDiscoveryTutorial());

  useEffect(() => {
    saveDiscoveryTutorial(state);
  }, [state]);

  const checkedCount = state.checkedSteps.length;
  const totalSteps = TUTORIAL_STEP_IDS.length;
  const allChecked = checkedCount >= totalSteps;

  const toggleStep = useCallback(
    (stepId) => {
      if (disabled) return;
      setState((prev) => {
        const has = prev.checkedSteps.includes(stepId);
        const checkedSteps = has
          ? prev.checkedSteps.filter((id) => id !== stepId)
          : [...prev.checkedSteps, stepId];
        return { ...prev, checkedSteps };
      });
    },
    [disabled],
  );

  const markComplete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      completed: true,
      collapsed: true,
      checkedSteps: [...TUTORIAL_STEP_IDS],
    }));
  }, []);

  const showAgain = useCallback(() => {
    setState({
      completed: false,
      collapsed: false,
      checkedSteps: [],
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, collapsed: !prev.collapsed }));
  }, []);

  if (state.completed && state.collapsed) {
    return (
      <div className="discovery-tutorial discovery-tutorial--compact">
        <p className="discovery-tutorial-done-text">{t('tutorialCompleteShort')}</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={showAgain}
          disabled={disabled}
        >
          {t('tutorialShowAgain')}
        </button>
      </div>
    );
  }

  return (
    <section
      className="discovery-tutorial"
      aria-labelledby="discovery-tutorial-title"
    >
      <div className="discovery-tutorial-header">
        <div className="discovery-tutorial-title-row">
          <BookOpen className="icon-md text-violet" aria-hidden />
          <div>
            <h4 id="discovery-tutorial-title" className="discovery-tutorial-title">
              {t('tutorialTitle')}
            </h4>
            <p className="discovery-tutorial-intro">{t('tutorialIntro')}</p>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn-ctrl discovery-tutorial-collapse-btn"
          onClick={toggleCollapsed}
          aria-expanded={!state.collapsed}
          aria-label={state.collapsed ? t('tutorialExpand') : t('tutorialCollapse')}
        >
          {state.collapsed ? <ChevronDown className="icon-md" /> : <ChevronUp className="icon-md" />}
        </button>
      </div>

      {!state.collapsed && (
        <>
          <div
            className="discovery-tutorial-progress"
            role="progressbar"
            aria-valuenow={checkedCount}
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-label={t('tutorialProgressLabel')}
          >
            <div
              className="discovery-tutorial-progress-fill"
              style={{ width: `${(checkedCount / totalSteps) * 100}%` }}
            />
          </div>
          <p className="discovery-tutorial-progress-text">
            {t('tutorialProgress', { done: checkedCount, total: totalSteps })}
          </p>

          <ol className="discovery-tutorial-steps">
            {STEP_META.map(({ id, icon: Icon, actionTab }, index) => {
              const { title, body } = stepCopy(id, t);
              const done = state.checkedSteps.includes(id);
              return (
                <li
                  key={id}
                  className={`discovery-tutorial-step ${done ? 'discovery-tutorial-step--done' : ''}`}
                >
                  <button
                    type="button"
                    className="discovery-tutorial-step-check"
                    onClick={() => toggleStep(id)}
                    disabled={disabled}
                    aria-pressed={done}
                    aria-label={done ? t('tutorialStepDone') : t('tutorialStepMarkDone')}
                  >
                    {done ? <Check className="icon-sm" /> : <span>{index + 1}</span>}
                  </button>
                  <div className="discovery-tutorial-step-body">
                    <div className="discovery-tutorial-step-title-row">
                      <Icon className="icon-sm text-cyan" aria-hidden />
                      <h5 className="discovery-tutorial-step-title">{title}</h5>
                    </div>
                    <p className="discovery-tutorial-step-desc">{body}</p>
                    {actionTab && onNavigateTab && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs discovery-tutorial-go-btn"
                        onClick={() => onNavigateTab(actionTab)}
                        disabled={disabled}
                      >
                        {actionTab === 'profile' && t('tutorialGoToProfile')}
                        {actionTab === 'grid' && t('tutorialGoToGrid')}
                        {actionTab === 'chat' && t('tutorialGoToChat')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="discovery-tutorial-actions">
            <button
              type="button"
              className="btn btn-secure btn-sm"
              onClick={markComplete}
              disabled={disabled}
            >
              {allChecked ? t('tutorialFinish') : t('tutorialMarkAllDone')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
