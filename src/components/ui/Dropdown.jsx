import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './Dropdown.css';

export default function Dropdown({
    options = [],
    value,
    onChange,
    placeholder = 'Select an option',
    disabled = false,
    label,
    error
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className="dropdown-wrapper">
            {label && <label className="dropdown-label">{label}</label>}
            <div
                ref={dropdownRef}
                className={`dropdown ${isOpen ? 'dropdown--open' : ''} ${disabled ? 'dropdown--disabled' : ''} ${error ? 'dropdown--error' : ''}`}
            >
                <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <span className="dropdown-value">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`dropdown-chevron ${isOpen ? 'dropdown-chevron--open' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="dropdown-menu">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`dropdown-option ${value === option.value ? 'dropdown-option--selected' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                <span>{option.label}</span>
                                {value === option.value && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {error && <span className="dropdown-error">{error}</span>}
        </div>
    );
}
