function ShelfDecoration({ name }) {
    return (
        <img className="year-shelf-object" src={'/shelf/' + name + '.webp'} alt="" />
    );
}

export default ShelfDecoration;
