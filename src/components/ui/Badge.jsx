export default function Badge({ children, kind = 'neutral', dot = true }) {
    return (
        <span className={`badge badge--${kind}`}>
            {dot && <span className="badge-dot" />}
            {children}
        </span>
    );
}
