function ShelfLighting({ warm = true, strings = true, intensity = 72 }) {
    return (
        <div className="shelf-lighting" aria-hidden="true" style={{ '--shelf-warmth': warm ? intensity / 100 : 0 }}>
            <span className="shelf-light-wash" />
            {strings && <div className="shelf-garland" data-lit={warm}>
                <span className="shelf-light-wire" />
                {Array.from({ length: 12 }, (_, index) => {
                    const x = (index + 0.5) / 12;
                    const y = -5 + 50 * Math.sqrt(1 - (2 * (x + 0.04) / 1.08 - 1) ** 2);
                    return <span className="shelf-light-bulb" key={index} style={{ left: `${x * 100}%`, top: `${y}%` }} />;
                })}
            </div>}
        </div>
    );
}

export default ShelfLighting;
