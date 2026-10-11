const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname)));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cert_tracker',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.get('/api/records', async (req, res) => {
    try {
        const recordsQuery = `
            SELECT 
                ec.record_id,
                e.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS name,
                d.department_name AS dept,
                l.location_name AS loc,
                cp.title AS cert,
                TO_CHAR(ec.expiry_date, 'YYYY-MM-DD') AS expiry,
                ec.compliance_status AS status
            FROM employee_certification ec
            JOIN employee e ON ec.employee_id = e.employee_id
            JOIN department d ON e.department_id = d.department_id
            JOIN location l ON d.location_id = l.location_id
            JOIN certification_program cp ON ec.certification_id = cp.certification_id
            ORDER BY ec.record_id ASC;
        `;
        const { rows: records } = await pool.query(recordsQuery);

        const statsQuery = `
            SELECT 
                COUNT(*) AS total,
                COUNT(CASE WHEN compliance_status = 'Valid' THEN 1 END) AS valid,
                COUNT(CASE WHEN compliance_status = 'Expiring Soon' THEN 1 END) AS warning,
                COUNT(CASE WHEN compliance_status = 'Expired' THEN 1 END) AS expired
            FROM employee_certification;
        `;
        const { rows: statsRows } = await pool.query(statsQuery);

        res.json({ records, stats: statsRows[0] });
    } catch (err) {
        console.error('Error fetching records:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/records', async (req, res) => {
    const { id, name, dept, loc, cert, expiry } = req.body;
    try {
        let locRes = await pool.query('SELECT location_id FROM location WHERE location_name = $1', [loc]);
        if (locRes.rows.length === 0) {
            locRes = await pool.query('INSERT INTO location (location_name, region) VALUES ($1, $2) RETURNING location_id', [loc, 'Telangana']);
        }
        const locId = locRes.rows[0].location_id;

        let deptRes = await pool.query('SELECT department_id FROM department WHERE department_name = $1', [dept]);
        if (deptRes.rows.length === 0) {
            deptRes = await pool.query('INSERT INTO department (department_name, location_id) VALUES ($1, $2) RETURNING department_id', [dept, locId]);
        }
        const deptId = deptRes.rows[0].department_id;

        let empRes = await pool.query('SELECT employee_id FROM employee WHERE employee_id = $1', [id]);
        if (empRes.rows.length === 0) {
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';
            const email = `${id.toLowerCase()}@company.com`;
            await pool.query(
                'INSERT INTO employee (employee_id, first_name, last_name, email, job_role, department_id) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, firstName, lastName, email, 'Engineer', deptId]
            );
        }

        let certRes = await pool.query('SELECT certification_id FROM certification_program WHERE title = $1', [cert]);
        if (certRes.rows.length === 0) {
            certRes = await pool.query(
                'INSERT INTO certification_program (title, description, validity_months, provider_id) VALUES ($1, $2, $3, $4) RETURNING certification_id',
                [cert, 'Professional Certification', 36, 1]
            );
        }
        const certId = certRes.rows[0].certification_id;

        await pool.query(
            'INSERT INTO employee_certification (employee_id, certification_id, issue_date, expiry_date) VALUES ($1, $2, CURRENT_DATE, $3)',
            [id, certId, expiry]
        );

        res.status(201).json({ success: true, message: 'Record saved to database!' });
    } catch (err) {
        console.error('Error inserting record:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/records/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM employee_certification WHERE record_id = $1', [req.params.id]);
        res.json({ success: true, message: 'Record deleted' });
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
