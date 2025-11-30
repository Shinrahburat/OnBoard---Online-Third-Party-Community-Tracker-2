const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {       
    
    // GET user performance by ID
    router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT 
                    up.*,
                    u.FirstName + ' ' + u.LastName AS memberName
                FROM user_performance up
                LEFT JOIN Users u ON up.member_id = u.id
                WHERE u.id = @id
            `);

        // Check if user_performance record exists
        if (!result.recordset || result.recordset.length === 0) {
            console.log('No user performance found for id:', id);
            return res.json({ 
                success: true, 
                data: null, 
                outputRate: { totalTasks: 0, completedTasks: 0, averageRating: null } 
            });
        }

        // Get the memberid from the user_performance record
        const memberId = result.recordset[0].member_id;
        console.log('Member ID:', memberId);

        // Check if memberId exists
        if (!memberId) {
            console.log('No memberid found in user_performance');
            return res.json({ 
                success: true, 
                data: result.recordset[0], 
                outputRate: { totalTasks: 0, completedTasks: 0, averageRating: null } 
            });
        }

        const outputRate = await pool.request()
            .input('memberId', sql.Int, memberId)
            .query(`
                SELECT
                    SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completedTasks,
                    AVG(CAST(up.rating AS FLOAT)) AS averageRating
                FROM user_performance up join Tasks t on up.member_id = t.memberid
                WHERE up.member_id = @memberId
            `);
        
        const totalTask = await pool.request()
            .input('memberId', sql.Int, memberId)
            .query('select count(*) from Tasks t join Users u on t.memberid = u.id where u.id = @memberId')

        console.log('Output rate result:', outputRate.recordset[0]);

        res.json({ 
            success: true, 
            data: result.recordset[0], 
            outputRate: outputRate.recordset[0],
            totalTask: totalTask.recordset[0]
        });
    } catch (error) {
        console.error('Error fetching user performance by ID:', error);
        console.error('Error details:', {
            message: error.message,
            number: error.number,
            lineNumber: error.lineNumber,
            state: error.state
        });
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch user performance',
            details: error.message 
        });
    }
});

    // POST create new user performance
    router.post('/', async (req, res) => {
        try {
            const { memberid, task_completed, rating, remarks } = req.body;
            await pool.request()
                .input('memberid', sql.Int, memberid)
                .input('task_completed', sql.Int, task_completed)
                .input('rating', sql.Int, rating)
                .input('remarks', sql.NVarChar, remarks)
                .query(`
                    INSERT INTO user_performance (member_id, task_completed, rating, remarks)
                    VALUES (@memberid, @task_completed, @rating, @remarks)

                    update Tasks set status = 'Completed' where Outputid = @task_completed
                `);
            res.json({ success: true, message: 'User performance created successfully' });
        }
        catch (error) {
            console.error('Error creating user performance:', error);
            res.status(500).json({ success: false, error: 'Failed to create user performance' });
        }
    });

    // GET by taskid
    router.get('/task/:taskid', async (req, res) => {
        const { taskid } = req.params;
        try {
            const result = await pool.request()
                .input('taskid', sql.Int, taskid)
                .query(`
                    SELECT 
                        up.*,
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM user_performance up
                    LEFT JOIN Users u ON up.member_id = u.id
                    WHERE up.task_completed = @taskid
                `); 
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            console.error('Error fetching user performance by task ID:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch user performance' });
        }
    });
    
    return router;
};
