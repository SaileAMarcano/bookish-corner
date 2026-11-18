const LAMPS = new Set(['moon']);

function ShelfDecoration({ name }) {
    const image = <img className="year-shelf-object" src={'/shelf/' + name + '.webp'} alt="" draggable="false" />;

    if (!LAMPS.has(name)) return image;

    return (
        <span className="year-shelf-lamp">
            <span className="year-shelf-lamp-glow" aria-hidden="true" />
            {image}
        </span>
    );
}

export default ShelfDecoration;
