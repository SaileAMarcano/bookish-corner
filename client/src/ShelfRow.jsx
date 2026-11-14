import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShelfDecoration from './ShelfDecoration';
import SpineFace from './SpineFace';
import { SPINE_COLORS, isLightColor, useCoverTone } from './shelfSpines';
import { groupItems } from './shelfUtils';
import { BASE_WIDTH, bookcaseImage, layoutCases } from './bookcases';

const HOLD_TIME = 280;
const TOUCH_SLOP = 8;
const MOUSE_SLOP = 6;
const EDGE = 48;
const EDGE_SPEED = 10;

function labelOf(book) {
    return [book.title, book.author].filter(Boolean).join(' · ');
}

function ShelfItem({ item, editing, selected, offset, dropSide, onPointerDown, onClick }) {
    const { t } = useTranslation();
    const isBook = item.type === 'book';
    const isFlat = isBook && item.pose === 'flat';
    const label = isBook ? labelOf(item.book) : t('library.shelf.objects.' + item.name);
    const baseClass = isBook ? (isFlat ? 'year-shelf-flat' : 'year-shelf-spine') : 'year-shelf-decoration';
    const coverTone = useCoverTone(isBook && item.tone == null ? item.book.coverImage : null);
    const fill = isBook ? SPINE_COLORS[item.tone ?? coverTone ?? item.look.tone].hex : null;
    const size = { '--w': item.w + 'px', '--h': item.h + 'px' };
    const style = isBook
        ? { ...size, '--spine-fill': fill, '--spine-ink': isLightColor(fill) ? '#2D241F' : '#FAF4E8', '--book-size': item.size }
        : size;
    const content = isBook ? (
        <SpineFace title={item.book.title} cover={item.face === 'solid' ? null : item.book.coverImage}
            solid={item.face === 'solid'} motif={item.motif ?? item.look.motif} />
    ) : (
        <ShelfDecoration name={item.name} />
    );
    const shared = {
        'data-thin': (isBook && item.thin) || undefined,
        'data-lean': (isBook && item.pose === 'lean') || undefined,
    };

    if (editing) {
        const stateClass = (offset ? ' is-dragging' : '') + (dropSide ? ' drop-' + dropSide : '');

        return (
            <button type="button" className={baseClass + ' year-shelf-editable' + stateClass} {...shared}
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

    if (!isBook) {
        return <span className={baseClass} style={style} role="img" aria-label={label}>{content}</span>;
    }

    return (
        <Link to={'/book/' + item.book.bookId} className={baseClass} {...shared}
            style={style} title={label} aria-label={label}>
            {content}
        </Link>
    );
}

function ShelfRow({ items, bookcase, width = BASE_WIDTH, label, emptyText, editing, selectedKey, onSelect, onMove, onOpen }) {
    const stageRef = useRef(null);
    const dragRef = useRef(null);
    const dropRef = useRef(null);
    const skipClick = useRef(false);
    const [drag, setDrag] = useState(null);
    const [drop, setDrop] = useState(null);

    useEffect(() => () => dragRef.current?.stop(false), []);

    function scrollerOf() {
        return stageRef.current?.closest('.year-shelf-wall') || stageRef.current;
    }

    function findDrop(state) {
        const stage = stageRef.current;
        if (!stage) return;

        const under = document.elementFromPoint(state.x, state.y);
        let target = under?.closest('[data-shelf-key]');
        const rowNode = under?.closest('[data-shelf-row]');

        if ((!target || !stage.contains(target)) && rowNode && stage.contains(rowNode)) {
            const row = Number(rowNode.dataset.shelfRow);
            const current = dropRef.current;
            if (!current || current.key !== null || current.row !== row) {
                dropRef.current = { key: null, row };
                setDrop(dropRef.current);
            }
            return;
        }

        if (!target || !stage.contains(target)) {
            let best = Infinity;
            target = null;
            for (const node of stage.querySelectorAll('[data-shelf-key]')) {
                if (node.dataset.shelfKey === state.key) continue;
                const box = node.getBoundingClientRect();
                const dx = Math.max(box.left - state.x, 0, state.x - box.right);
                const dy = Math.max(box.top - state.y, 0, state.y - box.bottom);
                const distance = dx * dx + dy * dy * 4;
                if (distance < best) {
                    best = distance;
                    target = node;
                }
            }
            if (!target) return;
        }

        if (target.dataset.shelfKey === state.key) return;

        const box = target.getBoundingClientRect();
        const onto = Boolean(target.dataset.shelfFlat) && state.key.startsWith('decoration-');
        const before = target.dataset.shelfFlat
            ? state.y < box.top + box.height / 2
            : state.x < box.left + box.width / 2;
        const next = { key: target.dataset.shelfKey, before: onto ? false : before, onto };

        const current = dropRef.current;
        if (!current || current.key !== next.key || current.before !== next.before || current.onto !== next.onto) {
            dropRef.current = next;
            setDrop(next);
        }
    }

    function handlePointerDown(event, key) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragRef.current?.stop(false);

        const scroller = scrollerOf();
        const state = {
            key,
            pointerId: event.pointerId,
            touch: event.pointerType === 'touch',
            startX: event.clientX,
            startY: event.clientY,
            startScroll: scroller.scrollLeft,
            x: event.clientX,
            y: event.clientY,
            active: false,
            timer: null,
            frame: null,
        };

        const tick = () => {
            const box = scroller.getBoundingClientRect();
            if (state.x < box.left + EDGE) scroller.scrollLeft -= EDGE_SPEED;
            if (state.x > box.right - EDGE) scroller.scrollLeft += EDGE_SPEED;

            setDrag({
                key,
                x: state.x - state.startX + scroller.scrollLeft - state.startScroll,
                y: state.y - state.startY,
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
            if (state.touch) {
                if (distance > TOUCH_SLOP) state.stop(false);
            } else if (distance > MOUSE_SLOP) {
                start();
            }
        };

        const handleUp = (upEvent) => {
            if (upEvent.pointerId === state.pointerId) state.stop(true);
        };

        const handleCancel = (cancelEvent) => {
            if (cancelEvent.pointerId === state.pointerId) state.stop(false);
        };

        const blockScroll = (touchEvent) => {
            if (state.active) touchEvent.preventDefault();
        };

        state.stop = (apply) => {
            clearTimeout(state.timer);
            cancelAnimationFrame(state.frame);
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleCancel);
            window.removeEventListener('touchmove', blockScroll);

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
                if (apply && target) onMove(key, target.key, target.before, target.row);
            }
        };

        if (state.touch) state.timer = setTimeout(start, HOLD_TIME);

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleCancel);
        window.addEventListener('touchmove', blockScroll, { passive: false });
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
                offset={drag?.key === item.key ? drag : null}
                dropSide={drop?.key === item.key ? (drop.onto ? 'onto' : drop.before ? 'before' : 'after') : null}
                onPointerDown={handlePointerDown}
                onClick={handleClick}
            />
        );
    }

    const cases = layoutCases(groupItems(items), bookcase.model, width);

    function handleCaseClick(event) {
        if (editing || !onOpen || event.target.closest('a, button')) return;
        onOpen();
    }

    return (
        <div className={'year-shelf-cases' + (editing ? ' is-editing' : '')} ref={stageRef} role="group" aria-label={label}>
            {cases.map((rows, index) => (
                <div key={index} className={'year-shelf-case' + (onOpen && !editing ? ' is-openable' : '')}
                    style={{ width, height: width * 2, '--k': width / BASE_WIDTH }} onClick={handleCaseClick}>
                    <img className="year-shelf-case-art" src={bookcaseImage(bookcase)} alt="" draggable="false" />
                    {rows.map((row, rowIndex) => (
                        <div key={rowIndex} data-shelf-row={row.index}
                            className={'year-shelf-case-row' + (drop && drop.key === null && drop.row === row.index ? ' is-drop' : '')}
                            style={{ top: row.top, left: row.left, width: row.width, height: row.height }}>
                            {row.groups.map((group) => {
                                if (group.type !== 'pile') return renderItem(group);
                                return (
                                    <div key={group.key} className="year-shelf-pile" style={{ '--w': group.w + 'px' }}>
                                        {group.top && <div className="year-shelf-pile-top">{renderItem(group.top)}</div>}
                                        {group.items.map(renderItem)}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ))}
            {items.length === 0 && <p className="year-shelf-empty">{emptyText}</p>}
        </div>
    );
}

export default ShelfRow;
