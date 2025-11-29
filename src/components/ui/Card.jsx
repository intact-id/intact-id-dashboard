import './Card.css';

export default function Card({ children, className = '', variant = 'default', noPadding = false }) {
    return (
        <div className={`card card--${variant} ${noPadding ? 'card--no-padding' : ''} ${className}`}>
            {children}
        </div>
    );
}
