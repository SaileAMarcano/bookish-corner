import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import ShelfDecoration from './ShelfDecoration';
import { SHELF_POSES } from './shelfUtils';
import { SpineMotif } from './SpineFace';
import { SPINE_COLORS, SPINE_MOTIFS } from './shelfSpines';

function ShelfEditor({ item, isFirst, isLast, canTop, tray, saving, error, onMoveBy, onPose, onTone, onMotif, onRemove, onAdd, onSave, onCancel }) {
    const { t } = useTranslation();
    const name = item && (item.type === 'book' ? item.book.title : t('library.shelf.objects.' + item.name));

    return (
        <div className="year-shelf-editor">
            <p className="year-shelf-editor-hint">{t('library.shelf.editHint')}</p>

            {item ? (
                <div className="year-shelf-editor-item">
                    <strong className="display">{name}</strong>

                    <fieldset className="year-shelf-editor-group">
                        <legend>{t('library.shelf.pose')}</legend>
                        <div className="year-shelf-editor-row">
                            {item.type === 'book' ? SHELF_POSES.map((pose) => (
                                <button key={pose} type="button" className="year-shelf-button"
                                    aria-pressed={item.pose === pose} onClick={() => onPose(pose)}>
                                    {t('library.shelf.poses.' + pose)}
                                </button>
                            )) : (
                                <>
                                    <button type="button" className="year-shelf-button"
                                        aria-pressed={!(canTop && item.pose === 'flat')} onClick={() => onPose('upright')}>
                                        {t('library.shelf.decorationPoses.upright')}
                                    </button>
                                    <button type="button" className="year-shelf-button"
                                        aria-pressed={canTop && item.pose === 'flat'} disabled={!canTop} onClick={() => onPose('flat')}>
                                        {t('library.shelf.decorationPoses.flat')}
                                    </button>
                                </>
                            )}
                        </div>
                        {item.type === 'decoration' && !canTop && <p className="year-shelf-editor-hint">{t('library.shelf.pileHint')}</p>}
                    </fieldset>

                    {item.type === 'book' && (
                        <fieldset className="year-shelf-editor-group">
                            <legend>{t('library.shelf.color')}</legend>
                            <div className="year-shelf-editor-row">
                                <button type="button" className="year-shelf-button"
                                    aria-pressed={item.tone === null} onClick={() => onTone(null)}>
                                    {t('library.shelf.colorAuto')}
                                </button>
                            </div>
                            <div className="year-shelf-swatches">
                                {SPINE_COLORS.map(({ key, hex }, tone) => (
                                    <button key={key} type="button" className="year-shelf-swatch"
                                        style={{ background: hex }}
                                        aria-pressed={item.tone === tone}
                                        aria-label={t('library.shelf.colors.' + key)}
                                        title={t('library.shelf.colors.' + key)}
                                        onClick={() => onTone(tone)}></button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {item.type === 'book' && (
                        <fieldset className="year-shelf-editor-group">
                            <legend>{t('library.shelf.motif')}</legend>
                            <div className="year-shelf-editor-row">
                                <button type="button" className="year-shelf-button"
                                    aria-pressed={item.motif === null} onClick={() => onMotif(null)}>
                                    {t('library.shelf.motifAuto')}
                                </button>
                            </div>
                            <div className="year-shelf-swatches">
                                {SPINE_MOTIFS.map((motif) => (
                                    <button key={motif} type="button" className="year-shelf-swatch year-shelf-motif"
                                        aria-pressed={item.motif === motif}
                                        aria-label={t('library.shelf.motifs.' + motif)}
                                        title={t('library.shelf.motifs.' + motif)}
                                        onClick={() => onMotif(motif)}>
                                        <SpineMotif motif={motif} />
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    <fieldset className="year-shelf-editor-group">
                        <legend>{t('library.shelf.position')}</legend>
                        <div className="year-shelf-editor-row">
                            <button type="button" className="year-shelf-button" onClick={() => onMoveBy(-1)} disabled={isFirst}>
                                {t('library.shelf.moveLeft')}
                            </button>
                            <button type="button" className="year-shelf-button" onClick={() => onMoveBy(1)} disabled={isLast}>
                                {t('library.shelf.moveRight')}
                            </button>
                            {item.type === 'decoration' && (
                                <button type="button" className="year-shelf-button" onClick={onRemove}>
                                    {t('library.shelf.removeDecoration')}
                                </button>
                            )}
                        </div>
                    </fieldset>
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
