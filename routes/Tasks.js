const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {

    // GET all tasks by company code
    router.get('/company/:CompanyCode', async (req, res) => {
        const { CompanyCode } = req.params;

        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                    SELECT 
                        t.*, 
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.CompanyCode = @CompanyCode
                    ORDER BY t.DatePosted DESC
                `);
            
            const resultCompleted = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                    SELECT 
                        t.*, 
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.CompanyCode = @CompanyCode and t.status = 'Completed'
                    ORDER BY t.DatePosted DESC
                `);

            const resultPending = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                    SELECT 
                        t.*, 
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.CompanyCode = @CompanyCode and t.status != 'Completed'
                    ORDER BY t.DatePosted DESC
                `);

            res.json({ 
                success: true, 
                data: result.recordset, 
                dataCompleted: resultCompleted.recordset,
                dataPending: resultPending.recordset
            });
        } catch (error) {
            console.error('Error fetching tasks by CompanyCode:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
        }
    });

    // GET task by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.request()
                .input('id', sql.NVarChar, id)
                .query(`
                    SELECT 
                        t.*, 
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.id = @id
                    ORDER BY t.DatePosted DESC
                `);
            
            const taskCount = await pool.request()
                .input('id', sql.NVarChar, id)
                .query(`
                    SELECT COUNT(*) AS totalTasks
                    FROM Tasks
                    WHERE memberid = @id
                `);

            

            res.json({ success: true, data: result.recordset, totalTasks: taskCount.recordset[0].totalTasks });
        } catch (error) {
            console.error('Error fetching tasks by ID:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
        }
    });

    // GET task by member ID
    router.get('/member/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT 
                        t.*, 
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.memberid = @id
                    ORDER BY t.DatePosted DESC
                `);
            const pendingTasks = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT 
                        t.*, 
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.memberid = @id and t.status = 'Unfinish'
                    ORDER BY t.DatePosted DESC
                `);

            const forApprovalTasks = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT
                        t.*,
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.memberid = @id and t.status = 'Pending'
                    ORDER BY t.DatePosted DESC
                `);
            
            const taskHistory = await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    SELECT
                        t.*,
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Tasks t
                    LEFT JOIN Users u ON t.memberid = u.id
                    WHERE t.memberid = @id AND t.status IN ('Completed', 'Failed')
                    ORDER BY t.DatePosted DESC
                `);                
            res.json({ 
                success: true, 
                data: result.recordset, 
                pending: pendingTasks.recordset,
                forApproval: forApprovalTasks.recordset,
                taskHistory: taskHistory.recordset,

            });
        } catch (error) {
            console.error('Error fetching tasks by ID:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
        }
    });

    // PUT update task by ID
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { Title, Instructions, Deadline } = req.body;

            await pool.request()
                .input('id', sql.Int, id)
                .input('Title', sql.NVarChar, Title)
                .input('Instructions', sql.NVarChar, Instructions)
                .input('Deadline', sql.DateTime, Deadline)
                .query(`
                    UPDATE Tasks
                    SET Title = @Title,
                        Instructions = @Instructions,
                        Deadline = @Deadline
                    WHERE id = @id
                `);
            
            
            res.json({ success: true, message: 'Task updated successfully' });
        } catch (error) {
            console.error('=== UPDATE TASK ERROR ===', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update task', 
                details: error.message 
            });
        }
    });

    // DELETE task by ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Tasks WHERE id = @id');

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ success: false, error: 'Task not found' });
            }

            res.json({ success: true, message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error deleting task:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete task', 
                details: error.message 
            });
        }
    });

    // POST create task
    router.post('/', async (req, res) => {
        try {
            const {
                title,
                description,
                dueDate,
                memberid,
                CompanyCode,
            } = req.body;

            if (!title || !description || !memberid || !CompanyCode) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'All fields are required' 
                });
            }

            const result = await pool.request()
                .input('Title', sql.NVarChar, title)
                .input('Instructions', sql.NVarChar, description)
                .input('memberid', sql.Int, memberid)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('Deadline', sql.DateTime, dueDate)
                .query(`
                    INSERT INTO Tasks 
                    (Title, Instructions, DatePosted, Deadline, memberid, CompanyCode, status)
                    VALUES (@Title, @Instructions, GETDATE(), @Deadline, @memberid, @CompanyCode, 'Unfinish');
                `);


            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: { title, description, memberid, CompanyCode }
            });

        } catch (error) {
            console.error('=== CREATE TASK ERROR ===');
            console.error('Message:', error.message);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to create task', 
                details: error.message 
            });
        }
    });

    // POST review task
    router.post('/review/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { review, status } = req.body;

            await pool.request()
                .input('id', sql.Int, id)
                .input('review', sql.NVarChar, review)
                .input('status', sql.NVarChar, status)
                .query(`
                    UPDATE Tasks
                    SET review = @review,
                        status = @status
                    WHERE id = @id
                `);

            res.json({ success: true, message: 'Task reviewed successfully' });

        } catch (error) {
            console.error('=== REVIEW TASK ERROR ===', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to review task', 
                details: error.message 
            });
        }
    });

    return router;
};
