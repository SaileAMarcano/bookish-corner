import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import ShelfDecoration from './ShelfDecoration';
import { SHELF_POSES, SHELF_TONES } from './shelfUtils';

function ShelfEditor({ item, isFirst, isLast, tray, saving, error, onMoveBy, onPose, onTone, onRemove, onAdd, onSave, onCancel }) {
    const { t } = useTranslation();
    const name = item && (item.type === 'book' ? item.book.title : t('library.shelf.objects.' + item.name));

    return (
        <div className="year-shelf-editor">
            <p className="year-shelf-editor-hint">{t('library.shelf.editHint')}</p>

            {item ? (
                <div className="year-shelf-editor-item">
                    <strong className="display">{name}</strong>

                    <div className="year-shelf-editor-row" role="group" aria-label={t('library.shelf.position')}>
                        <button type="button" className="year-shelf-button" onClick={() => onMoveBy(-1)} disabled={isFirst}>
                            {t('library.shelf.moveLeft')}
                        </button>
                        <button type="button" className="year-shelf-button" onClick={() => onMoveBy(1)} disabled={isLast}>
                            {t('library.shelf.moveRight')}
                        </button>
                    </div>

                    {item.type === 'book' && (
                        <>
                            <div className="year-shelf-editor-row" role="group" aria-label={t('library.shelf.pose')}>
                                {SHELF_POSES.map((pose) => (
                                    <button key={pose} type="button" className="year-shelf-button"
                                        aria-pressed={item.pose === pose} onClick={() => onPose(pose)}>
                                        {t('library.shelf.poses.' + pose)}
                                    </button>
                                ))}
                            </div>

                            <div className="year-shelf-editor-row" role="group" aria-label={t('library.shelf.color')}>
                                <button type="button" className="year-shelf-button"
                                    aria-pressed={item.tone === null} onClick={() => onTone(null)}>
                                    {t('library.shelf.colorAuto')}
                                </button>
                                {SHELF_TONES.map((tone) => (
                                    <button key={tone} type="button" className="year-shelf-swatch"
                                        style={{ '--spine-tone': 'var(--shelf-tone-' + tone + ')' }}
                                        aria-pressed={item.tone === tone}
                                        aria-label={t('library.shelf.colorOption', { number: tone + 1 })}
                                        onClick={() => onTone(tone)}></button>
                                ))}
                            </div>
                        </>
                    )}

                    {item.type === 'decoration' && (
                        <div className="year-shelf-editor-row">
                            <button type="button" className="year-shelf-button" onClick={onRemove}>
                                {t('library.shelf.removeDecoration')}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <p className="year-shelf-editor-hint">{t('library.shelf.selectHint')}</p>
            )}

            {tray.length > 0 && (
                <div className="year-shelf-tray">
                    <strong>{t('library.shelf.addDecoration')}</strong>
                    <div className="year-shelf-editor-row">
                        {tray.map((decoration) => (
                            <button key={decoration} type="button" className="year-shelf-button year-shelf-tray-button"
                                onClick={() => onAdd(decoration)}>
                                <ShelfDecoration name={decoration} />
                                {t('library.shelf.objects.' + decoration)}
                            </button>
                        ))}
                    </div>
                    <p className="year-shelf-editor-hint">{t('library.shelf.trayHint')}</p>
                </div>
            )}

            {error && <Notice message={error} />}

            <div className="year-shelf-editor-row year-shelf-editor-actions">
                <button type="button" className="year-shelf-button" onClick={onCancel} disabled={saving}>
                    {t('common.cancel')}
                </button>
                <button type="button" className="year-shelf-button year-shelf-save" onClick={onSave} disabled={saving}>
                    {saving ? t('common.saving') : t('library.shelf.save')}
                </button>
            </div>
        </div>
    );
}

export default ShelfEditor;
