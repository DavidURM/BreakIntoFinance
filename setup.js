const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Terminal Input Setup
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Questions to ask
const questions = [
    { key: 'PORT', question: 'Enter port number (default 3000): ', default: '3000' },
    { key: 'DATABASE_NAME', question: 'Enter database name: ', default: 'breakintofinance' },
    { key: 'DATABASE_HOST', question: 'Enter database host: ', default: '127.0.0.1' },
    { key: 'DATABASE_USER', question: 'Enter database user: ', default: 'root' },
    { key: 'DATABASE_PASSWORD', question: 'Enter database password: ', default: 'SugiPulaUai123' }, // Sensitive input
    { key: 'EMAIL_USER', question: 'Enter email user: ', default: 'd206355868cc5f' },
    { key: 'EMAIL_PASS', question: 'Enter email password: ', default: 'b30b3e54143bac' },
    { key: 'EMAIL_HOST', question: 'Enter email host: ', default: 'sandbox.smtp.mailtrap.io' },
    { key: 'EMAIL_PORT', question: 'Enter email port: ', default: '2525' }

];

// Store answers
const answers = {};

const askQuestion = (index) => {
    if (index === questions.length) {
        // Save environment variables to file
        const envContent = Object.entries(answers)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        fs.writeFileSync(path.join(__dirname, 'sensitive.env'), envContent);
        console.log(' Configuration saved to `sensitive.env`');
        rl.close();
        return;
    }

    const { key, question, default: defaultValue } = questions[index];

    rl.question(question, (answer) => {
        answers[key] = answer.trim() || defaultValue;
        askQuestion(index + 1);
    });
};

// Start asking questions
askQuestion(0);
