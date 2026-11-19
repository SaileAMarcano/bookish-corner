import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShelfDecoration from './ShelfDecoration';
import SpineFace from './SpineFace';
import BookCover from './BookCover';
import ShelfLighting from './ShelfLighting';
import { shelfWell, shelfViewport } from './shelfView';
import { SPINE_COLORS, isLightColor, useCoverTone } from './shelfSpines';
import { groupItems } from './shelfUtils';
import { BASE_WIDTH, bookcaseImage, caseGeometry, decorationSize, layoutCases } from './bookcases';
import './ShelfRow.css';

const MOUSE_SLOP = 6;
const EDGE = 48;
const EDGE_SPEED = 10;

function labelOf(book) {
    return [book.title, book.author].filter(Boolean).join(' · ');
}

function ShelfItem({ item, editing, selected, offset, dropSide, onPointerDown, onClick, onBookSelect }) {
    const { t } = useTranslation();
    const isBook = item.type === 'book';
    const isFlat = isBook && item.pose === 'flat';
    const isFront = isBook && item.pose === 'front';
    const label = isBook ? labelOf(item.book) : t('library.shelf.objects.' + item.name);
    const free = !isBook && Number.isFinite(item.fx);
    const baseClass = (isBook ? (isFront ? 'year-shelf-front' : isFlat ? 'year-shelf-flat' : 'year-shelf-spine') : 'year-shelf-decoration') + (free ? ' year-shelf-free' : '');
    const coverTone = useCoverTone(isBook && !isFront && item.tone == null && !item.color ? item.book.coverImage : null);
    const fill = isBook ? item.color || SPINE_COLORS[item.tone ?? coverTone ?? item.look.tone].hex : null;
    const size = { '--w': item.w + 'px', '--h': item.h + 'px', ...(free ? { '--x': item.fx } : {}) };
    const style = isBook
        ? { ...size, '--spine-fill': fill, '--spine-ink': isLightColor(fill) ? '#2D241F' : '#FAF4E8' }
        : size;
    const content = isFront ? (
        <BookCover className="year-shelf-front-art" src={item.book.coverImage}
            title={item.book.title} author={item.book.author} bookId={item.book.bookId} />
    ) : isBook ? (
        <SpineFace title={item.book.title} cover={item.face === 'solid' ? null : item.book.coverImage}
            solid={item.face === 'solid'} />
    ) : (
        <ShelfDecoration name={item.name} />
    );

    if (editing) {
        const stateClass = (offset ? ' is-dragging' : '') + (dropSide ? ' drop-' + dropSide : '');

        return (
            <button type="button" className={baseClass + ' year-shelf-editable' + stateClass}
                data-shelf-key={item.key} data-shelf-flat={isFlat || undefined}
                style={offset ? { ...style, translate: `${offset.x}px ${offset.y}px` } : style}
                aria-pressed={selected} aria-label={label}
                onPointerDown={(event) => onPointerDown(event, item.key)}
                onClick={(event) => onClick(event, item.key)}
                onContextMenu={(event) => event.preventDefault()}
                onDragStart={(event) => event.preventDefault()}>
                {content}
            </button>
        );
    }

    if (isBook && onBookSelect) {
        return <button type="button" className={baseClass} data-book-key={item.key} style={style}
            aria-label={label} aria-pressed={selected} onClick={() => onBookSelect(item.key)}>{content}</button>;
    }

    if (!isBook) {
        return <span className={baseClass} style={style} role="img" aria-label={label}>{content}</span>;
    }

    return (
        <Link to={'/book/' + item.book.bookId} className={baseClass}
            style={style} title={label} aria-label={label}>
            {content}
        </Link>
    );
}

function ShelfRow({ items, bookcase, width = BASE_WIDTH, immersive = false, density = 'desktop', minHeight = 0, decorationWidth = width, label, emptyText, editing, selectedKey, onSelect, onMove, onCheckMove, onOpen, unified = false, mode = 'case', focusShelf = 0, onShelfChange, onBookSelect, ambience }) {
    const { t } = useTranslation();
    const stageRef = useRef(null);
    const dragRef = useRef(null);
    const dropRef = useRef(null);
    const skipClick = useRef(false);
    const [drag, setDrag] = useState(null);
    const [drop, setDrop] = useState(null);

    useEffect(() => () => dragRef.current?.stop(false), []);

    function scrollerOf() {
        return stageRef.current?.closest('.year-shelf-wall, .year-shelf-zoom, .bookshelf-stack') || stageRef.current;
    }

    function findDrop(state) {
        const stage = stageRef.current;
        if (!stage) return;

        const under = document.elementFromPoint(state.x, state.y);
        let target = under?.closest('[data-shelf-key]');
        const rowNode = under?.closest('[data-shelf-row]');

        // A release over the editor, frame or header is not a shelf move.
        if (!under || !stage.contains(under) || (!target && !rowNode)) {
            if (dropRef.current) { dropRef.current = null; setDrop(null); }
            return;
        }

        if ((!target || !stage.contains(target)) && rowNode && stage.contains(rowNode)) {
            const row = Number(rowNode.dataset.shelfRow);
            updateDrop(state, { key: null, row }, rowNode);
            return;
        }

        if (target.dataset.shelfKey === state.key) {
            dropRef.current = null;
            setDrop(null);
            return;
        }

        const box = target.getBoundingClientRect();
        const onto = Boolean(target.dataset.shelfFlat) && state.key.startsWith('decoration-');
        const freeRow = state.key.startsWith('decoration-') && !onto ? target.closest('[data-shelf-row]') : null;
        if (freeRow && stage.contains(freeRow)) {
            updateDrop(state, { key: null, row: Number(freeRow.dataset.shelfRow) }, freeRow);
            return;
        }
        const before = target.dataset.shelfFlat
            ? state.y < box.top + box.height / 2
            : state.x < box.left + box.width / 2;
        const next = { key: target.dataset.shelfKey, before: onto ? false : before, onto };

        updateDrop(state, next, target);
    }

    function updateDrop(state, next, node) {
        const moving = items.find(item => item.key === state.key);
        if (moving?.type === 'decoration' && next.key === null) {
            const { k } = caseGeometry(bookcase.model, width, { immersive, density });
            const rowBox = node.getBoundingClientRect();
            const w = decorationSize(moving.name, k).w * (rowBox.width / Math.max(1, node.offsetWidth));
            const room = Math.max(1, rowBox.width - w);
            next.x = Math.round(Math.min(1, Math.max(0, (state.x - rowBox.left - w / 2) / room)) * 100) / 100;
        }
        const message = onCheckMove?.(state.key, next.key, next.before, next.row) || null;
        const current = dropRef.current;
        if (current && current.key === next.key && current.row === next.row && current.before === next.before
            && current.onto === next.onto && current.x === next.x && current.message === message) return;
        let preview = null;
        if (moving?.type === 'decoration') {
            const { k } = caseGeometry(bookcase.model, width, { immersive, density });
            const size = decorationSize(moving.name, k);
            const stage = stageRef.current.getBoundingClientRect();
            const anchor = node.closest(next.onto ? '.year-shelf-pile' : '[data-shelf-row]') || node;
            const box = anchor.getBoundingClientRect();
            const itemBox = node.getBoundingClientRect();
            const scale = box.width / Math.max(1, anchor.offsetWidth);
            const left = next.onto ? box.left + (box.width - size.w) / 2
                : next.key ? (next.before ? itemBox.left : itemBox.right)
                    : box.left + (next.x ?? 0) * Math.max(0, box.width - size.w * scale);
            preview = { name: moving.name, w: size.w, h: size.h,
                left: left - stage.left, top: (next.onto ? box.top - 6 * k : box.bottom) - size.h - stage.top };
        }
        dropRef.current = { ...next, message, preview };
        setDrop(dropRef.current);
    }

    function handlePointerDown(event, key) {
        // Touch keeps native scrolling. Mobile placement uses explicit controls
        // instead of a long press that Safari can cancel as a pan gesture.
        if (event.pointerType === 'touch') return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragRef.current?.stop(false);

        const scroller = scrollerOf();
        const state = {
            key,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startScroll: scroller.scrollLeft,
            startScrollTop: scroller.scrollTop,
            x: event.clientX,
            y: event.clientY,
            active: false,
            frame: null,
        };

        const tick = () => {
            const box = scroller.getBoundingClientRect();
            if (state.x < box.left + EDGE) scroller.scrollLeft -= EDGE_SPEED;
            if (state.x > box.right - EDGE) scroller.scrollLeft += EDGE_SPEED;
            if (state.y < box.top + EDGE) scroller.scrollTop -= EDGE_SPEED;
            if (state.y > box.bottom - EDGE) scroller.scrollTop += EDGE_SPEED;

            setDrag({
                key,
                x: state.x - state.startX + scroller.scrollLeft - state.startScroll,
                y: state.y - state.startY + scroller.scrollTop - state.startScrollTop,
            });
            findDrop(state);
            state.frame = requestAnimationFrame(tick);
        };

        const start = () => {
            state.active = true;
            state.frame = requestAnimationFrame(tick);
        };

        const handleMove = (moveEvent) => {
            if (moveEvent.pointerId !== state.pointerId) return;
            state.x = moveEvent.clientX;
            state.y = moveEvent.clientY;
            if (state.active) return;

            const distance = Math.hypot(state.x - state.startX, state.y - state.startY);
            if (distance > MOUSE_SLOP) start();
        };

        const handleUp = (upEvent) => {
            if (upEvent.pointerId === state.pointerId) state.stop(true);
        };

        const handleCancel = (cancelEvent) => {
            if (cancelEvent.pointerId === state.pointerId) state.stop(false);
        };

        state.stop = (apply) => {
            cancelAnimationFrame(state.frame);
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleCancel);

            const target = dropRef.current;
            dragRef.current = null;
            dropRef.current = null;

            if (state.active) {
                skipClick.current = true;
                setTimeout(() => {
                    skipClick.current = false;
                }, 80);
                setDrag(null);
                setDrop(null);
                if (apply && target) onMove(key, target.key, target.before, target.row, target.x);
            }
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleCancel);
        dragRef.current = state;
    }

    function handleClick(event, key) {
        if (skipClick.current && event.detail !== 0) return;
        onSelect(key === selectedKey ? null : key);
    }

    function renderItem(item) {
        return (
            <ShelfItem
                key={item.key}
                item={item}
                editing={editing}
                selected={item.key === selectedKey}
                offset={drag?.key === item.key ? { ...drag, x: drag.x / viewScale, y: drag.y / viewScale } : null}
                dropSide={drop?.key === item.key ? (drop.onto ? 'onto' : drop.before ? 'before' : 'after') : null}
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                onBookSelect={onBookSelect}
            />
        );
    }

    const options = { immersive, density, minHeight, decorationWidth };
    const groups = groupItems(items);
    const measureWidth = unified ? BASE_WIDTH : width;
    const viewScale = width / measureWidth;
    const cases = layoutCases(groups, bookcase.model, measureWidth, options);

    function handleCaseClick(event) {
        if (editing || !onOpen || event.target.closest('a, button')) return;
        onOpen();
    }

    return (
        <div className={'year-shelf-cases' + (editing ? ' is-editing' : '') + (immersive ? ' is-immersive' : '') + (unified ? ' is-unified' : '') + (mode !== 'case' ? ' is-row-list' : '')} ref={stageRef} role="group" aria-label={label}>
            {cases.flatMap((rows, index) => {
                const geometry = caseGeometry(bookcase.model, measureWidth, { ...options, rowCount: rows.length }, groups);
                const crops = mode === 'case' ? [null] : rows.filter(row => mode === 'rows' || row.index === focusShelf);
                return crops.map(crop => {
                    const viewport = crop ? shelfViewport(geometry, crop) : { top: 0, height: geometry.height };
                    const visibleRows = crop ? [crop] : rows;
                    return (
                        <div key={crop ? crop.index : index} data-focus-shelf={crop?.index}
                            className={'year-shelf-case' + (immersive ? ' is-immersive' : '') + (crop ? ' is-row-view' : '')}
                            style={{ width, height: viewport.height * viewScale, '--k': geometry.k }} onClick={handleCaseClick}>
                            <div className="year-shelf-scene" style={{ width: geometry.width, height: geometry.height,
                                top: -viewport.top * viewScale, transform: `scale(${viewScale})` }}>
                                {geometry.slices.length > 0 ? geometry.slices.map((slice, sliceIndex) => {
                                    const scale = slice.height / slice.sourceHeight;
                                    return <div key={sliceIndex} className="year-shelf-case-slice" aria-hidden="true"
                                        style={{ top: slice.top, height: slice.height,
                                            backgroundImage: 'url(' + JSON.stringify(bookcaseImage(bookcase)) + ')',
                                            backgroundSize: `${geometry.artWidth}px ${geometry.artWidth * 2 * scale}px`,
                                            backgroundPosition: `${-geometry.cropLeft}px ${-slice.sourceTop * scale}px` }} />;
                                }) : <img className="year-shelf-case-art" src={bookcaseImage(bookcase)} alt="" draggable="false" />}
                                {visibleRows.map(row => {
                                    const well = unified ? shelfWell(geometry, row, bookcase.model) : row;
                                    return <div className="year-shelf-well" key={row.index} style={{ top: well.top, left: well.left, width: well.width, height: well.height }}>
                                        {ambience && <ShelfLighting {...ambience} />}
                                        <div data-shelf-row={row.index} className={'year-shelf-case-row' + (drop && drop.key === null && drop.row === row.index ? ' is-drop' : '')}>
                                            {row.groups.map(group => group.type !== 'pile' ? renderItem(group) : (
                                                <div key={group.key} className="year-shelf-pile" style={{ '--w': group.w + 'px' }}>
                                                    {group.top && <div className="year-shelf-pile-top">{renderItem(group.top)}</div>}
                                                    {group.items.map(renderItem)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>;
                                })}
                            </div>
                            {mode === 'case' && onShelfChange && rows.map(row => (
                                <button type="button" key={row.index} className="bookshelf-row-target"
                                    style={{ top: (row.top + row.height / 2) * viewScale }}
                                    aria-label={t('library.shelf.viewer.enlarge', { number: row.index + 1 })}
                                    aria-pressed={row.index === focusShelf} onClick={() => onShelfChange(row.index)}>{row.index + 1}</button>
                            ))}
                            {crop && <span className="bookshelf-row-number" aria-hidden="true">{crop.index + 1}</span>}
                        </div>
                    );
                });
            })}
            {drop?.preview && <div className={'year-shelf-drop-preview' + (drop.message ? ' is-invalid' : '')}
                style={{ left: drop.preview.left, top: drop.preview.top, width: drop.preview.w, height: drop.preview.h }} aria-hidden="true">
                <ShelfDecoration name={drop.preview.name} />
            </div>}
            {drop && <p className={'year-shelf-drop-status' + (drop.message ? ' is-invalid' : '')} role="status" aria-live="polite">
                {drop.message || t('library.shelf.placement.fits')}
            </p>}
            {items.length === 0 && <p className="year-shelf-empty">{emptyText}</p>}
        </div>
    );
}

export default ShelfRow;
