const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {

    // POST clock in
    router.post('/clockin', async (req, res) => {
    const { employeeId } = req.body;
    const companyCode = req.session.user?.CompanyCode;

        try {
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            const poolRequest = pool.request();
            poolRequest.input('EmployeeId', employeeId);
            poolRequest.input('Today', today);
            poolRequest.input('CompanyCode', companyCode);

            // Insert today's attendance if nonexistent
            await poolRequest.query(`
                IF NOT EXISTS (
                    SELECT 1 
                    FROM Attendance 
                    WHERE memberid = @EmployeeId
                    AND date = @Today
                )
                BEGIN
                    INSERT INTO Attendance (memberid, date, status, CompanyCode)
                    VALUES (@EmployeeId, @Today, null, @CompanyCode)
                END
            `);

            // Check status before updating
            const result = await poolRequest.query(`
                SELECT status
                FROM Attendance
                WHERE memberid = @EmployeeId
                AND date = @Today
            `);

            const currentStatus = result.recordset[0]?.status;

            if (currentStatus !== null) {
                return res.status(400).json({ message: 'Already clocked in today.' });
            }

            // Proceed with clock-in
            await poolRequest.query(`
                UPDATE Attendance
                SET timeIn = GETDATE()
                WHERE memberid = @EmployeeId
                AND date = @Today
            `);

            res.json({ message: 'Clock-in recorded successfully.' });

        } catch (err) {
            console.error(err);
            res.status(400).json({ message: err.message });
        }
    });


    // GET Attendance by CompanyCode
    router.get('/company/:CompanyCode', async (req, res) => {
        const { CompanyCode } = req.params;

        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                    SELECT 
                        a.*,
                        u.FirstName + ' ' + u.LastName AS memberName
                    FROM Attendance a
                    LEFT JOIN Users u ON a.memberid = u.id
                    WHERE a.CompanyCode = @CompanyCode
                    ORDER BY a.date DESC
                `);

            // Convert timeIn/timeOut to HH:MM:SS
            const data = result.recordset

            res.json({ success: true, data });

        } catch (error) {
            console.error('Error fetching attendance by CompanyCode:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
        }
    });

    router.post('/autofill/:memberId', async (req, res) => {
        const { memberId } = req.params;

        if (!memberId) {
            return res.status(400).json({ success: false, message: "memberId is required" });
        }

        try {
            const request = pool.request();
            request.input("memberId", sql.Int, memberId);

            await request.execute("AutoInsertAbsentAttendance");

            return res.json({
                success: true,
                message: "Absent logs auto-filled (if needed)."
            });

        } catch (err) {
            console.error("Error running stored procedure:", err);
            return res.status(500).json({ success: false, error: err });
        }
    });

    return router;
};
