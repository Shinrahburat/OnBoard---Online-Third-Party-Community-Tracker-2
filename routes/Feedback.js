const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {

    // GET all feedback by company
    router.get('/company/:CompanyCode', async (req, res) => {
        const { CompanyCode } = req.params;

        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                    SELECT 
                        f.*,
                        u.FirstName + ' ' + u.LastName AS feedbackByName
                    FROM Feedback f
                    LEFT JOIN Users u ON f.feedbackBy = u.id
                    WHERE f.CompanyCode = @CompanyCode
                    ORDER BY f.dateSubmitted DESC
                `);

            res.json({ success: true, feedback: result.recordset });

        } catch (error) {
            console.error('Error fetching feedback:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
        }
    });

    // GET feedback by ID
    router.get('/:id', async (req, res) => {    
        try {
            const result = await pool.request()
                .input("id", sql.Int, req.params.id)
                .query(`SELECT 
                        f.*,
                        u.FirstName +' '+u.LastName as feedbacker
                        FROM Feedback f join Users u on f.feedbackBy = u.id
                        WHERE f.id=@id
                    `);
    
            if (result.recordset.length === 0)
                return res.json({ success: false, error: "Not found" });
    
            res.json({ success: true, data: result.recordset[0] });
    
        } catch (err) {
            console.error("Get single feedback error:", err);
            res.status(500).json({ success: false, error: "Server Error" });
        }
    });
    // GET feedback by member ID
    router.get('/member/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.request()
                .input("id", sql.Int, id)
                .query(`
                    SELECT 
                        f.*,
                        u.FirstName + ' ' + u.LastName AS feedbacker
                    FROM Feedback f
                    LEFT JOIN Users u ON f.feedbackBy = u.id
                    WHERE f.feedbackBy = @id
                `);
            res.json({ success: true, data: result.recordset });

        } catch (err) {
            console.error("Get single feedback error:", err);
            res.status(500).json({ success: false, error: "Server Error" });
        }
    });


    // POST submit feedback
    router.post('/', async (req, res) => {
        const { type, subject,message, feedbackBy, CompanyCode } = req.body;

        try {
            const result = await pool.request()
                .input('subject', sql.NVarChar, subject)
                .input('type', sql.NVarChar, type)
                .input('content', sql.NVarChar, message)
                .input('feedbackBy', sql.Int, feedbackBy)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                    INSERT INTO Feedback (status, subject, type, content, dateSubmitted, feedbackBy, CompanyCode)
                    VALUES ('Pending', @subject, @type, @content, GETDATE(), @feedbackBy, @CompanyCode)
                `);

            res.json({ success: true, message: 'Feedback submitted successfully' });

        } catch (error) {
            console.error('=== FEEDBACK SUBMIT ERROR ===', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit feedback',
                details: error.message
            });
        }
    });

    
    // PUT update feedback status by id
    router.put('/status/:id', async (req, res) => {
        const { status } = req.body;
    
        try {
            await pool.request()
                .input("id", sql.Int, req.params.id)
                .input("status", sql.NVarChar, status)
                .query(`UPDATE Feedback SET status=@status WHERE id=@id`);
    
            res.json({ success: true });
    
        } catch (err) {
            console.error("Update feedback status error:", err);
            res.status(500).json({ success: false, error: "Server Error" });
        }
    });

    return router;
};