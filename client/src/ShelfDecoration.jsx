function ShelfDecoration({ name }) {
    return (
        <img className="year-shelf-object" src={'/shelf/' + name + '.webp'} alt="" draggable="false" />
    );
}

export default ShelfDecoration;
