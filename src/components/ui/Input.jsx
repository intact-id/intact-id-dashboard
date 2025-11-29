import './Input.css';

export default function Input({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error = '',
    className = ''
}) {
    return (
        <div className={`input-group ${className}`}>
            {label && (
                <label htmlFor={name} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={`input ${error ? 'input--error' : ''}`}
            />
            {error && <span className="input-error-message">{error}</span>}
        </div>
    );
}
