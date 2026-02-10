import './Badge.css';

export default function Badge({ children, variant = 'default', size = 'md', dot = false }) {
    return (
        <span className={`badge badge--${variant} badge--${size} ${dot ? 'badge--with-dot' : ''}`}>
            {dot && <span className="badge-dot" />}
            {children}
        </span>
    );
}
