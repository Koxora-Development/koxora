import { Icon } from '@koxora/ui';
import { translate } from '@koxora/i18n';

export function WorkbenchControls({
  locale,
  expanded,
  navigator,
  properties,
  objects,
  disabled,
  onNavigator,
  onProperties,
  onObjects,
  onExpand,
}: {
  locale: string;
  expanded: boolean;
  navigator: boolean;
  properties: boolean;
  objects: boolean;
  disabled?: boolean;
  onNavigator: () => void;
  onProperties: () => void;
  onObjects: () => void;
  onExpand: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <div
      className="workbench-controls"
      role="group"
      aria-label={t('office.workbenchTools')}
    >
      <button
        className="office-tool-button"
        aria-label={t('tree.heading')}
        title={t('tree.heading')}
        aria-pressed={navigator}
        onClick={onNavigator}
      >
        <Icon name="layers" />
      </button>
      <button
        className="office-tool-button"
        aria-label={t('office.properties')}
        title={t('office.properties')}
        aria-pressed={properties}
        disabled={disabled}
        onClick={onProperties}
      >
        <Icon name="panel" />
      </button>
      <button
        className="office-tool-button"
        aria-label={t('format.objects')}
        title={t('format.objects')}
        aria-pressed={objects}
        disabled={disabled}
        onClick={onObjects}
      >
        <Icon name="grid" />
      </button>
      <button
        className="office-tool-button"
        data-workbench-control="expand"
        aria-label={t(expanded ? 'canvas.restore' : 'canvas.expand')}
        title={t(expanded ? 'canvas.restore' : 'canvas.expand')}
        aria-pressed={expanded}
        disabled={disabled}
        onClick={onExpand}
      >
        <Icon name="expand" />
      </button>
    </div>
  );
}
