import './Skeleton.css';

export default function Skeleton({
    width,
    height = '20px',
    borderRadius = '4px',
    count = 1,
    className = ''
}) {
    const skeletons = Array.from({ length: count }, (_, i) => (
        <div
            key={i}
            className={`skeleton ${className}`}
            style={{
                width: width || '100%',
                height,
                borderRadius
            }}
        />
    ));

    return count > 1 ? <div className="skeleton-group">{skeletons}</div> : skeletons;
}
