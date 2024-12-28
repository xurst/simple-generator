document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generate-button');
    const copyButton = document.getElementById('copy-button');
    const resetButton = document.getElementById('reset-button');
    const passwordOutput = document.getElementById('password-output');
    const passwordLength = document.getElementById('password-length');
    const includeUppercase = document.getElementById('include-uppercase');
    const includeLowercase = document.getElementById('include-lowercase');
    const includeNumbers = document.getElementById('include-numbers');
    const includeSymbols = document.getElementById('include-symbols');

    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    //test

    function loadSettings() {
        const savedLength = localStorage.getItem('passwordLength');
        if (savedLength) passwordLength.value = savedLength;

        const savedSettings = JSON.parse(localStorage.getItem('includeSettings')) || {};
        includeUppercase.checked = savedSettings.uppercase !== false;
        includeLowercase.checked = savedSettings.lowercase !== false;
        includeNumbers.checked = savedSettings.numbers !== false;
        includeSymbols.checked = savedSettings.symbols !== false;
    }

    function saveSettings() {
        localStorage.setItem('passwordLength', passwordLength.value);
        localStorage.setItem('includeSettings', JSON.stringify({
            uppercase: includeUppercase.checked,
            lowercase: includeLowercase.checked,
            numbers: includeNumbers.checked,
            symbols: includeSymbols.checked
        }));
    }

    function generatePassword() {
        let chars = '';
        if (includeUppercase.checked) chars += uppercaseChars;
        if (includeLowercase.checked) chars += lowercaseChars;
        if (includeNumbers.checked) chars += numberChars;
        if (includeSymbols.checked) chars += symbolChars;

        if (chars === '') {
            alert('Please select at least one character type.');
            return;
        }

        const length = Math.min(parseInt(passwordLength.value), 500);
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }

        passwordOutput.value = password;
        saveSettings();
    }

    function copyPassword() {
        passwordOutput.select();
        document.execCommand('copy');
    }

    function resetOutput() {
        passwordOutput.value = '';
    }

    passwordLength.addEventListener('input', function() {
        if (this.value > 500) {
            this.value = 500;
        }
        saveSettings();
    });

    generateButton.addEventListener('click', generatePassword);
    copyButton.addEventListener('click', copyPassword);
    resetButton.addEventListener('click', resetOutput);

    [includeUppercase, includeLowercase, includeNumbers, includeSymbols].forEach(checkbox => {
        checkbox.addEventListener('change', saveSettings);
    });

    loadSettings();
});