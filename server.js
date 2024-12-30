import express from 'express';
import bodyParser from 'body-parser';
import db from './dbConnection.js';
import cors from 'cors';
const app = express();
const port = 3000;
// Middleware
app.use(bodyParser.json());
app.use(cors());
// API: Search
app.get('/search', async (req, res) => {
    try {
        const { query, page = 1, limit = 10, db_name, fields = 'first_name,last_name,work,hometown,location' } = req.body;
        if (!query) {
            return res.status(400).json({ message: 'Query parameter is required.' });
        }
        if (db_name && !/^[a-zA-Z0-9_]+$/.test(db_name)) {
            return res.status(400).json({ message: 'Invalid database name.' });
        }
        if (db_name) {
            const connection = await db.getConnection();
            await connection.query(`USE \`${db_name}\``);
            connection.release();
        }

        const offset = (page - 1) * limit;
        const fieldList = fields.split(',').map(field => field.trim()).join(', ');

        // Dynamically create the MATCH clause
        const matchQuery = `MATCH(${fieldList}) AGAINST(? IN NATURAL LANGUAGE MODE)`;

        // Search across specified fields
        const [results] = await db.execute(
            `SELECT id, FBID, Phone, first_name, last_name, gender, work, hometown, location
             FROM user_data
             WHERE ${matchQuery}
             LIMIT ? OFFSET ?`,
            [query, parseInt(limit), parseInt(offset)]
        );

        // Get total count for pagination
        const [totalCountResults] = await db.execute(
            `SELECT COUNT(*) AS total FROM user_data
             WHERE ${matchQuery}`,
            [query]
        );

        const totalResults = totalCountResults[0].total;

        res.json({
            currentPage: parseInt(page),
            totalResults,
            totalPages: Math.ceil(totalResults / limit),
            results,
        });
    } catch (error) {
        console.error('Error in /search:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
