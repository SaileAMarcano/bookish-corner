const LIGHTS = new Set(['moon', 'candle']);

function ShelfDecoration({ name }) {
    const image = <img className="year-shelf-object" src={'/shelf/' + name + '.webp'} alt="" draggable="false" />;

    if (!LIGHTS.has(name)) return image;

    return (
        <span className={`year-shelf-lamp year-shelf-lamp-${name}`}>
            <span className={`year-shelf-light year-shelf-light-${name}`} aria-hidden="true" />
            {image}
        </span>
    );
}

export default ShelfDecoration;
