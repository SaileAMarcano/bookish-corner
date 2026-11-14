import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import ShelfDecoration from './ShelfDecoration';
import { SHELF_POSES, SPINE_FACES } from './shelfUtils';
import { SpineMotif } from './SpineFace';
import { SPINE_COLORS, SPINE_LIGHTNESS, SPINE_MOTIFS, spineColor, spineSliders } from './shelfSpines';
import { BOOKCASES, BOOKCASE_MODELS, bookcaseImage } from './bookcases';

function ShelfEditor({ item, isFirst, isLast, canTop, tray, saving, error, onMoveBy, onPose, onTone, onColor, onFace, onMotif, bookcase, onBookcase, onRemove, onAdd, onSave, onCancel }) {
    const { t } = useTranslation();
    const name = item && (item.type === 'book' ? item.book.title : t('library.shelf.objects.' + item.name));
    const sliders = item?.type === 'book'
        ? spineSliders(item.color || SPINE_COLORS[item.tone ?? item.look?.tone ?? 0].hex)
        : null;
    const colorIndex = Math.max(0, BOOKCASES[bookcase.model].colors.indexOf(bookcase.color));

    return (
        <div className="year-shelf-editor">
            <p className="year-shelf-editor-hint">{t('library.shelf.editHint')}</p>

            <fieldset className="year-shelf-editor-group">
                <legend>{t('library.shelf.bookcase')}</legend>
                <div className="year-shelf-case-options">
                    {BOOKCASE_MODELS.map((model) => {
                        const color = BOOKCASES[model].colors[colorIndex];
                        return (
                            <button key={model} type="button" className="year-shelf-case-option"
                                aria-pressed={bookcase.model === model} onClick={() => onBookcase({ model, color })}>
                                <img src={bookcaseImage({ model, color })} alt="" />
                                <span>{t('library.shelf.bookcases.' + model)}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="year-shelf-case-options">
                    {BOOKCASES[bookcase.model].colors.map((color) => (
                        <button key={color} type="button" className="year-shelf-case-option"
                            aria-pressed={bookcase.color === color} onClick={() => onBookcase({ model: bookcase.model, color })}>
                            <img src={bookcaseImage({ model: bookcase.model, color })} alt="" />
                            <span>{t('library.shelf.caseColors.' + bookcase.model + '-' + color)}</span>
                        </button>
                    ))}
                </div>
            </fieldset>

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
                                {SPINE_FACES.map((face) => (
                                    <button key={face} type="button" className="year-shelf-button"
                                        aria-pressed={(item.face ?? 'cover') === face} onClick={() => onFace(face)}>
                                        {t('library.shelf.faces.' + face)}
                                    </button>
                                ))}
                            </div>
                            <div className="year-shelf-editor-row">
                                <button type="button" className="year-shelf-button"
                                    aria-pressed={!item.color && item.tone === null} onClick={() => onTone(null)}>
                                    {t('library.shelf.colorAuto')}
                                </button>
                            </div>
                            {sliders && (
                                <div className="year-shelf-color">
                                    <label htmlFor="shelf-color-hue">{t('library.shelf.hue')}</label>
                                    <span className="year-shelf-color-track year-shelf-color-hues" aria-hidden="true"></span>
                                    <input id="shelf-color-hue" type="range" min="0" max="359" step="1" value={sliders.hue}
                                        onChange={(event) => onColor(spineColor(Number(event.target.value), sliders.lightness))} />
                                    <label htmlFor="shelf-color-lightness">{t('library.shelf.lightness')}</label>
                                    <span className="year-shelf-color-track" aria-hidden="true"
                                        style={{ background: `linear-gradient(90deg, ${spineColor(sliders.hue, SPINE_LIGHTNESS[0])}, ${spineColor(sliders.hue, 50)}, ${spineColor(sliders.hue, SPINE_LIGHTNESS[1])})` }}></span>
                                    <input id="shelf-color-lightness" type="range" min={SPINE_LIGHTNESS[0]} max={SPINE_LIGHTNESS[1]} step="1" value={sliders.lightness}
                                        onChange={(event) => onColor(spineColor(sliders.hue, Number(event.target.value)))} />
                                </div>
                            )}
                        </fieldset>
                    )}

                    {item.type === 'book' && (
                        <fieldset className="year-shelf-editor-group">
                            <legend>{t('library.shelf.motif')}</legend>
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
