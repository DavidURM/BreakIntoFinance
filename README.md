# BreakIntoFinance (Secure Version) - Computer Security Group 42

## How to Run

1. Setup the `database.sql` file in a DBMS.
2. Connect the database through `Sensitive.env`.
3. Go to [mailtrap.io](https://mailtrap.io/) (a closed environment mailing simulator service) and create an account.
4. Take the `HOST`, `PORT`, `EMAIL USER`, and `EMAIL PASSWORD` from Mailtrap and put them in the `Sensitive.env` file.
5. Ensure that Node.js is installed and that the following packages are included:

```json
"dependencies": {
  "dotenv": "^16.4.7",
  "ejs": "^3.1.10",
  "express": "^4.21.2",
  "express-session": "^1.18.1",
  "mysql": "^2.18.1"
},
"devDependencies": {
  "nodemon": "^3.1.9"
}
```

6. Ensure the terminal is in the project folder and run the server on localhost using:
   ```sh
   node server.js
   ```

## List of Vulnerabilities

### A01: Broken Access Control
- Issue: `admin.html` is freely accessible.
- **TODO:** Implement authentication for admin access and update the database to enforce access control.

### A02: Cryptographic Failures
- Issue: Plaintext storage of passwords.
- **TODO:** Implement password hashing in the database.

### A03: Injection
- Issue: No prepared statements, vulnerable to SQL injection due to concatenated statements.
- **TODO:** Use prepared statements and sanitize inputs.

### A04: Insecure Design
- Issue: No API rate limiting.
- **TODO:** Implement an API rate limiter to prevent DoS attacks.

### A05: Security Misconfiguration
- Issue: `/download?file=?Sensitive.env` exposes sensitive environment variables.
- **TODO:** Secure file request commands to prevent unauthorized access.

### A07: Identification & Authentication Failures
- Issues:
    - Users can reset passwords for other accounts.
    - Users can access `admin.html` without admin permissions.
- **TODO:** Implement proper authentication checks and user verification before allowing access or password resets.