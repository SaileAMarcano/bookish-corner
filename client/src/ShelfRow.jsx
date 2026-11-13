import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShelfDecoration from './ShelfDecoration';
import SpineArt, { FlatSpineArt } from './SpineArt';
import { groupItems } from './shelfUtils';

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
    const style = isBook ? { '--spine-tone': 'var(--shelf-tone-' + item.tone + ')' } : {};
    const content = isBook ? (
        <>
            {isFlat ? <FlatSpineArt variant={item.variant} /> : <SpineArt variant={item.variant} />}
            <span>{item.book.title}</span>
        </>
    ) : (
        <ShelfDecoration name={item.name} />
    );

    if (editing) {
        const stateClass = (offset ? ' is-dragging' : '') + (dropSide ? ' drop-' + dropSide : '');

        return (
            <button type="button" className={baseClass + ' year-shelf-editable' + stateClass}
                data-shelf-key={item.key} data-shelf-flat={isFlat || undefined}
                data-lean={(isBook && item.pose === 'lean') || undefined}
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
        return <span className={baseClass} role="img" aria-label={label}>{content}</span>;
    }

    return (
        <Link to={'/book/' + item.book.bookId} className={baseClass}
            data-lean={item.pose === 'lean' || undefined} style={style} title={label} aria-label={label}>
            {content}
        </Link>
    );
}

function ShelfRow({ items, label, emptyText, editing, selectedKey, onSelect, onMove }) {
    const scrollRef = useRef(null);
    const stageRef = useRef(null);
    const dragRef = useRef(null);
    const dropRef = useRef(null);
    const skipClick = useRef(false);
    const [drag, setDrag] = useState(null);
    const [drop, setDrop] = useState(null);

    useEffect(() => () => dragRef.current?.stop(false), []);

    function findDrop(state) {
        const stage = stageRef.current;
        if (!stage) return;

        const under = document.elementFromPoint(state.x, state.y);
        const target = under?.closest('[data-shelf-key]');
        let next;

        if (target && stage.contains(target)) {
            if (target.dataset.shelfKey === state.key) return;
            const box = target.getBoundingClientRect();
            const onto = Boolean(target.dataset.shelfFlat) && state.key.startsWith('decoration-');
            const before = target.dataset.shelfFlat
                ? state.y < box.top + box.height / 2
                : state.x < box.left + box.width / 2;
            next = { key: target.dataset.shelfKey, before: onto ? false : before, onto };
        } else {
            const others = [...stage.querySelectorAll('[data-shelf-key]')]
                .filter((node) => node.dataset.shelfKey !== state.key);
            if (others.length === 0) return;

            const first = others[0];
            const last = others[others.length - 1];
            if (state.x > last.getBoundingClientRect().right) {
                next = { key: last.dataset.shelfKey, before: false };
            } else if (state.x < first.getBoundingClientRect().left) {
                next = { key: first.dataset.shelfKey, before: true };
            } else {
                return;
            }
        }

        const current = dropRef.current;
        if (!current || current.key !== next.key || current.before !== next.before || current.onto !== next.onto) {
            dropRef.current = next;
            setDrop(next);
        }
    }

    function handlePointerDown(event, key) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragRef.current?.stop(false);

        const scroller = scrollRef.current;
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
                if (apply && target) onMove(key, target.key, target.before);
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

    return (
        <div className="year-shelf-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label={label}>
            <div className={'year-shelf-stage' + (editing ? ' is-editing' : '')} ref={stageRef}>
                {items.length === 0 && <p className="year-shelf-empty">{emptyText}</p>}
                {groupItems(items).map((group) => {
                    if (group.type === 'pile') {
                        return (
                            <div key={group.key} className="year-shelf-pile">
                                {group.top && <div className="year-shelf-pile-top">{renderItem(group.top)}</div>}
                                {group.items.map(renderItem)}
                            </div>
                        );
                    }
                    return renderItem(group);
                })}
            </div>
        </div>
    );
}

export default ShelfRow;
